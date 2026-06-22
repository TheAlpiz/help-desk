import { eq, and } from "drizzle-orm";
import { withTenantTransaction } from "../../infra/db";
import { mailbox, NewMailbox, Mailbox } from "./mailbox.schema";
import { auditLog } from "../audit-log/audit-log.schema";
import { MailboxManager } from "../../workers/mailbox.manager";
import { encryptSecret } from "../../infra/crypto";

// Strip credentials before storing in audit log or returning over the API.
export const omitCredentials = (m: Mailbox) => {
  const { imapPasswordEncrypted: _imap, smtpPasswordEncrypted: _smtp, ...safe } = m;
  return safe;
};

// The shared contract exposes `imapPassword` / `smtpPassword`, but the DB columns
// are `imapPasswordEncrypted` / `smtpPasswordEncrypted`. Map them explicitly —
// otherwise Drizzle silently drops the unknown keys and stores NULL passwords,
// which makes MailboxManager skip the listener (no IMAP creds -> no tickets).
const mapCredentials = <T extends { imapPassword?: string; smtpPassword?: string }>(
  data: T,
): Omit<T, "imapPassword" | "smtpPassword"> & {
  imapPasswordEncrypted?: string;
  smtpPasswordEncrypted?: string;
} => {
  const { imapPassword, smtpPassword, ...rest } = data;
  return {
    ...rest,
    ...(imapPassword !== undefined
      ? { imapPasswordEncrypted: encryptSecret(imapPassword) ?? undefined }
      : {}),
    ...(smtpPassword !== undefined
      ? { smtpPasswordEncrypted: encryptSecret(smtpPassword) ?? undefined }
      : {}),
  };
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

  create: async (
    tenantId: string,
    actorId: string,
    data: Omit<NewMailbox, "organizationId"> & { imapPassword?: string; smtpPassword?: string },
  ) => {
    const values = mapCredentials(data);
    const created = await withTenantTransaction(tenantId, async (tx) => {
      const [created] = await tx
        .insert(mailbox)
        .values({ ...values, organizationId: tenantId })
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

  update: async (
    tenantId: string,
    id: string,
    actorId: string,
    data: Partial<NewMailbox> & { imapPassword?: string; smtpPassword?: string },
  ) => {
    const values = mapCredentials(data);
    const updated = await withTenantTransaction(tenantId, async (tx) => {
      const [before] = await tx
        .select()
        .from(mailbox)
        .where(and(eq(mailbox.id, id), eq(mailbox.organizationId, tenantId)))
        .limit(1);
      if (!before) throw new Error("Mailbox not found");

      const [updated] = await tx
        .update(mailbox)
        .set(values)
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
