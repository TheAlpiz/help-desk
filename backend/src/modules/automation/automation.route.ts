import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { AutomationService } from "./automation.service";
import { ResponseHandler } from "../../lib/response";
import { authMiddleware, JwtPayload } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import { createAutomationSchema, updateAutomationSchema } from "@help-desk/shared";

const router = new Hono<{ Variables: { tenantId: string; user: JwtPayload } }>()
  .use("*", authMiddleware())

  .get("/", requirePermission("ticket.read"), async (c) => {
    const tenantId = c.get("tenantId");
    try {
      return ResponseHandler.ok(c, await AutomationService.findAll(tenantId));
    } catch (err: any) {
      return ResponseHandler.internalServerError(c, err.message);
    }
  })

  .get("/:id", requirePermission("ticket.read"), async (c) => {
    const tenantId = c.get("tenantId");
    const id = c.req.param("id") as string;
    try {
      const row = await AutomationService.findById(tenantId, id);
      if (!row) return ResponseHandler.notFound(c, "Automation not found");
      return ResponseHandler.ok(c, row);
    } catch (err: any) {
      return ResponseHandler.internalServerError(c, err.message);
    }
  })

  .post("/", requirePermission("ticket.update"), zValidator("json", createAutomationSchema), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    try {
      const body = c.req.valid("json");
      return ResponseHandler.created(c, await AutomationService.create(tenantId, user.userId, body));
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  .put("/:id", requirePermission("ticket.update"), zValidator("json", updateAutomationSchema), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    try {
      const body = c.req.valid("json");
      return ResponseHandler.ok(c, await AutomationService.update(tenantId, id, user.userId, body));
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  .delete("/:id", requirePermission("ticket.update"), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    try {
      await AutomationService.remove(tenantId, id, user.userId);
      return ResponseHandler.ok(c, null);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  .post("/:id/toggle", requirePermission("ticket.update"), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    try {
      return ResponseHandler.ok(c, await AutomationService.toggle(tenantId, id, user.userId));
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  });

export { router as automationRouter };
