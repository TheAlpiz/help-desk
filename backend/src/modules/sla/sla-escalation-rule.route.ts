import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { SlaEscalationRuleService } from "./sla-escalation-rule.service";
import { ResponseHandler } from "../../lib/response";
import { authMiddleware, JwtPayload } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import {
  createSlaEscalationRuleSchema,
  updateSlaEscalationRuleSchema,
} from "@help-desk/shared";

const router = new Hono<{ Variables: { tenantId: string; user: JwtPayload } }>()
  .use("*", authMiddleware())

  .get("/", requirePermission("sla.manage"), async (c) => {
    try {
      return ResponseHandler.ok(c, await SlaEscalationRuleService.findAll(c.get("tenantId")));
    } catch (err: any) {
      return ResponseHandler.internalServerError(c, err.message);
    }
  })

  .get("/:id", requirePermission("sla.manage"), async (c) => {
    try {
      const row = await SlaEscalationRuleService.findById(c.get("tenantId"), c.req.param("id") as string);
      if (!row) return ResponseHandler.notFound(c, "Escalation rule not found");
      return ResponseHandler.ok(c, row);
    } catch (err: any) {
      return ResponseHandler.internalServerError(c, err.message);
    }
  })

  .post("/", requirePermission("sla.manage"), zValidator("json", createSlaEscalationRuleSchema), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    try {
      const body = c.req.valid("json");
      return ResponseHandler.created(c, await SlaEscalationRuleService.create(tenantId, user.userId, body));
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  .put("/:id", requirePermission("sla.manage"), zValidator("json", updateSlaEscalationRuleSchema), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    try {
      const body = c.req.valid("json");
      return ResponseHandler.ok(c, await SlaEscalationRuleService.update(tenantId, id, user.userId, body));
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  .delete("/:id", requirePermission("sla.manage"), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    try {
      await SlaEscalationRuleService.remove(tenantId, id, user.userId);
      return ResponseHandler.ok(c, null);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  .post("/:id/toggle", requirePermission("sla.manage"), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    try {
      return ResponseHandler.ok(c, await SlaEscalationRuleService.toggle(tenantId, id, user.userId));
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  });

export { router as slaEscalationRuleRouter };
