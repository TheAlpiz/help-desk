import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { withTenantTransaction } from "../../infra/db";
import { user } from "../user/user.schema";
import { ticket } from "./ticket.schema";
import { wsGateway } from "../../ws/gateway";

// Roles eligible to receive tickets via auto-assignment.
const ASSIGNABLE_ROLES = ["AGENT", "SUPERVISOR", "ADMIN"];

// Availability → weight. Higher = picked more often. `not_available` is excluded
// before we ever get here, so it has no weight.
const AVAILABILITY_WEIGHT: Record<string, number> = {
  active_duty: 3,
  available: 2,
  away: 1,
  do_not_disturb: 1,
};

type Candidate = {
  id: string;
  availability: string;
  load: number;
  online: boolean;
};

// Core selection, runs inside an existing tenant transaction. Exported so callers
// already inside a transaction (e.g. the automation engine) can reuse it without
// opening a nested one.
export async function selectAssigneeWithinTx(
  tx: any,
  tenantId: string,
  departmentId?: string | null,
): Promise<string | null> {
  const conds = [
    eq(user.organizationId, tenantId),
    eq(user.status, "active"),
    ne(user.availability, "not_available"), // never assign to "not available"
    inArray(user.globalRole, ASSIGNABLE_ROLES),
  ];
  if (departmentId) conds.push(eq(user.departmentId, departmentId));

  const agents = await tx
    .select({ id: user.id, availability: user.availability })
    .from(user)
    .where(and(...conds));
  if (agents.length === 0) return null;

  const ids = agents.map((a: { id: string }) => a.id);
  const loadRows = await tx
    .select({ assigneeId: ticket.assigneeId, load: sql<number>`count(*)::int` })
    .from(ticket)
    .where(
      and(
        eq(ticket.organizationId, tenantId),
        inArray(ticket.assigneeId, ids),
        sql`${ticket.status} not in ('resolved','closed')`,
      ),
    )
    .groupBy(ticket.assigneeId);
  const loadById = new Map<string, number>(
    loadRows.map((r: { assigneeId: string; load: number }) => [r.assigneeId, Number(r.load)]),
  );

  const candidates: Candidate[] = agents.map((a: { id: string; availability: string }) => ({
    id: a.id,
    availability: a.availability,
    load: loadById.get(a.id) ?? 0,
    online: wsGateway.isOnline(a.id),
  }));

  candidates.sort((x, y) => {
    if (x.online !== y.online) return x.online ? -1 : 1; // 1) online first
    const wx = AVAILABILITY_WEIGHT[x.availability] ?? 0;
    const wy = AVAILABILITY_WEIGHT[y.availability] ?? 0;
    if (wx !== wy) return wy - wx; // 2) higher availability weight first
    return x.load - y.load; // 3) lighter load first (round-robin among equals)
  });

  return candidates[0]?.id ?? null;
}

export const AssignmentService = {
  /**
   * Pick the best agent to auto-assign to, honouring Discord-style availability:
   *   - `not_available` agents are never chosen.
   *   - higher availability weight (active_duty > available > away/dnd) wins, so
   *     active-duty agents get work more often.
   *   - online agents are preferred over offline ones.
   *   - ties break to the agent with the fewest open tickets (load balancing).
   * Returns the chosen userId, or null when no eligible agent exists.
   */
  pickAssignee: async (
    tenantId: string,
    opts?: { departmentId?: string | null },
  ): Promise<string | null> => {
    return withTenantTransaction(tenantId, (tx) => selectAssigneeWithinTx(tx, tenantId, opts?.departmentId));
  },

  /** Pick scoped to the ticket's own department (falls back to org-wide if none). */
  pickForTicket: async (tenantId: string, ticketId: string): Promise<string | null> => {
    return withTenantTransaction(tenantId, async (tx) => {
      const [t] = await tx
        .select({ departmentId: ticket.departmentId })
        .from(ticket)
        .where(and(eq(ticket.id, ticketId), eq(ticket.organizationId, tenantId)))
        .limit(1);
      if (!t) return null;
      return selectAssigneeWithinTx(tx, tenantId, t.departmentId);
    });
  },
};
