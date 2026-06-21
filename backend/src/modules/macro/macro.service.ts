import { eq, and, isNull } from "drizzle-orm";
import { withTenantTransaction } from "../../infra/db";
import { macro, MacroActionDef } from "./macro.schema";
import { ticket } from "../ticket/ticket.schema";
import { ticketTag } from "../ticket/ticket-tag.schema";
import { ticketMessage } from "../ticket/ticket-message.schema";
import { auditLog } from "../audit-log/audit-log.schema";

export const MacroService = {
  findAll: async (tenantId: string) => {
    return withTenantTransaction(tenantId, async (tx) =>
      tx.select().from(macro).where(and(eq(macro.organizationId, tenantId), isNull(macro.deletedAt))),
    );
  },

  findById: async (tenantId: string, id: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const [row] = await tx.select().from(macro).where(and(eq(macro.id, id), eq(macro.organizationId, tenantId))).limit(1);
      return row ?? null;
    });
  },

  create: async (tenantId: string, actorId: string, data: { name: string; description?: string; actions: MacroActionDef[] }) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const [row] = await tx.insert(macro).values({
        organizationId: tenantId,
        createdById: actorId,
        name: data.name,
        description: data.description,
        actions: data.actions,
      }).returning();
      await tx.insert(auditLog).values({ organizationId: tenantId, entityType: "macro", entityId: row.id, actorId, action: "macro_created", newValues: { name: data.name } });
      return row;
    });
  },

  update: async (tenantId: string, id: string, actorId: string, data: Partial<{ name: string; description: string; actions: MacroActionDef[]; isActive: boolean }>) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const [existing] = await tx.select().from(macro).where(and(eq(macro.id, id), eq(macro.organizationId, tenantId))).limit(1);
      if (!existing) throw new Error("Macro not found");
      const [row] = await tx.update(macro).set({ ...data, updatedAt: new Date() }).where(eq(macro.id, id)).returning();
      await tx.insert(auditLog).values({ organizationId: tenantId, entityType: "macro", entityId: id, actorId, action: "macro_updated", oldValues: existing, newValues: data });
      return row;
    });
  },

  remove: async (tenantId: string, id: string, actorId: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const [existing] = await tx.select().from(macro).where(and(eq(macro.id, id), eq(macro.organizationId, tenantId))).limit(1);
      if (!existing) throw new Error("Macro not found");
      await tx.update(macro).set({ deletedAt: new Date() }).where(eq(macro.id, id));
      await tx.insert(auditLog).values({ organizationId: tenantId, entityType: "macro", entityId: id, actorId, action: "macro_deleted", oldValues: { name: existing.name } });
    });
  },

  duplicate: async (tenantId: string, id: string, actorId: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const [source] = await tx.select().from(macro).where(and(eq(macro.id, id), eq(macro.organizationId, tenantId))).limit(1);
      if (!source) throw new Error("Macro not found");
      const [row] = await tx.insert(macro).values({
        organizationId: tenantId,
        createdById: actorId,
        name: `${source.name} (copy)`,
        description: source.description,
        actions: source.actions as MacroActionDef[],
      }).returning();
      return row;
    });
  },

  apply: async (tenantId: string, macroId: string, ticketId: string, actorId: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const [m] = await tx.select().from(macro).where(and(eq(macro.id, macroId), eq(macro.organizationId, tenantId))).limit(1);
      if (!m) throw new Error("Macro not found");

      const [t] = await tx.select().from(ticket).where(and(eq(ticket.id, ticketId), eq(ticket.organizationId, tenantId))).limit(1);
      if (!t) throw new Error("Ticket not found");

      const actions = m.actions as MacroActionDef[];
      for (const action of actions) {
        switch (action.type) {
          case "set_status":
            await tx.update(ticket).set({ status: action.value }).where(eq(ticket.id, ticketId));
            break;
          case "set_priority":
            await tx.update(ticket).set({ priority: action.value }).where(eq(ticket.id, ticketId));
            break;
          case "add_tag":
            await tx.insert(ticketTag).values({ ticketId, name: action.value }).onConflictDoNothing();
            break;
          case "remove_tag":
            await tx.delete(ticketTag).where(and(eq(ticketTag.ticketId, ticketId), eq(ticketTag.name, action.value)));
            break;
          case "send_reply":
            await tx.insert(ticketMessage).values({ ticketId, senderId: actorId, content: action.value, type: "PUBLIC_REPLY" });
            break;
          case "add_note":
            await tx.insert(ticketMessage).values({ ticketId, senderId: actorId, content: action.value, type: "INTERNAL_NOTE" });
            break;
          case "assign_to":
            await tx.update(ticket).set({ assigneeId: action.value }).where(eq(ticket.id, ticketId));
            break;
        }
      }

      await tx.insert(auditLog).values({ organizationId: tenantId, entityType: "ticket", entityId: ticketId, actorId, action: "macro_applied", newValues: { macroId, macroName: m.name } });
      return { applied: actions.length };
    });
  },
};
