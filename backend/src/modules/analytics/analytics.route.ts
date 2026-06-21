import { Hono } from "hono";
import { ResponseHandler } from "../../lib/response";
import { authMiddleware, JwtPayload } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import { AnalyticsService } from "./analytics.service";

export const analyticsRouter = new Hono<{ Variables: { tenantId: string; user: JwtPayload } }>()
  .use("*", authMiddleware())
  .use("*", requirePermission("analytics.view"))
  .get("/tickets-summary", async (c) => {
    const tenantId = c.get("tenantId");
    try {
      const data = await AnalyticsService.getTicketsSummary(tenantId);
      return ResponseHandler.success(c, data);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })
  .get("/agent-performance", async (c) => {
    const tenantId = c.get("tenantId");
    try {
      const data = await AnalyticsService.getAgentPerformance(tenantId);
      return ResponseHandler.success(c, data);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })
  .get("/sla-compliance", async (c) => {
    const tenantId = c.get("tenantId");
    try {
      const data = await AnalyticsService.getSlaCompliance(tenantId);
      return ResponseHandler.success(c, data);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })
  .get("/task-completion", async (c) => {
    const tenantId = c.get("tenantId");
    try {
      const data = await AnalyticsService.getTaskCompletion(tenantId);
      return ResponseHandler.success(c, data);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  });
