import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ResponseHandler } from "../../lib/response";
import { authMiddleware, JwtPayload } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import { AuditLogService } from "./audit-log.service";
import { getAuditLogsQuerySchema } from "@help-desk/shared";

export const auditLogRouter = new Hono<{
  Variables: { tenantId: string; user: JwtPayload };
}>()
  .use("*", authMiddleware())
  .get(
    "/",
    requirePermission("audit.read"),
    zValidator("query", getAuditLogsQuerySchema),
    async (c) => {
      const tenantId = c.get("tenantId");
      const query = c.req.valid("query");
      try {
        const logs = await AuditLogService.findAll(tenantId, query);
        return ResponseHandler.ok(c, logs);
      } catch (err: any) {
        return ResponseHandler.badRequest(c, err.message);
      }
    },
  )
  .get(
    "/:entityType/:entityId",
    requirePermission("audit.read"),
    async (c) => {
      const tenantId = c.get("tenantId");
      const entityType = c.req.param("entityType") as string;
      const entityId = c.req.param("entityId") as string;
      try {
        const logs = await AuditLogService.findByEntity(tenantId, entityType, entityId);
        return ResponseHandler.ok(c, logs);
      } catch (err: any) {
        return ResponseHandler.badRequest(c, err.message);
      }
    },
  );
