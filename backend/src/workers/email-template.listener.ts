import { onEvent } from "../infra/events";
import { dispatchTicketTemplate } from "../modules/email/template-dispatch";

/**
 * Wires ticket lifecycle events to the org's configured email templates so that
 * authoring a template (and publishing it) actually sends mail. Each handler is
 * a no-op when no published template of that type exists.
 */
export function initEmailTemplateListeners() {
  // New ticket → acknowledge the customer.
  onEvent("ticket.created", ({ ticketId, organizationId }) => {
    void dispatchTicketTemplate(organizationId, ticketId, "ticket_created");
  });

  // Ticket assigned → tell the customer an agent is now on it.
  onEvent("ticket.assigned", ({ ticketId, organizationId, assigneeId }) => {
    void dispatchTicketTemplate(organizationId, ticketId, "ticket_assigned", { senderId: assigneeId });
  });

  // ticket.updated is only emitted on a status change — pick the template that
  // matches the new state (closed/resolved → closed; reopened → reopened).
  onEvent("ticket.updated", ({ ticketId, organizationId, actorId }) => {
    void dispatchTicketTemplate(organizationId, ticketId, "ticket_closed", {
      senderId: actorId,
      requireStatusIn: ["resolved", "closed"],
    });
    void dispatchTicketTemplate(organizationId, ticketId, "ticket_reopened", {
      senderId: actorId,
      requireStatusIn: ["reopened"],
    });
  });
}
