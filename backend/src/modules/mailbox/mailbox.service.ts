import { eq, and } from "drizzle-orm";
import { withTenantTransaction } from "../../infra/db";
import { mailbox, NewMailbox, Mailbox } from "./mailbox.schema";
import { auditLog } from "../audit-log/audit-log.schema";
import { MailboxManager } from "../../workers/mailbox.manager";

// Strip credentials before storing in audit log.
const omitCredentials = (m: Mailbox) => {
  const { imapPasswordEncrypted: _imap, smtpPasswordEncrypted: _smtp, ...safe } = m;
  return safe;
};

export const MailboxService = {
  findAll: async (tenantId: string) => {
    return withTenantTransaction(tenantId, async (tx) =>
      tx.select().from(mailbox).where(eq(mailbox.organizationId, tenantId)),
    );
  },

  findById: async (tenantId: string, id: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(mailbox)
        .where(and(eq(mailbox.id, id), eq(mailbox.organizationId, tenantId)))
        .limit(1);
      return row;
    });
  },

  create: async (tenantId: string, actorId: string, data: Omit<NewMailbox, "organizationId">) => {
    const created = await withTenantTransaction(tenantId, async (tx) => {
      const [created] = await tx
        .insert(mailbox)
        .values({ ...data, organizationId: tenantId })
        .returning();

      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "mailbox",
        entityId: created.id,
        actorId,
        action: "created",
        newValues: omitCredentials(created),
      });

      return created;
    });
    // Start listening to the new mailbox in the background
    MailboxManager.getInstance().startListener(created.id).catch(err => console.error(err));
    return created;
  },

  update: async (tenantId: string, id: string, actorId: string, data: Partial<NewMailbox>) => {
    const updated = await withTenantTransaction(tenantId, async (tx) => {
      const [before] = await tx
        .select()
        .from(mailbox)
        .where(and(eq(mailbox.id, id), eq(mailbox.organizationId, tenantId)))
        .limit(1);
      if (!before) throw new Error("Mailbox not found");

      const [updated] = await tx
        .update(mailbox)
        .set(data)
        .where(and(eq(mailbox.id, id), eq(mailbox.organizationId, tenantId)))
        .returning();

      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "mailbox",
        entityId: id,
        actorId,
        action: "updated",
        oldValues: omitCredentials(before),
        newValues: omitCredentials(updated),
      });

      return updated;
    });
    // Restart listener with new credentials
    MailboxManager.getInstance().updateCredentials(id).catch(err => console.error(err));
    return updated;
  },

  remove: async (tenantId: string, id: string, actorId: string) => {
    await withTenantTransaction(tenantId, async (tx) => {
      const [before] = await tx
        .select()
        .from(mailbox)
        .where(and(eq(mailbox.id, id), eq(mailbox.organizationId, tenantId)))
        .limit(1);
      if (!before) throw new Error("Mailbox not found");

      await tx.delete(mailbox).where(and(eq(mailbox.id, id), eq(mailbox.organizationId, tenantId)));

      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "mailbox",
        entityId: id,
        actorId,
        action: "deleted",
        oldValues: omitCredentials(before),
      });
    });
    // Stop listener
    MailboxManager.getInstance().stopListener(id).catch(err => console.error(err));
  },
};
