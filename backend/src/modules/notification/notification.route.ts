import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ResponseHandler } from "../../lib/response";
import { authMiddleware, JwtPayload } from "../../middleware/auth.middleware";
import { NotificationService } from "./notification.service";
import { updateNotificationPreferenceSchema, markNotificationReadSchema } from "@help-desk/shared";

export const notificationRouter = new Hono<{ Variables: { tenantId: string; user: JwtPayload } }>()
  .use("*", authMiddleware())
  // Current user's notifications
  .get("/", async (c) => {
    const user = c.get("user");
    try {
      const notifications = await NotificationService.getForUser(user.organizationId, user.userId);
      return ResponseHandler.ok(c, notifications);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })
  // Mark one notification read/unread
  .patch("/:id/read", zValidator("json", markNotificationReadSchema), async (c) => {
    const user = c.get("user");
    const id = c.req.param("id") as string;
    const data = c.req.valid("json");
    try {
      const updated = await NotificationService.markRead(user.organizationId, user.userId, id, data.isRead);
      if (!updated) return ResponseHandler.notFound(c);
      return ResponseHandler.ok(c, updated);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })
  // List preferences
  .get("/preferences", async (c) => {
    const user = c.get("user");
    try {
      const prefs = await NotificationService.getPreferences(user.organizationId, user.userId);
      return ResponseHandler.ok(c, prefs);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })
  // Upsert a channel preference
  .put("/preferences", zValidator("json", updateNotificationPreferenceSchema), async (c) => {
    const user = c.get("user");
    const data = c.req.valid("json");
    try {
      let pref;
      if ("eventKey" in data) {
        pref = await NotificationService.togglePreference(
          user.organizationId,
          user.userId,
          data.channel,
          data.eventKey,
          data.enabled,
        );
      } else {
        pref = await NotificationService.upsertPreference(
          user.organizationId,
          user.userId,
          data.channel,
          data.eventTypes,
        );
      }
      return ResponseHandler.ok(c, pref);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  });
