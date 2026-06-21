import { eq, and, or, desc, isNotNull, inArray, count } from "drizzle-orm";
import { db } from "../../infra/db";
import { ticket, NewTicket } from "./ticket.schema";
import { ticketMessage, NewTicketMessage } from "./ticket-message.schema";
import { ticketLink } from "./ticket-link.schema";
import { ticketTag } from "./ticket-tag.schema";
import { contact } from "../contact/contact.schema";
import { auditLog } from "../audit-log/audit-log.schema";
import { withTenantTransaction } from "../../infra/db/index";
import { emailDeliveryQueue } from "../../workers/email-delivery.worker";
import { ticketVisibilityFilter, canViewTicket, TicketActor } from "../auth/abac.service";
import { emitEvent } from "../../infra/events";
import { parseMentions } from "../notification/notification.constants";
import { CreateTicketInput, UpdateTicketStatusInput } from "@help-desk/shared";

type AddMessageInput = {
  content: string;
  type: "PUBLIC_REPLY" | "INTERNAL_NOTE";
  emailMessageId?: string;
  contactId?: string;
};
import { SlaService } from "../sla/sla.service";

// Simple state machine definition for allowed transitions
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  "open": ["assigned", "resolved", "closed"],
  "assigned": ["in_progress", "waiting_customer", "resolved", "closed", "open"],
  "in_progress": ["waiting_customer", "resolved", "closed", "assigned"],
  "waiting_customer": ["in_progress", "resolved", "closed", "open"],
  "resolved": ["closed", "reopened"],
  "closed": ["reopened"],
  "reopened": ["assigned", "in_progress", "resolved", "closed"],
};

export const TicketService = {
  // `actor` enables ABAC row scoping. When omitted (trusted/internal callers) all
  // tenant tickets are returned; RLS still enforces tenant isolation either way.
  findAll: async (
    tenantId: string,
    actor?: TicketActor,
    opts?: { limit?: number; offset?: number; status?: string; priority?: string },
  ) => {
    const limit = opts?.limit ?? 25;
    const offset = opts?.offset ?? 0;

    return withTenantTransaction(tenantId, async (tx) => {
      const abac = actor ? ticketVisibilityFilter(actor) : undefined;
      const statusFilter = opts?.status ? eq(ticket.status, opts.status as any) : undefined;
      const priorityFilter = opts?.priority ? eq(ticket.priority, opts.priority as any) : undefined;
      const where = and(eq(ticket.organizationId, tenantId), abac, statusFilter, priorityFilter);

      const [rows, [{ total }]] = await Promise.all([
        tx.select().from(ticket).where(where).orderBy(desc(ticket.createdAt)).limit(limit).offset(offset),
        tx.select({ total: count() }).from(ticket).where(where),
      ]);

      return { data: rows, total: Number(total), limit, offset };
    });
  },

  findById: async (tenantId: string, ticketId: string, actor?: TicketActor) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const result = await tx
        .select()
        .from(ticket)
        .where(and(eq(ticket.id, ticketId), eq(ticket.organizationId, tenantId)))
        .limit(1);
      const t = result[0];
      if (t && actor && !canViewTicket(actor, t)) return undefined;
      return t;
    });
  },

  getMessages: async (tenantId: string, ticketId: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const t = await tx
        .select({ id: ticket.id })
        .from(ticket)
        .where(and(eq(ticket.id, ticketId), eq(ticket.organizationId, tenantId)))
        .limit(1);
      if (!t[0]) throw new Error("Ticket not found");
      return tx.select().from(ticketMessage).where(eq(ticketMessage.ticketId, ticketId));
    });
  },

  createTicket: async (tenantId: string, actorId: string, input: CreateTicketInput & { mailboxId?: string }) => {
    return await withTenantTransaction(tenantId, async (tx) => {
      if (!input.mailboxId) {
        // Resolve first available mailbox for this tenant
        const { mailbox: mailboxTable } = await import("../mailbox/mailbox.schema");
        const mb = await tx.select({ id: mailboxTable.id }).from(mailboxTable).where(eq(mailboxTable.organizationId, tenantId)).limit(1);
        if (!mb[0]) throw new Error("No mailbox configured for this organization");
        (input as any).mailboxId = mb[0].id;
      }

      // Create ticket
      const newTicketRes = await tx.insert(ticket).values({
        organizationId: tenantId,
        subject: input.subject,
        priority: input.priority,
        status: "open",
        requesterId: actorId,
        mailboxId: (input as any).mailboxId,
      }).returning();

      const createdTicket = newTicketRes[0];

      // Add initial message
      await tx.insert(ticketMessage).values({
        ticketId: createdTicket.id,
        senderId: actorId,
        content: input.initialMessage,
        type: "PUBLIC_REPLY"
      });

      // Audit Log
      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "ticket",
        entityId: createdTicket.id,
        actorId: actorId,
        action: "created",
        newValues: createdTicket
      });

      // Phase 9: Start SLA Clocks
      await SlaService.attachSlaToTicket(tx, createdTicket.id, tenantId, createdTicket.priority, createdTicket.departmentId || undefined);

      return createdTicket;
    }).then((t) => {
      emitEvent("ticket.created", { ticketId: t.id, actorId, organizationId: tenantId });
      return t;
    });
  },

  createTicketFromEmail: async (
    tenantId: string,
    contactId: string,
    input: { subject: string; initialMessage: string; priority: "low" | "medium" | "high" | "critical"; mailboxId: string; emailMessageId?: string }
  ) => {
    return await withTenantTransaction(tenantId, async (tx) => {
      const newTicketRes = await tx.insert(ticket).values({
        organizationId: tenantId,
        subject: input.subject,
        priority: input.priority,
        status: "open",
        contactId,
        mailboxId: input.mailboxId,
      }).returning();

      const createdTicket = newTicketRes[0];

      await tx.insert(ticketMessage).values({
        ticketId: createdTicket.id,
        contactId,
        content: input.initialMessage,
        type: "PUBLIC_REPLY",
        ...(input.emailMessageId ? { emailMessageId: input.emailMessageId } : {}),
      });

      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "ticket",
        entityId: createdTicket.id,
        actorId: "EMAIL",
        action: "created",
        newValues: { ...createdTicket, source: "email" },
      });

      await SlaService.attachSlaToTicket(tx, createdTicket.id, tenantId, createdTicket.priority, createdTicket.departmentId || undefined);

      return createdTicket;
    }).then((t) => {
      emitEvent("ticket.created", { ticketId: t.id, actorId: "EMAIL", organizationId: tenantId });
      return t;
    });
  },

  updateStatus: async (tenantId: string, ticketId: string, actorId: string, newStatus: string) => {
    return await withTenantTransaction(tenantId, async (tx) => {
      const current = await tx.select().from(ticket).where(and(eq(ticket.id, ticketId), eq(ticket.organizationId, tenantId))).limit(1);
      const t = current[0];
      if (!t) throw new Error("Ticket not found");

      const allowed = ALLOWED_TRANSITIONS[t.status as string] || [];
      if (!allowed.includes(newStatus)) {
        throw new Error(`Invalid status transition from ${t.status} to ${newStatus}`);
      }

      // Phase 8: Ticket Blocking Rule (Tasks)
      if (newStatus === "resolved" || newStatus === "closed") {
        // Query tasks linked to this ticket using raw sql query to avoid circular imports, or import task schema here
        // Wait, I need to import task schema. Let's do it safely.
        const res = await tx.execute(`SELECT id FROM "task" WHERE ticket_id = '${ticketId}' AND status NOT IN ('DONE', 'CANCELED') LIMIT 1`);
        if (res.rows.length > 0) {
          throw new Error("Cannot resolve or close ticket: There are incomplete tasks linked to this ticket.");
        }
      }

      const updated = await tx.update(ticket).set({ status: newStatus }).where(eq(ticket.id, ticketId)).returning();

      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "ticket",
        entityId: ticketId,
        actorId: actorId,
        action: "status_changed",
        oldValues: { status: t.status },
        newValues: { status: newStatus }
      });

      return updated[0];
    }).then((t) => {
      emitEvent("ticket.updated", { ticketId, actorId, organizationId: tenantId });
      return t;
    });
  },

  addMessage: async (tenantId: string, ticketId: string, actorId: string | null, input: AddMessageInput) => {
    let outgoing:
      | { mailboxId: string; to: string; subject: string; html: string; inReplyTo?: string; references?: string }
      | null = null;

    const result = await withTenantTransaction(tenantId, async (tx) => {
      const current = await tx.select().from(ticket).where(and(eq(ticket.id, ticketId), eq(ticket.organizationId, tenantId))).limit(1);
      if (!current[0]) throw new Error("Ticket not found");
      const t = current[0];

      const message = await tx.insert(ticketMessage).values({
        ticketId,
        ...(actorId ? { senderId: actorId } : {}),
        ...(input.contactId ? { contactId: input.contactId } : {}),
        content: input.content,
        type: input.type,
        ...(input.emailMessageId ? { emailMessageId: input.emailMessageId } : {}),
      }).returning();

      // Mark first response SLA met when an agent (user) replies
      if (input.type === "PUBLIC_REPLY" && actorId && t.requesterId !== actorId && !t.firstResponseMet) {
        await SlaService.markFirstResponseMet(tx, ticketId);
      }

      // Agent public reply → send email out to the contact via SMTP.
      // Skip internal notes and inbound contact replies (actorId is null for those).
      if (input.type === "PUBLIC_REPLY" && actorId && t.contactId) {
        const contactRow = await tx
          .select({ email: contact.email })
          .from(contact)
          .where(eq(contact.id, t.contactId))
          .limit(1);

        if (contactRow[0]?.email) {
          // Thread against the contact's most recent inbound message-id.
          const lastInbound = await tx
            .select({ emailMessageId: ticketMessage.emailMessageId })
            .from(ticketMessage)
            .where(and(eq(ticketMessage.ticketId, ticketId), isNotNull(ticketMessage.emailMessageId)))
            .orderBy(desc(ticketMessage.createdAt))
            .limit(1);

          const threadId = lastInbound[0]?.emailMessageId ?? undefined;
          outgoing = {
            mailboxId: t.mailboxId,
            to: contactRow[0].email,
            subject: t.subject,
            html: input.content,
            inReplyTo: threadId,
            references: threadId,
          };
        }
      }

      return message[0];
    });

    const job = outgoing as
      | { mailboxId: string; to: string; subject: string; html: string; inReplyTo?: string; references?: string }
      | null;
    if (job) {
      await emailDeliveryQueue
        .add("send-reply", { ...job, ticketId })
        .catch((err) => console.error(`Failed to enqueue email for ticket ${ticketId}:`, err));
    }

    // @mention notifications (emit post-commit so a rollback sends nothing).
    for (const mentionedUserId of parseMentions(input.content)) {
      emitEvent("comment.mention", {
        entityType: "ticket",
        entityId: ticketId,
        mentionedUserId,
        actorId,
        organizationId: tenantId,
      });
    }

    if (input.type === "PUBLIC_REPLY") {
      emitEvent("ticket.reply", { ticketId, actorId, organizationId: tenantId });
    }

    return result;
  },

  assignTicket: async (tenantId: string, ticketId: string, actorId: string, assigneeId: string) => {
    return await withTenantTransaction(tenantId, async (tx) => {
      const current = await tx.select().from(ticket).where(and(eq(ticket.id, ticketId), eq(ticket.organizationId, tenantId))).limit(1);
      if (!current[0]) throw new Error("Ticket not found");

      // Force status to assigned if currently open
      let newStatus = current[0].status;
      if (newStatus === "open") newStatus = "assigned";

      const updated = await tx.update(ticket).set({ assigneeId, status: newStatus }).where(eq(ticket.id, ticketId)).returning();

      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "ticket",
        entityId: ticketId,
        actorId: actorId,
        action: "assigned",
        oldValues: { assigneeId: current[0].assigneeId, status: current[0].status },
        newValues: { assigneeId, status: newStatus }
      });

      return updated[0];
    }).then((t) => {
      emitEvent("ticket.assigned", { ticketId, assigneeId, actorId, organizationId: tenantId });
      emitEvent("ticket.updated", { ticketId, actorId, organizationId: tenantId });
      return t;
    });
  },

  updatePriority: async (tenantId: string, ticketId: string, actorId: string, newPriority: "low" | "medium" | "high" | "critical") => {
    return await withTenantTransaction(tenantId, async (tx) => {
      const current = await tx.select().from(ticket).where(and(eq(ticket.id, ticketId), eq(ticket.organizationId, tenantId))).limit(1);
      if (!current[0]) throw new Error("Ticket not found");

      const updated = await tx.update(ticket).set({ priority: newPriority }).where(eq(ticket.id, ticketId)).returning();

      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "ticket",
        entityId: ticketId,
        actorId: actorId,
        action: "priority_changed",
        oldValues: { priority: current[0].priority },
        newValues: { priority: newPriority }
      });

      return updated[0];
    });
  },

  mergeTickets: async (tenantId: string, sourceId: string, targetId: string, actorId: string) => {
     return await withTenantTransaction(tenantId, async (tx) => {
       // Close source ticket
       await tx.update(ticket).set({ status: "closed" }).where(eq(ticket.id, sourceId));
       
       // Create Link
       const link = await tx.insert(ticketLink).values({
         sourceTicketId: sourceId,
         targetTicketId: targetId,
         linkType: "MERGED_INTO"
       }).returning();

       await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "ticket",
        entityId: sourceId,
        actorId: actorId,
        action: "merged",
        newValues: { mergedInto: targetId }
      });

       return link[0];
     });
  },

  reopenTicket: async (tenantId: string, ticketId: string, actorId: string) => {
    return await withTenantTransaction(tenantId, async (tx) => {
      const current = await tx.select().from(ticket).where(and(eq(ticket.id, ticketId), eq(ticket.organizationId, tenantId))).limit(1);
      const t = current[0];
      if (!t) throw new Error("Ticket not found");

      if (t.status !== "resolved" && t.status !== "closed") {
        throw new Error(`Only resolved or closed tickets can be reopened (current: ${t.status})`);
      }

      const updated = await tx
        .update(ticket)
        .set({ status: "reopened", resolvedAt: null, resolutionBreached: false })
        .where(eq(ticket.id, ticketId))
        .returning();

      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "ticket",
        entityId: ticketId,
        actorId,
        action: "reopened",
        oldValues: { status: t.status },
        newValues: { status: "reopened" },
      });

      return updated[0];
    });
  },

  updateTicket: async (
    tenantId: string,
    ticketId: string,
    actorId: string,
    input: { subject?: string; departmentId?: string | null }
  ) => {
    return await withTenantTransaction(tenantId, async (tx) => {
      const current = await tx.select().from(ticket).where(and(eq(ticket.id, ticketId), eq(ticket.organizationId, tenantId))).limit(1);
      const t = current[0];
      if (!t) throw new Error("Ticket not found");

      const patch: Record<string, unknown> = {};
      if (input.subject !== undefined) patch.subject = input.subject;
      if (input.departmentId !== undefined) patch.departmentId = input.departmentId;

      const updated = await tx.update(ticket).set(patch).where(eq(ticket.id, ticketId)).returning();

      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "ticket",
        entityId: ticketId,
        actorId,
        action: "updated",
        oldValues: { subject: t.subject, departmentId: t.departmentId },
        newValues: patch,
      });

      return updated[0];
    }).then((t) => {
      emitEvent("ticket.updated", { ticketId, actorId, organizationId: tenantId });
      return t;
    });
  },

  getHistory: async (tenantId: string, ticketId: string) => {
    return await withTenantTransaction(tenantId, async (tx) => {
      const t = await tx
        .select({ id: ticket.id })
        .from(ticket)
        .where(and(eq(ticket.id, ticketId), eq(ticket.organizationId, tenantId)))
        .limit(1);
      if (!t[0]) throw new Error("Ticket not found");

      return tx
        .select()
        .from(auditLog)
        .where(and(eq(auditLog.entityType, "ticket"), eq(auditLog.entityId, ticketId)))
        .orderBy(desc(auditLog.createdAt));
    });
  },

  linkTickets: async (
    tenantId: string,
    sourceId: string,
    targetId: string,
    linkType: string,
    actorId: string
  ) => {
    if (sourceId === targetId) throw new Error("Cannot link a ticket to itself");

    return await withTenantTransaction(tenantId, async (tx) => {
      // Both tickets must belong to this tenant (RLS already scopes, but verify existence)
      const found = await tx
        .select({ id: ticket.id })
        .from(ticket)
        .where(and(eq(ticket.organizationId, tenantId), inArray(ticket.id, [sourceId, targetId])));
      if (found.length < 2) throw new Error("Both tickets must exist in this organization");

      const link = await tx
        .insert(ticketLink)
        .values({ sourceTicketId: sourceId, targetTicketId: targetId, linkType })
        .returning();

      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "ticket",
        entityId: sourceId,
        actorId,
        action: "linked",
        newValues: { targetTicketId: targetId, linkType },
      });

      return link[0];
    });
  },

  getLinks: async (tenantId: string, ticketId: string) => {
    return await withTenantTransaction(tenantId, async (tx) => {
      const t = await tx
        .select({ id: ticket.id })
        .from(ticket)
        .where(and(eq(ticket.id, ticketId), eq(ticket.organizationId, tenantId)))
        .limit(1);
      if (!t[0]) throw new Error("Ticket not found");

      return tx
        .select()
        .from(ticketLink)
        .where(or(eq(ticketLink.sourceTicketId, ticketId), eq(ticketLink.targetTicketId, ticketId)));
    });
  },

  getTags: async (tenantId: string, ticketId: string) => {
    return await withTenantTransaction(tenantId, async (tx) => {
      const t = await tx
        .select({ id: ticket.id })
        .from(ticket)
        .where(and(eq(ticket.id, ticketId), eq(ticket.organizationId, tenantId)))
        .limit(1);
      if (!t[0]) throw new Error("Ticket not found");

      return tx.select().from(ticketTag).where(eq(ticketTag.ticketId, ticketId));
    });
  },

  addTag: async (tenantId: string, ticketId: string, name: string, actorId: string) => {
    return await withTenantTransaction(tenantId, async (tx) => {
      const t = await tx
        .select({ id: ticket.id })
        .from(ticket)
        .where(and(eq(ticket.id, ticketId), eq(ticket.organizationId, tenantId)))
        .limit(1);
      if (!t[0]) throw new Error("Ticket not found");

      // Dedupe: tag name already present on this ticket
      const existing = await tx
        .select({ id: ticketTag.id })
        .from(ticketTag)
        .where(and(eq(ticketTag.ticketId, ticketId), eq(ticketTag.name, name)))
        .limit(1);
      if (existing[0]) return existing[0];

      const tag = await tx.insert(ticketTag).values({ ticketId, name }).returning();

      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "ticket",
        entityId: ticketId,
        actorId,
        action: "tag_added",
        newValues: { tag: name },
      });

      return tag[0];
    }).then((tag) => {
      emitEvent("ticket.tag_added", { ticketId, tag: name, actorId, organizationId: tenantId });
      return tag;
    });
  },

  removeTag: async (tenantId: string, ticketId: string, tagId: string, actorId: string) => {
    return await withTenantTransaction(tenantId, async (tx) => {
      const t = await tx
        .select({ id: ticket.id })
        .from(ticket)
        .where(and(eq(ticket.id, ticketId), eq(ticket.organizationId, tenantId)))
        .limit(1);
      if (!t[0]) throw new Error("Ticket not found");

      const removed = await tx
        .delete(ticketTag)
        .where(and(eq(ticketTag.id, tagId), eq(ticketTag.ticketId, ticketId)))
        .returning();
      if (!removed[0]) throw new Error("Tag not found");

      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "ticket",
        entityId: ticketId,
        actorId,
        action: "tag_removed",
        oldValues: { tag: removed[0].name },
      });

      return removed[0];
    });
  },

  addCc: async (tenantId: string, ticketId: string, email: string, actorId: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const [t] = await tx.select().from(ticket).where(and(eq(ticket.id, ticketId), eq(ticket.organizationId, tenantId))).limit(1);
      if (!t) throw new Error("Ticket not found");
      const current: string[] = (t.ccEmails as string[]) ?? [];
      if (current.includes(email)) return t;
      const updated = [...current, email];
      const [row] = await tx.update(ticket).set({ ccEmails: updated }).where(eq(ticket.id, ticketId)).returning();
      await tx.insert(auditLog).values({ organizationId: tenantId, entityType: "ticket", entityId: ticketId, actorId, action: "cc_added", newValues: { email } });
      return row;
    });
  },

  removeCc: async (tenantId: string, ticketId: string, email: string, actorId: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const [t] = await tx.select().from(ticket).where(and(eq(ticket.id, ticketId), eq(ticket.organizationId, tenantId))).limit(1);
      if (!t) throw new Error("Ticket not found");
      const updated = ((t.ccEmails as string[]) ?? []).filter((e) => e !== email);
      const [row] = await tx.update(ticket).set({ ccEmails: updated }).where(eq(ticket.id, ticketId)).returning();
      await tx.insert(auditLog).values({ organizationId: tenantId, entityType: "ticket", entityId: ticketId, actorId, action: "cc_removed", oldValues: { email } });
      return row;
    });
  },
};
