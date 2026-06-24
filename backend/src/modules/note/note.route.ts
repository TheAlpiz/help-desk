import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ResponseHandler } from "../../lib/response";
import { authMiddleware, JwtPayload } from "../../middleware/auth.middleware";
import { NoteService } from "./note.service";
import { createNoteSchema, updateNoteSchema } from "@help-desk/shared";

// Personal notes are private to the authenticated user. No RBAC permission is
// required (everyone manages their own notes); ownership is enforced in the
// service by always scoping to user.userId.
export const noteRouter = new Hono<{ Variables: { tenantId: string; user: JwtPayload } }>()
  .use("*", authMiddleware())

  .get("/", async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    try {
      const data = await NoteService.list(tenantId, user.userId);
      return ResponseHandler.ok(c, data);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  .post("/", zValidator("json", createNoteSchema), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    try {
      const data = await NoteService.create(tenantId, user.userId, c.req.valid("json"));
      return ResponseHandler.created(c, data);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  .put("/:id", zValidator("json", updateNoteSchema), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const id = c.req.param("id");
    try {
      const data = await NoteService.update(tenantId, user.userId, id, c.req.valid("json"));
      return ResponseHandler.ok(c, data);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  .delete("/:id", async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const id = c.req.param("id");
    try {
      const data = await NoteService.remove(tenantId, user.userId, id);
      return ResponseHandler.ok(c, data);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  });
