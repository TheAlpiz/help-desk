import { Hono } from "hono";
import * as argon2 from "argon2";
import { zValidator } from "@hono/zod-validator";
import { UserService } from "./user.service";
import { DepartmentService } from "../department/department.service";
import { ResponseHandler } from "../../lib/response";
import { authMiddleware, JwtPayload } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import { inviteUserSchema, updateUserSchema, updateAvailabilitySchema } from "@help-desk/shared";
import { wsGateway } from "../../ws/gateway";

const router = new Hono<{ Variables: { tenantId: string; user: JwtPayload } }>()
  .use("*", authMiddleware())

  .get("/global", async (c) => {
    const user = c.get("user");
    if (user.globalRole !== "SUPER_ADMIN") {
      return ResponseHandler.forbidden(c, "Super admin only");
    }
    try {
      const data = await UserService.findAllGlobal();
      return c.json({ success: true as const, data, message: "Fetched global users" });
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  })

  // Presence snapshot — who is online (live WS sockets) + everyone's availability.
  // Auth-only: org presence is visible to all members (Discord-style).
  .get("/presence", async (c) => {
    const tenantId = c.get("tenantId");
    try {
      const availability = await UserService.availabilityMap(tenantId);
      const online = wsGateway.onlineUserIds(tenantId);
      return ResponseHandler.ok(c, { online, availability });
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  })

  // Self-service availability change. Broadcasts presence to the tenant.
  .put("/me/availability", zValidator("json", updateAvailabilitySchema), async (c) => {
    const tenantId = c.get("tenantId");
    const me = c.get("user");
    const { availability } = c.req.valid("json");
    try {
      const updated = await UserService.updateAvailability(tenantId, me.userId, availability);
      if (!updated) return ResponseHandler.notFound(c, "User not found");
      wsGateway.broadcastPresence(tenantId, { userId: me.userId, online: true, availability });
      return ResponseHandler.ok(c, { availability });
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  })

  // Departments the current user belongs to — drives the workspace switcher.
  // Auth-only (no user.read): every member may see their own memberships.
  .get("/me/departments", async (c) => {
    const tenantId = c.get("tenantId");
    const me = c.get("user");
    try {
      const data = await DepartmentService.departmentsOfUser(tenantId, me.userId);
      return ResponseHandler.ok(c, data);
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  })

  .get("/", requirePermission("user.read"), async (c) => {
    try {
      const tenantId = c.get("tenantId");
      const query = c.req.query();
      const limit = Math.min(Number(query.limit) || 50, 100);
      const offset = Number(query.offset) || 0;
      const data = await UserService.findAll(tenantId, {
        search: query.search,
        limit,
        offset,
      });
      return c.json({ success: true as const, data, message: "Fetched users" });
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  })

  .get("/:id", requirePermission("user.read"), async (c) => {
    try {
      const tenantId = c.get("tenantId");
      const data = await UserService.findById(tenantId, c.req.param("id")!);
      if (!data) return ResponseHandler.notFound(c, "Not found");
      return ResponseHandler.ok(c, data);
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  })

  .post("/", requirePermission("user.create"), zValidator("json", inviteUserSchema), async (c) => {
    try {
      const tenantId = c.get("tenantId");
      const { password, ...rest } = c.req.valid("json");
      const passwordHash = await argon2.hash(password);
      const data = await UserService.create(tenantId, { ...rest, passwordHash, organizationId: tenantId, forcePasswordChange: true });
      return ResponseHandler.created(c, data);
    } catch (error: any) {
      return ResponseHandler.badRequest(c, error?.message || "Failed to create user");
    }
  })

  .put("/:id", requirePermission("user.update"), zValidator("json", updateUserSchema), async (c) => {
    try {
      const tenantId = c.get("tenantId");
      const body = c.req.valid("json");
      const data = await UserService.update(tenantId, c.req.param("id")!, body);
      if (!data) return ResponseHandler.notFound(c, "Not found");
      return ResponseHandler.ok(c, data);
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  })

  .delete("/:id", requirePermission("user.delete"), async (c) => {
    try {
      const tenantId = c.get("tenantId");
      await UserService.remove(tenantId, c.req.param("id")!);
      return ResponseHandler.success(c, null, { status: 200 });
    } catch (error: any) {
      return ResponseHandler.badRequest(c, error?.message || "Failed to delete user");
    }
  })

  .get("/:id/departments", requirePermission("user.read"), async (c) => {
    try {
      const tenantId = c.get("tenantId");
      const data = await DepartmentService.memberDepartmentIds(tenantId, c.req.param("id")!);
      return ResponseHandler.ok(c, data);
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  });

export default router;
