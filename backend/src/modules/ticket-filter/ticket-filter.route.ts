import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ResponseHandler } from "../../lib/response";
import { authMiddleware, JwtPayload } from "../../middleware/auth.middleware";
import { TicketFilterService } from "./ticket-filter.service";
import { createTicketFilterSchema, updateTicketFilterSchema } from "@help-desk/shared";

const router = new Hono<{ Variables: { tenantId: string; user: JwtPayload } }>()
  .use("*", authMiddleware())
  // Only organization admins and super admins may view/manage filter rules.
  .use("*", async (c, next) => {
    const role = c.get("user")?.globalRole;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return ResponseHandler.forbidden(c, "Admins only");
    }
    await next();
  })

  .get("/", async (c) => {
    const tenantId = c.get("tenantId");
    try {
      const rules = await TicketFilterService.list(tenantId);
      return ResponseHandler.ok(c, rules);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  .post("/", zValidator("json", createTicketFilterSchema), async (c) => {
    const tenantId = c.get("tenantId");
    try {
      const rule = await TicketFilterService.create(tenantId, c.req.valid("json"));
      return ResponseHandler.created(c, rule);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  .put("/:id", zValidator("json", updateTicketFilterSchema), async (c) => {
    const tenantId = c.get("tenantId");
    try {
      const rule = await TicketFilterService.update(tenantId, c.req.param("id"), c.req.valid("json"));
      if (!rule) return ResponseHandler.notFound(c);
      return ResponseHandler.ok(c, rule);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  .delete("/:id", async (c) => {
    const tenantId = c.get("tenantId");
    try {
      await TicketFilterService.remove(tenantId, c.req.param("id"));
      return ResponseHandler.ok(c, { id: c.req.param("id") });
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  });

export { router as ticketFilterRouter };
