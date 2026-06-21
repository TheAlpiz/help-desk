import { EventEmitter } from "events";

class EventBus extends EventEmitter {}

export const eventBus = new EventBus();

// Type-safe event emission
export type AppEvents = {
  "ticket.created":   { ticketId: string; actorId: string; organizationId: string };
  "ticket.updated":   { ticketId: string; actorId: string; organizationId: string };
  "ticket.assigned":  { ticketId: string; assigneeId: string; actorId: string; organizationId: string };
  "ticket.reply":     { ticketId: string; actorId: string | null; organizationId: string };
  "ticket.tag_added": { ticketId: string; tag: string; actorId: string; organizationId: string };
  "task.assigned":    { taskId: string; assigneeId: string; actorId: string; organizationId: string };
  "sla.violation":    { ticketId: string; policyId: string; organizationId: string; breachType: string };
  "ticket.commented": { ticketId: string; senderId: string; organizationId: string };
  "comment.mention": {
    entityType: "ticket" | "task";
    entityId: string;
    mentionedUserId: string;
    actorId: string | null;
    organizationId: string;
  };
};

export function emitEvent<K extends keyof AppEvents>(event: K, payload: AppEvents[K]) {
  eventBus.emit(event, payload);
}

export function onEvent<K extends keyof AppEvents>(event: K, listener: (payload: AppEvents[K]) => void) {
  eventBus.on(event, listener);
}
