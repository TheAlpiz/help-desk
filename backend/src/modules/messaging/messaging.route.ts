import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, type JwtPayload } from "../../middleware/auth.middleware";
import { MessagingService } from "./messaging.service";
import { ResponseHandler } from "../../lib/response";
import { emitEvent } from "../../infra/events";

export const messagingRouter = new Hono<{ Variables: { tenantId: string; user: JwtPayload } }>()
  .use("*", authMiddleware())

  // List current user's conversations
  .get("/", async (c) => {
    const user = c.get("user");
    try {
      const convs = await MessagingService.listConversations(user.userId, user.organizationId);
      return ResponseHandler.ok(c, convs);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  // Get or create a direct conversation with another user
  .post("/direct", zValidator("json", z.object({ userId: z.string().uuid() })), async (c) => {
    const user = c.get("user");
    const { userId: targetUserId } = c.req.valid("json");
    try {
      const conversationId = await MessagingService.getOrCreateDirect(user.userId, targetUserId, user.organizationId);
      return ResponseHandler.ok(c, { conversationId });
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  // List messages in a conversation (cursor-paginated, newest last)
  .get(
    "/:id/messages",
    zValidator("query", z.object({ cursor: z.string().optional(), limit: z.coerce.number().min(1).max(100).optional() })),
    async (c) => {
      const user = c.get("user");
      const { cursor, limit } = c.req.valid("query");
      try {
        const result = await MessagingService.listMessages(c.req.param("id"), user.userId, user.organizationId, cursor, limit);
        return ResponseHandler.ok(c, result);
      } catch (err: any) {
        return ResponseHandler.badRequest(c, err.message);
      }
    },
  )

  // Send a message
  .post("/:id/messages", zValidator("json", z.object({ body: z.string().min(1).max(10000) })), async (c) => {
    const user = c.get("user");
    const conversationId = c.req.param("id");
    const { body } = c.req.valid("json");
    try {
      const { msg, recipientIds } = await MessagingService.sendMessage(conversationId, user.userId, body, user.organizationId);

      // Fire after transaction commits
      emitEvent("chat.message", {
        conversationId,
        messageId: msg.id,
        senderId: user.userId,
        organizationId: user.organizationId,
        recipientIds,
      });

      return ResponseHandler.ok(c, msg);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  // Mark conversation as read
  .put("/:id/read", async (c) => {
    const user = c.get("user");
    try {
      await MessagingService.markRead(c.req.param("id"), user.userId, user.organizationId);
      return ResponseHandler.ok(c, { ok: true });
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  });
