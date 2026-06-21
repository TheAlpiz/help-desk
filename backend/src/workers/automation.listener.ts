import { onEvent } from "../infra/events";
import { AutomationService } from "../modules/automation/automation.service";
import { logger } from "../infra/logger";

function run(triggerType: string, ticketId: string, actorId: string | null, organizationId: string) {
  AutomationService.runForEvent(organizationId, triggerType, ticketId, actorId).catch((err) => {
    logger.error({ err, triggerType, ticketId, organizationId }, "Automation execution failed");
  });
}

export function initAutomationListeners() {
  onEvent("ticket.created", ({ ticketId, actorId, organizationId }) => {
    run("ticket_created", ticketId, actorId, organizationId);
  });

  onEvent("ticket.updated", ({ ticketId, actorId, organizationId }) => {
    run("ticket_updated", ticketId, actorId, organizationId);
  });

  onEvent("ticket.assigned", ({ ticketId, actorId, organizationId }) => {
    run("ticket_assigned", ticketId, actorId, organizationId);
  });

  onEvent("ticket.reply", ({ ticketId, actorId, organizationId }) => {
    run("reply_received", ticketId, actorId, organizationId);
  });

  onEvent("sla.violation", ({ ticketId, organizationId }) => {
    run("sla_breached", ticketId, null, organizationId);
  });

  onEvent("ticket.tag_added", ({ ticketId, actorId, organizationId }) => {
    run("tag_added", ticketId, actorId, organizationId);
  });

  logger.info("Automation event listeners initialized");
}
