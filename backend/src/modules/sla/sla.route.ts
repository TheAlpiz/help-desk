import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { SlaService } from "./sla.service";
import { ResponseHandler } from "../../lib/response";
import { authMiddleware, JwtPayload } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import { createSlaSchema, updateSlaSchema } from "@help-desk/shared";

export const slaRouter = new Hono<{
  Variables: { tenantId: string; user: JwtPayload };
}>()
  .use("*", authMiddleware())
  .post(
    "/",
    requirePermission("sla.manage"),
    zValidator("json", createSlaSchema),
    async (c) => {
      const tenantId = c.get("tenantId");
      if (!tenantId)
        return ResponseHandler.unauthorized(c, "Tenant ID required");
      const data = c.req.valid("json");

      try {
        const sla = await SlaService.create(tenantId, data);
        return c.json(
          { success: true, data: sla, message: "SLA Policy created" },
          201,
        );
      } catch (err: any) {
        return ResponseHandler.badRequest(c, err.message);
      }
    },
  )
  .put(
    "/:id",
    requirePermission("sla.manage"),
    zValidator("json", updateSlaSchema),
    async (c) => {
      const tenantId = c.get("tenantId");
      if (!tenantId)
        return ResponseHandler.unauthorized(c, "Tenant ID required");
      const id = c.req.param("id");
      const data = c.req.valid("json");

      try {
        const sla = await SlaService.update(tenantId, id, data);
        return c.json({
          success: true,
          data: sla,
          message: "SLA Policy updated",
        });
      } catch (err: any) {
        return ResponseHandler.badRequest(c, err.message);
      }
    },
  )
  .get("/", requirePermission("sla.manage"), async (c) => {
    try {
      const tenantId = c.get("tenantId");
      if (!tenantId)
        return ResponseHandler.unauthorized(c, "Tenant ID required");
      const slas = await SlaService.findAll(tenantId);
      return c.json({
        success: true,
        data: slas,
        message: "Fetched SLA policies",
      });
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })
  .get("/:id", requirePermission("sla.manage"), async (c) => {
    try {
      const tenantId = c.get("tenantId");
      if (!tenantId)
        return ResponseHandler.unauthorized(c, "Tenant ID required");
      const sla = await SlaService.findById(tenantId, c.req.param("id") as string);
      if (!sla) return ResponseHandler.notFound(c, "SLA policy not found");
      return c.json({ success: true, data: sla, message: "Fetched SLA policy" });
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })
  .delete("/:id", requirePermission("sla.manage"), async (c) => {
    try {
      const tenantId = c.get("tenantId");
      if (!tenantId)
        return ResponseHandler.unauthorized(c, "Tenant ID required");
      await SlaService.remove(tenantId, c.req.param("id") as string);
      return c.json({ success: true, data: null, message: "SLA policy deleted" });
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  });
