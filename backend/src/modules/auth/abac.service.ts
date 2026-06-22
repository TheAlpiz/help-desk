import { eq, or, inArray, SQL } from "drizzle-orm";
import { ticket } from "../ticket/ticket.schema";

/**
 * ABAC — attribute-based access control for ticket rows.
 *
 * RBAC (permission middleware) decides whether a user may read tickets at all.
 * ABAC decides WHICH ticket rows, based on relationship attributes:
 *   - ownership : user is the requester
 *   - assignee  : user is the assignee
 *   - department: user's department matches the ticket's department
 *
 * Holding "ticket.read.all" (or "*") lifts all row scoping — org-wide visibility.
 */

export type TicketActor = {
  userId: string;
  departmentIds: string[];
  permissions: string[];
};

export function hasOrgWideTicketRead(actor: TicketActor): boolean {
  return actor.permissions.includes("*") || actor.permissions.includes("ticket.read.all");
}

/**
 * SQL predicate restricting a ticket query to rows the actor may see.
 * Returns undefined when the actor has org-wide read (no extra restriction).
 */
export function ticketVisibilityFilter(actor: TicketActor): SQL | undefined {
  if (hasOrgWideTicketRead(actor)) return undefined;

  const clauses: (SQL | undefined)[] = [
    eq(ticket.requesterId, actor.userId),
    eq(ticket.assigneeId, actor.userId),
  ];
  if (actor.departmentIds.length > 0) {
    clauses.push(inArray(ticket.departmentId, actor.departmentIds));
  }
  return or(...clauses);
}

/** In-memory check for a single already-loaded ticket row. */
export function canViewTicket(
  actor: TicketActor,
  t: { requesterId: string | null; assigneeId: string | null; departmentId: string | null },
): boolean {
  if (hasOrgWideTicketRead(actor)) return true;
  if (t.requesterId === actor.userId) return true;
  if (t.assigneeId === actor.userId) return true;
  if (t.departmentId && actor.departmentIds.includes(t.departmentId)) return true;
  return false;
}
