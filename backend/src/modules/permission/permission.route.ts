import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { PermissionService } from "./permission.service";
import { ResponseHandler } from "../../lib/response";
import { authMiddleware, JwtPayload } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import { createPermissionSchema, updatePermissionSchema, setRolePermissionsSchema } from "@help-desk/shared";

const router = new Hono<{ Variables: { tenantId: string; user: JwtPayload } }>()
  .use("*", authMiddleware())

  .get("/", requirePermission("role.manage"), async (c) => {
    try {
      return ResponseHandler.ok(c, await PermissionService.findAll(c.get("tenantId")));
    } catch (err: any) {
      return ResponseHandler.internalServerError(c, err.message);
    }
  })

  .get("/by-role/:roleId", requirePermission("role.manage"), async (c) => {
    try {
      const data = await PermissionService.findByRoleId(c.get("tenantId"), c.req.param("roleId") as string);
      return ResponseHandler.ok(c, data);
    } catch (err: any) {
      return ResponseHandler.internalServerError(c, err.message);
    }
  })

  .put("/by-role/:roleId", requirePermission("role.manage"), zValidator("json", setRolePermissionsSchema), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const roleId = c.req.param("roleId") as string;
    try {
      const { entries } = c.req.valid("json");
      const data = await PermissionService.replaceForRole(tenantId, user.userId, roleId, entries);
      return ResponseHandler.ok(c, data);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })

  .get("/:id", requirePermission("role.manage"), async (c) => {
    try {
      const data = await PermissionService.findById(c.get("tenantId"), c.req.param("id") as string);
      if (!data) return ResponseHandler.notFound(c);
      return ResponseHandler.ok(c, data);
    } catch (err: any) {
      return ResponseHandler.internalServerError(c, err.message);
    }
  })

  .post("/", requirePermission("role.manage"), zValidator("json", createPermissionSchema), async (c) => {
    try {
      const body = c.req.valid("json");
      return ResponseHandler.created(c, await PermissionService.create(c.get("tenantId"), body));
    } catch (err: any) {
      return ResponseHandler.internalServerError(c, err.message);
    }
  })

  .put("/:id", requirePermission("role.manage"), zValidator("json", updatePermissionSchema), async (c) => {
    try {
      const body = c.req.valid("json");
      const data = await PermissionService.update(c.get("tenantId"), c.req.param("id") as string, body);
      if (!data) return ResponseHandler.notFound(c);
      return ResponseHandler.ok(c, data);
    } catch (err: any) {
      return ResponseHandler.internalServerError(c, err.message);
    }
  })

  .delete("/:id", requirePermission("role.manage"), async (c) => {
    try {
      await PermissionService.remove(c.get("tenantId"), c.req.param("id") as string);
      return ResponseHandler.ok(c, null);
    } catch (err: any) {
      return ResponseHandler.internalServerError(c, err.message);
    }
  });

export default router;
