import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { RoleService } from "./role.service";
import { ResponseHandler } from "../../lib/response";
import { authMiddleware, JwtPayload } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import { createRoleSchema, updateRoleSchema } from "@help-desk/shared";

const router = new Hono<{ Variables: { tenantId: string; user: JwtPayload } }>()
  .use("*", authMiddleware())

  .get("/global", async (c) => {
    const user = c.get("user");
    if (user.globalRole !== "SUPER_ADMIN") {
      return ResponseHandler.forbidden(c, "Super admin only");
    }
    try {
      const data = await RoleService.findAllGlobal();
      return c.json({ success: true as const, data, message: "Fetched global roles" });
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  })

  .post("/global", zValidator("json", createRoleSchema), async (c) => {
    const user = c.get("user");
    if (user.globalRole !== "SUPER_ADMIN") {
      return ResponseHandler.forbidden(c, "Super admin only");
    }
    try {
      const body = c.req.valid("json");
      const data = await RoleService.createGlobal(user.organizationId, body);
      return c.json({ success: true as const, data, message: "Created global role" }, 201);
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  })

  .delete("/global/:id", async (c) => {
    const user = c.get("user");
    if (user.globalRole !== "SUPER_ADMIN") {
      return ResponseHandler.forbidden(c, "Super admin only");
    }
    try {
      await RoleService.removeGlobal(c.req.param("id")!);
      return c.json({ success: true as const, data: null, message: "Deleted global role" });
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  })

  .get("/", requirePermission("role.read"), async (c) => {
    try {
      const tenantId = c.get("tenantId");
      if (!tenantId) return ResponseHandler.unauthorized(c, "Tenant ID required");
      const data = await RoleService.findAll(tenantId);
      return c.json({ success: true, data, message: "Fetched roles" });
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  })

  .get("/:id", requirePermission("role.read"), async (c) => {
    try {
      const tenantId = c.get("tenantId");
      if (!tenantId) return ResponseHandler.unauthorized(c, "Tenant ID required");
      const data = await RoleService.findById(tenantId, c.req.param("id")!);
      if (!data) return ResponseHandler.notFound(c, "Not found");
      return c.json({ success: true, data, message: "Fetched role" });
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  })

  .post("/", requirePermission("role.manage"), zValidator("json", createRoleSchema), async (c) => {
    try {
      const tenantId = c.get("tenantId");
      if (!tenantId) return ResponseHandler.unauthorized(c, "Tenant ID required");
      const body = c.req.valid("json");
      const data = await RoleService.create(tenantId, body);
      return c.json({ success: true, data, message: "Created role" }, 201);
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  })

  .put("/:id", requirePermission("role.manage"), zValidator("json", updateRoleSchema), async (c) => {
    try {
      const tenantId = c.get("tenantId");
      if (!tenantId) return ResponseHandler.unauthorized(c, "Tenant ID required");
      const body = c.req.valid("json");
      const data = await RoleService.update(tenantId, c.req.param("id")!, body);
      if (!data) return ResponseHandler.notFound(c, "Not found");
      return c.json({ success: true, data, message: "Updated role" });
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  })

  .delete("/:id", requirePermission("role.delete"), async (c) => {
    try {
      const tenantId = c.get("tenantId");
      if (!tenantId) return ResponseHandler.unauthorized(c, "Tenant ID required");
      await RoleService.remove(tenantId, c.req.param("id")!);
      return c.json({ success: true, data: null, message: "Deleted role" });
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  });

export default router;
