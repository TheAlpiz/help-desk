import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { MacroService } from "./macro.service";
import { ResponseHandler } from "../../lib/response";
import { authMiddleware, JwtPayload } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import { createMacroSchema, updateMacroSchema, applyMacroSchema } from "@help-desk/shared";

const router = new Hono<{ Variables: { tenantId: string; user: JwtPayload } }>()
  .use("*", authMiddleware())

  .get("/", requirePermission("ticket.read"), async (c) => {
    const tenantId = c.get("tenantId");
    try {
      return ResponseHandler.ok(c, await MacroService.findAll(tenantId));
    } catch (err: any) {
      return ResponseHandler.internalServerError(c, err.message);
    }
  })

  .get("/:id", requirePermission("ticket.read"), async (c) => {
    const tenantId = c.get("tenantId");
    const id = c.req.param("id") as string;
    try {
      const row = await MacroService.findById(tenantId, id);
      if (!row) return ResponseHandler.notFound(c, "Macro not found");
      return ResponseHandler.ok(c, row);
    } catch (err: any) {
      return ResponseHandler.internalServerError(c, err.message);
    }
  })

  .post("/", requirePermission("ticket.update"), zValidator("json", createMacroSchema), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    try {
      const body = c.req.valid("json");
      return ResponseHandler.created(c, await MacroService.create(tenantId, user.userId, body));
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  .put("/:id", requirePermission("ticket.update"), zValidator("json", updateMacroSchema), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    try {
      const body = c.req.valid("json");
      return ResponseHandler.ok(c, await MacroService.update(tenantId, id, user.userId, body));
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  .delete("/:id", requirePermission("ticket.update"), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    try {
      await MacroService.remove(tenantId, id, user.userId);
      return ResponseHandler.ok(c, null);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  .post("/:id/duplicate", requirePermission("ticket.update"), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    try {
      return ResponseHandler.created(c, await MacroService.duplicate(tenantId, id, user.userId));
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  .post("/:id/apply", requirePermission("ticket.update"), zValidator("json", applyMacroSchema), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    try {
      const { ticketId } = c.req.valid("json");
      return ResponseHandler.ok(c, await MacroService.apply(tenantId, id, ticketId, user.userId));
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  });

export { router as macroRouter };
