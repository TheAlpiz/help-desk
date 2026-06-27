import type { IncomingMessage, Server as HttpServer } from "http";
import type { Socket } from "net";
import { WebSocketServer, WebSocket } from "ws";
import { verify } from "jsonwebtoken";
import { env } from "../infra/env";
import { logger } from "../infra/logger";
import type { JwtPayload } from "../middleware/auth.middleware";

export type RealtimeEvent =
  | { type: "notification"; payload: { id?: string; type?: string; title: string; body?: string; actionUrl?: string } }
  | { type: "ticket.created"; payload: { ticketId: string } }
  | { type: "ticket.updated"; payload: { ticketId: string } }
  | { type: "ticket.assigned"; payload: { ticketId: string; assigneeId: string } }
  | { type: "ticket.reply"; payload: { ticketId: string } }
  | { type: "task.assigned"; payload: { taskId: string; assigneeId: string } }
  | { type: "sla.violation"; payload: { ticketId: string; breachType: string } }
  | { type: "comment.mention"; payload: { entityType: "ticket" | "task"; entityId: string } }
  | { type: "chat.message"; payload: { conversationId: string; messageId: string; senderId: string } }
  | { type: "presence"; payload: { userId: string; online?: boolean; availability?: string } };

type Conn = { socket: WebSocket; tenantId: string; userId: string };

class WsGateway {
  private wss: WebSocketServer | null = null;
  private byTenant = new Map<string, Set<Conn>>();
  private byUser = new Map<string, Set<Conn>>();

  attach(server: HttpServer) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (req: IncomingMessage, sock: Socket, head: Buffer) => {
      if (!req.url?.startsWith("/ws")) return;
      const auth = this.authenticate(req);
      if (!auth) {
        sock.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        sock.destroy();
        return;
      }
      this.wss!.handleUpgrade(req, sock, head, (ws) => {
        this.register(ws, auth.tenantId, auth.userId);
      });
    });

    logger.info("WebSocket gateway attached at /ws");
  }

  private authenticate(req: IncomingMessage): { tenantId: string; userId: string } | null {
    try {
      const url = new URL(req.url!, "http://localhost");
      const token = url.searchParams.get("token");
      const tenantId = url.searchParams.get("tenant");
      if (!token || !tenantId) return null;
      const payload = verify(token, env.JWT_SECRET || "fallback_secret") as JwtPayload;
      if (payload.organizationId !== tenantId) return null;
      return { tenantId, userId: payload.userId };
    } catch {
      return null;
    }
  }

  private register(socket: WebSocket, tenantId: string, userId: string) {
    const conn: Conn = { socket, tenantId, userId };
    if (!this.byTenant.has(tenantId)) this.byTenant.set(tenantId, new Set());
    if (!this.byUser.has(userId)) this.byUser.set(userId, new Set());
    // A user is "online" from their first socket; emit presence only on that
    // transition (extra tabs are silent).
    const wasOnline = (this.byUser.get(userId)!.size ?? 0) > 0;
    this.byTenant.get(tenantId)!.add(conn);
    this.byUser.get(userId)!.add(conn);
    if (!wasOnline) this.broadcastPresence(tenantId, { userId, online: true });

    socket.send(JSON.stringify({ type: "connected" }));

    const heartbeat = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) socket.ping();
    }, 30_000);

    const cleanup = () => {
      clearInterval(heartbeat);
      this.byTenant.get(tenantId)?.delete(conn);
      this.byUser.get(userId)?.delete(conn);
      if (this.byTenant.get(tenantId)?.size === 0) this.byTenant.delete(tenantId);
      // Last socket for this user closed → they are offline.
      if (this.byUser.get(userId)?.size === 0) {
        this.byUser.delete(userId);
        this.broadcastPresence(tenantId, { userId, online: false });
      }
    };

    socket.on("close", cleanup);
    socket.on("error", cleanup);
  }

  /** Is the user currently connected on at least one socket? */
  isOnline(userId: string): boolean {
    return (this.byUser.get(userId)?.size ?? 0) > 0;
  }

  /** User ids with at least one live socket in the tenant. */
  onlineUserIds(tenantId: string): string[] {
    const ids = new Set<string>();
    this.byTenant.get(tenantId)?.forEach((c) => ids.add(c.userId));
    return Array.from(ids);
  }

  broadcastPresence(tenantId: string, payload: { userId: string; online?: boolean; availability?: string }) {
    this.pushToTenant(tenantId, { type: "presence", payload });
  }

  pushToUser(userId: string, event: RealtimeEvent) {
    const conns = this.byUser.get(userId);
    if (!conns) return;
    const payload = JSON.stringify(event);
    conns.forEach((c) => {
      if (c.socket.readyState === WebSocket.OPEN) c.socket.send(payload);
    });
  }

  pushToTenant(tenantId: string, event: RealtimeEvent) {
    const conns = this.byTenant.get(tenantId);
    if (!conns) return;
    const payload = JSON.stringify(event);
    conns.forEach((c) => {
      if (c.socket.readyState === WebSocket.OPEN) c.socket.send(payload);
    });
  }
}

export const wsGateway = new WsGateway();
