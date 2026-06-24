export type RealtimeEvent =
  | { type: "connected" }
  | { type: "notification"; payload: { id?: string; title: string; body?: string; actionUrl?: string } }
  | { type: "ticket.created"; payload: { ticketId: string } }
  | { type: "ticket.updated"; payload: { ticketId: string } }
  | { type: "ticket.assigned"; payload: { ticketId: string; assigneeId: string } }
  | { type: "ticket.reply"; payload: { ticketId: string } }
  | { type: "task.assigned"; payload: { taskId: string; assigneeId: string } }
  | { type: "sla.violation"; payload: { ticketId: string; breachType: string } }
  | { type: "comment.mention"; payload: { entityType: "ticket" | "task"; entityId: string } }
  | { type: "chat.message"; payload: { conversationId: string; messageId: string; senderId: string } }
  | { type: "presence"; payload: { userId: string; online?: boolean; availability?: string } };

type Listener = (e: RealtimeEvent) => void;

export class RealtimeClient {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private retry = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  constructor(
    private token: string,
    private tenantId: string,
  ) {}

  connect() {
    this.closed = false;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${window.location.host}/ws?token=${encodeURIComponent(this.token)}&tenant=${encodeURIComponent(this.tenantId)}`;
    const ws = new WebSocket(url);
    this.socket = ws;

    ws.addEventListener("open", () => {
      this.retry = 0;
    });

    ws.addEventListener("message", (ev) => {
      try {
        const data = JSON.parse(ev.data) as RealtimeEvent;
        for (const l of this.listeners) l(data);
      } catch {
        // ignore
      }
    });

    ws.addEventListener("close", () => {
      if (this.closed) return;
      const delay = Math.min(30_000, 500 * 2 ** this.retry++);
      this.timer = setTimeout(() => this.connect(), delay);
    });

    ws.addEventListener("error", () => {
      ws.close();
    });
  }

  on(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close() {
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    this.socket?.close();
    this.socket = null;
    this.listeners.clear();
  }
}
