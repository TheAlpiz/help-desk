import { onEvent } from "../infra/events";
import { wsGateway } from "./gateway";

export function initRealtimeBridge() {
  onEvent("ticket.created", (p) =>
    wsGateway.pushToTenant(p.organizationId, { type: "ticket.created", payload: { ticketId: p.ticketId } }),
  );

  onEvent("ticket.updated", (p) =>
    wsGateway.pushToTenant(p.organizationId, { type: "ticket.updated", payload: { ticketId: p.ticketId } }),
  );

  onEvent("ticket.assigned", (p) => {
    wsGateway.pushToTenant(p.organizationId, {
      type: "ticket.assigned",
      payload: { ticketId: p.ticketId, assigneeId: p.assigneeId },
    });
    wsGateway.pushToUser(p.assigneeId, {
      type: "ticket.assigned",
      payload: { ticketId: p.ticketId, assigneeId: p.assigneeId },
    });
  });

  onEvent("ticket.reply", (p) =>
    wsGateway.pushToTenant(p.organizationId, { type: "ticket.reply", payload: { ticketId: p.ticketId } }),
  );

  onEvent("task.assigned", (p) => {
    wsGateway.pushToTenant(p.organizationId, {
      type: "task.assigned",
      payload: { taskId: p.taskId, assigneeId: p.assigneeId },
    });
    wsGateway.pushToUser(p.assigneeId, {
      type: "task.assigned",
      payload: { taskId: p.taskId, assigneeId: p.assigneeId },
    });
  });

  onEvent("sla.violation", (p) =>
    wsGateway.pushToTenant(p.organizationId, {
      type: "sla.violation",
      payload: { ticketId: p.ticketId, breachType: p.breachType },
    }),
  );

  onEvent("comment.mention", (p) => {
    wsGateway.pushToUser(p.mentionedUserId, {
      type: "comment.mention",
      payload: { entityType: p.entityType, entityId: p.entityId },
    });
  });

  onEvent("chat.message", (p) => {
    for (const uid of p.recipientIds) {
      wsGateway.pushToUser(uid, {
        type: "chat.message",
        payload: { conversationId: p.conversationId, messageId: p.messageId, senderId: p.senderId },
      });
    }
  });
}
