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

  // Create a group conversation. Restricted to Super-Admin / Admin / Supervisor.
  .post(
    "/group",
    zValidator(
      "json",
      z.object({
        name: z.string().min(1).max(255),
        participantIds: z.array(z.string().uuid()).max(200).default([]),
      }),
    ),
    async (c) => {
      const user = c.get("user");
      if (!["SUPER_ADMIN", "ADMIN", "SUPERVISOR"].includes(user.globalRole)) {
        return ResponseHandler.forbidden(c, "Only admins or supervisors can create groups");
      }
      const { name, participantIds } = c.req.valid("json");
      try {
        const conversationId = await MessagingService.createGroup(
          user.userId,
          user.organizationId,
          user.globalRole,
          name,
          participantIds,
        );
        return ResponseHandler.ok(c, { conversationId });
      } catch (err: any) {
        return ResponseHandler.badRequest(c, err.message);
      }
    },
  )

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

  // Send a message. Body may be empty when the message carries attachments
  // (the client confirms attachments against the returned message id).
  // `attachmentCount` lets recipients render skeletons until the files land.
  .post(
    "/:id/messages",
    zValidator(
      "json",
      z.object({
        body: z.string().max(10000).default(""),
        attachmentCount: z.number().int().min(0).max(20).default(0),
      }),
    ),
    async (c) => {
      const user = c.get("user");
      const conversationId = c.req.param("id");
      const { body, attachmentCount } = c.req.valid("json");
      try {
        const { msg, recipientIds } = await MessagingService.sendMessage(
          conversationId,
          user.userId,
          body,
          user.organizationId,
          attachmentCount,
        );

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
    },
  )

  // Re-announce a message once its attachments are confirmed, so recipients
  // refetch and replace skeletons with the real files.
  .post("/:id/messages/:messageId/attachments-ready", async (c) => {
    const user = c.get("user");
    const conversationId = c.req.param("id");
    const messageId = c.req.param("messageId");
    try {
      const recipientIds = await MessagingService.getMessageRecipients(
        conversationId,
        messageId,
        user.userId,
        user.organizationId,
      );
      emitEvent("chat.message", {
        conversationId,
        messageId,
        senderId: user.userId,
        organizationId: user.organizationId,
        recipientIds,
      });
      return ResponseHandler.ok(c, { ok: true });
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
