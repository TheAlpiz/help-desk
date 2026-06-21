import { Queue } from "bullmq";
import { and, eq, desc, inArray } from "drizzle-orm";
import { env } from "../../infra/env";
import { withSuperAdminTransaction, withTenantTransaction } from "../../infra/db";
import { notification } from "./notification.schema";
import { notificationPreference } from "./notification-preference.schema";
import { user } from "../user/user.schema";
import { ticket } from "../ticket/ticket.schema";
import { onEvent } from "../../infra/events";
import {
  NotificationChannel,
  NOTIFICATION_CHANNELS,
  CHANNEL_QUEUE,
  DEFAULT_CHANNELS,
} from "./notification.constants";

const redisConfig = {
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT),
  password: env.REDIS_PASSWORD || undefined,
};

// One queue per channel, built from the catalog. Future channels appear here
// automatically once listed in NOTIFICATION_CHANNELS.
const channelQueues: Record<NotificationChannel, Queue> = NOTIFICATION_CHANNELS.reduce(
  (acc, ch) => {
    acc[ch] = new Queue(CHANNEL_QUEUE[ch], { connection: redisConfig });
    return acc;
  },
  {} as Record<NotificationChannel, Queue>,
);

// Back-compat exports (other modules import these names).
export const inAppQueue = channelQueues.IN_APP;
export const emailQueue = channelQueues.EMAIL;

type NotificationMessage = { title: string; body: string; actionUrl: string };

export const NotificationService = {
  initListeners: () => {
    console.log("NotificationService: Initializing Event Listeners...");

    onEvent("ticket.created", async (p) => {
      // New tickets (portal/API/email) arrive unassigned. Notify the staff who can
      // pick them up: department members when the ticket is routed to a department,
      // otherwise every ticket-handling role in the org.
      const recipients = await NotificationService.resolveNewTicketRecipients(
        p.organizationId,
        p.ticketId,
      );
      for (const userId of recipients) {
        if (userId === p.actorId) continue; // skip the creator (no-op for "EMAIL")
        await NotificationService.dispatch("ticket.created", userId, p.organizationId, {
          title: "New ticket",
          body: `A new ticket was created: ${p.ticketId}`,
          actionUrl: `/tickets/${p.ticketId}`,
        });
      }
    });

    onEvent("ticket.assigned", async (p) => {
      if (p.assigneeId === p.actorId) return; // don't notify self-assignment
      await NotificationService.dispatch("ticket.assigned", p.assigneeId, p.organizationId, {
        title: "Ticket Assigned",
        body: `You have been assigned to ticket ${p.ticketId}`,
        actionUrl: `/tickets/${p.ticketId}`,
      });
    });

    onEvent("task.assigned", async (p) => {
      if (p.assigneeId === p.actorId) return;
      await NotificationService.dispatch("task.assigned", p.assigneeId, p.organizationId, {
        title: "Task Assigned",
        body: `You have been assigned to task ${p.taskId}`,
        actionUrl: `/tasks/${p.taskId}`,
      });
    });

    onEvent("sla.violation", async (p) => {
      const recipients = await NotificationService.resolveSlaRecipients(p.organizationId, p.ticketId);
      for (const userId of recipients) {
        await NotificationService.dispatch("sla.violation", userId, p.organizationId, {
          title: "SLA Breach",
          body: `Ticket ${p.ticketId} breached its ${p.breachType} SLA target`,
          actionUrl: `/tickets/${p.ticketId}`,
        });
      }
    });

    onEvent("comment.mention", async (p) => {
      if (p.mentionedUserId === p.actorId) return; // don't notify self-mention
      const base = p.entityType === "ticket" ? "tickets" : "tasks";
      await NotificationService.dispatch("comment.mention", p.mentionedUserId, p.organizationId, {
        title: "You were mentioned",
        body: `You were mentioned in ${p.entityType} ${p.entityId}`,
        actionUrl: `/${base}/${p.entityId}`,
      });
    });
  },

  /**
   * Fan a single notification out to every channel the target user has enabled
   * for this event type. Runs in a trusted (super-admin) context: it is invoked
   * from request handlers and background workers alike, before any tenant tx.
   */
  dispatch: async (
    eventType: string,
    targetUserId: string,
    organizationId: string,
    message: NotificationMessage,
  ) => {
    const prefs = await withSuperAdminTransaction(async (tx) =>
      tx
        .select()
        .from(notificationPreference)
        .where(eq(notificationPreference.userId, targetUserId)),
    );

    // Resolve the set of channels to use for this event.
    const channels = new Set<NotificationChannel>();
    if (prefs.length === 0) {
      DEFAULT_CHANNELS.forEach((ch) => channels.add(ch));
    } else {
      for (const pref of prefs) {
        const allowed = (pref.eventTypes as string[]) ?? [];
        if (allowed.includes(eventType) || allowed.includes("*")) {
          channels.add(pref.channel as NotificationChannel);
        }
      }
    }

    const payload = { userId: targetUserId, organizationId, type: eventType, ...message };
    for (const ch of Array.from(channels) as NotificationChannel[]) {
      const queue = channelQueues[ch];
      if (queue) await queue.add(`send_${ch.toLowerCase()}`, payload);
    }
  },

  // Staff to alert when a new ticket lands. Scoped to the ticket's department when
  // one is set; otherwise every ticket-handling role across the org.
  resolveNewTicketRecipients: async (organizationId: string, ticketId: string): Promise<string[]> => {
    return withSuperAdminTransaction(async (tx) => {
      const [t] = await tx
        .select({ departmentId: ticket.departmentId })
        .from(ticket)
        .where(eq(ticket.id, ticketId))
        .limit(1);

      const HANDLER_ROLES = ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"];

      const conditions = [
        eq(user.organizationId, organizationId),
        eq(user.status, "active"),
        inArray(user.globalRole, HANDLER_ROLES),
      ];
      // Department-routed tickets only ping that department's members.
      if (t?.departmentId) conditions.push(eq(user.departmentId, t.departmentId));

      const staff = await tx
        .select({ id: user.id })
        .from(user)
        .where(and(...conditions));

      return staff.map((s) => s.id);
    });
  },

  // SLA breach recipients: the assignee (if any) plus org admins/supervisors.
  resolveSlaRecipients: async (organizationId: string, ticketId: string): Promise<string[]> => {
    return withSuperAdminTransaction(async (tx) => {
      const ids = new Set<string>();

      const [t] = await tx
        .select({ assigneeId: ticket.assigneeId })
        .from(ticket)
        .where(eq(ticket.id, ticketId))
        .limit(1);
      if (t?.assigneeId) ids.add(t.assigneeId);

      const admins = await tx
        .select({ id: user.id })
        .from(user)
        .where(
          and(
            eq(user.organizationId, organizationId),
            inArray(user.globalRole, ["ADMIN", "SUPERVISOR", "SUPER_ADMIN"]),
          ),
        );
      admins.forEach((a) => ids.add(a.id));

      return Array.from(ids);
    });
  },

  // --- Route-backing methods (tenant-scoped; RLS enforced via parent user row) ---

  getForUser: async (tenantId: string, userId: string) => {
    return withTenantTransaction(tenantId, async (tx) =>
      tx
        .select()
        .from(notification)
        .where(eq(notification.userId, userId))
        .orderBy(desc(notification.createdAt))
        .limit(50),
    );
  },

  markRead: async (tenantId: string, userId: string, id: string, isRead: boolean) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const updated = await tx
        .update(notification)
        .set({ isRead })
        .where(and(eq(notification.id, id), eq(notification.userId, userId)))
        .returning();
      return updated[0];
    });
  },

  getPreferences: async (tenantId: string, userId: string) => {
    return withTenantTransaction(tenantId, async (tx) =>
      tx.select().from(notificationPreference).where(eq(notificationPreference.userId, userId)),
    );
  },

  upsertPreference: async (
    tenantId: string,
    userId: string,
    channel: string,
    eventTypes: string[],
  ) => {
    return withTenantTransaction(tenantId, async (tx) => {
      await tx
        .delete(notificationPreference)
        .where(
          and(eq(notificationPreference.userId, userId), eq(notificationPreference.channel, channel)),
        );
      const [pref] = await tx
        .insert(notificationPreference)
        .values({ userId, channel, eventTypes })
        .returning();
      return pref;
    });
  },

  togglePreference: async (
    tenantId: string,
    userId: string,
    channel: string,
    eventKey: string,
    enabled: boolean,
  ) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const [existing] = await tx
        .select()
        .from(notificationPreference)
        .where(and(eq(notificationPreference.userId, userId), eq(notificationPreference.channel, channel)))
        .limit(1);

      const currentTypes: string[] = (existing?.eventTypes as string[]) ?? [];
      const updated = enabled
        ? Array.from(new Set([...currentTypes, eventKey]))
        : currentTypes.filter((t) => t !== eventKey);

      if (existing) {
        const [pref] = await tx
          .update(notificationPreference)
          .set({ eventTypes: updated })
          .where(and(eq(notificationPreference.userId, userId), eq(notificationPreference.channel, channel)))
          .returning();
        return pref;
      }

      const [pref] = await tx
        .insert(notificationPreference)
        .values({ userId, channel, eventTypes: updated })
        .returning();
      return pref;
    });
  },
};
