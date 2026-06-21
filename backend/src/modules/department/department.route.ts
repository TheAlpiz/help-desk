import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { DepartmentService } from "./department.service";
import { ResponseHandler } from "../../lib/response";
import { authMiddleware, JwtPayload } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import { createDepartmentSchema, updateDepartmentSchema, addDepartmentMemberSchema } from "@help-desk/shared";

const router = new Hono<{ Variables: { tenantId: string; user: JwtPayload } }>()
  .use("*", authMiddleware())

  .get("/", requirePermission("department.read"), async (c) => {
    try {
      const tenantId = c.get("tenantId");
      if (!tenantId) return ResponseHandler.unauthorized(c, "Tenant ID required");
      const data = await DepartmentService.findAll(tenantId);
      return c.json({ success: true, data, message: "Fetched departments" });
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  })

  .get("/:id", requirePermission("department.read"), async (c) => {
    try {
      const tenantId = c.get("tenantId");
      if (!tenantId) return ResponseHandler.unauthorized(c, "Tenant ID required");
      const data = await DepartmentService.findById(tenantId, c.req.param("id")!);
      if (!data) return ResponseHandler.notFound(c, "Not found");
      return c.json({ success: true, data, message: "Fetched department" });
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  })

  .post("/", requirePermission("department.manage"), zValidator("json", createDepartmentSchema), async (c) => {
    try {
      const tenantId = c.get("tenantId");
      if (!tenantId) return ResponseHandler.unauthorized(c, "Tenant ID required");
      const body = c.req.valid("json");
      const data = await DepartmentService.create(tenantId, body);
      return c.json({ success: true, data, message: "Created department" }, 201);
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  })

  .put("/:id", requirePermission("department.manage"), zValidator("json", updateDepartmentSchema), async (c) => {
    try {
      const tenantId = c.get("tenantId");
      if (!tenantId) return ResponseHandler.unauthorized(c, "Tenant ID required");
      const body = c.req.valid("json");
      const data = await DepartmentService.update(tenantId, c.req.param("id")!, body);
      if (!data) return ResponseHandler.notFound(c, "Not found");
      return c.json({ success: true, data, message: "Updated department" });
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  })

  .delete("/:id", requirePermission("department.manage"), async (c) => {
    try {
      const tenantId = c.get("tenantId");
      if (!tenantId) return ResponseHandler.unauthorized(c, "Tenant ID required");
      await DepartmentService.remove(tenantId, c.req.param("id")!);
      return c.json({ success: true, data: null, message: "Deleted department" });
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  })

  .get("/:id/members", requirePermission("department.read"), async (c) => {
    try {
      const tenantId = c.get("tenantId");
      if (!tenantId) return ResponseHandler.unauthorized(c, "Tenant ID required");
      const data = await DepartmentService.listMembers(tenantId, c.req.param("id")!);
      return c.json({ success: true, data, message: "Fetched department members" });
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  })

  .post(
    "/:id/members",
    requirePermission("department.manage"),
    zValidator("json", addDepartmentMemberSchema),
    async (c) => {
      try {
        const tenantId = c.get("tenantId");
        if (!tenantId) return ResponseHandler.unauthorized(c, "Tenant ID required");
        const { userId } = c.req.valid("json");
        const data = await DepartmentService.addMember(tenantId, c.req.param("id")!, userId);
        if (!data) return ResponseHandler.notFound(c, "User not found");
        return c.json({ success: true, data, message: "Added department member" }, 201);
      } catch (error) {
        return ResponseHandler.internalServerError(c, "Internal Server Error", error);
      }
    },
  )

  .delete("/:id/members/:userId", requirePermission("department.manage"), async (c) => {
    try {
      const tenantId = c.get("tenantId");
      if (!tenantId) return ResponseHandler.unauthorized(c, "Tenant ID required");
      await DepartmentService.removeMember(tenantId, c.req.param("id")!, c.req.param("userId")!);
      return c.json({ success: true, data: null, message: "Removed department member" });
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  });

export default router;
