import { Hono } from "hono";
import * as argon2 from "argon2";
import { zValidator } from "@hono/zod-validator";
import { UserService } from "./user.service";
import { ResponseHandler } from "../../lib/response";
import { authMiddleware, JwtPayload } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import { inviteUserSchema, updateUserSchema } from "@help-desk/shared";

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

  .get("/", requirePermission("user.read"), async (c) => {
    try {
      const tenantId = c.get("tenantId");
      const data = await UserService.findAll(tenantId);
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
      const data = await UserService.create(tenantId, { ...rest, passwordHash, organizationId: tenantId });
      return ResponseHandler.created(c, data);
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
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
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  });

export default router;
