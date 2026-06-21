import { Hono } from "hono";
import * as argon2 from "argon2";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { OrganizationService } from "./organization.service";
import { ResponseHandler } from "../../lib/response";
import { withSuperAdminTransaction } from "../../infra/db";
import { authMiddleware, JwtPayload } from "../../middleware/auth.middleware";
import { organization } from "./organization.schema";
import { user } from "../user/user.schema";
import { PermissionService } from "../permission/permission.service";
import {
  createOrganizationSchema,
  provisionOrganizationSchema,
  updateOrganizationSchema,
} from "@help-desk/shared";

// Guard: only platform SUPER_ADMINs may manage tenants across the platform.
const superAdminOnly = (c: any) =>
  (c.get("user") as JwtPayload)?.globalRole === "SUPER_ADMIN";

const router = new Hono<{ Variables: { tenantId: string; user: JwtPayload } }>()
  .use("*", authMiddleware())

  .get("/", async (c) => {
    if (!superAdminOnly(c)) return ResponseHandler.forbidden(c, "Super admin only");
    try {
      const data = await OrganizationService.findAll();
      return c.json({ success: true, data, message: "Fetched organizations" });
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  })

  .get("/:id", async (c) => {
    try {
      const tenantId = c.get("tenantId");
      if (!tenantId) return ResponseHandler.unauthorized(c, "Tenant ID required");
      const data = await OrganizationService.findById(tenantId, c.req.param("id"));
      if (!data) return ResponseHandler.notFound(c, "Not found");
      return c.json({ success: true, data, message: "Fetched organization" });
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  })

  .post("/", zValidator("json", createOrganizationSchema), async (c) => {
    if (!superAdminOnly(c)) return ResponseHandler.forbidden(c, "Super admin only");
    try {
      const body = c.req.valid("json");
      const data = await OrganizationService.create(body);
      return c.json({ success: true, data, message: "Created organization" }, 201);
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  })

  .post("/provision", zValidator("json", provisionOrganizationSchema), async (c) => {
    if (!superAdminOnly(c)) return ResponseHandler.forbidden(c, "Super admin only");
    try {
      const body = c.req.valid("json");
      const email = body.admin.email.toLowerCase().trim();

      const result = await withSuperAdminTransaction(async (tx) => {
        const [dupe] = await tx.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
        if (dupe) throw new Error("An account with this email already exists");

        const [newOrg] = await tx
          .insert(organization)
          .values({
            name: body.org.name,
            domain: body.org.domain,
            status: body.org.status ?? "active",
          })
          .returning();

        await PermissionService.seedSystemRoles(tx, newOrg.id);

        const passwordHash = await argon2.hash(body.admin.password);
        const [newUser] = await tx
          .insert(user)
          .values({
            organizationId: newOrg.id,
            email,
            firstName: body.admin.firstName,
            lastName: body.admin.lastName,
            passwordHash,
            globalRole: "ADMIN",
            status: "active",
          })
          .returning();

        return { organization: newOrg, user: { ...newUser, passwordHash: undefined } };
      });

      return c.json({ success: true, data: result, message: "Tenant provisioned" }, 201);
    } catch (error: any) {
      return ResponseHandler.badRequest(c, error?.message || "Failed to provision tenant");
    }
  })

  .put("/:id", zValidator("json", updateOrganizationSchema), async (c) => {
    try {
      const tenantId = c.get("tenantId");
      if (!tenantId) return ResponseHandler.unauthorized(c, "Tenant ID required");
      const body = c.req.valid("json");
      const data = await OrganizationService.update(tenantId, c.req.param("id"), body);
      if (!data) return ResponseHandler.notFound(c, "Not found");
      return c.json({ success: true, data, message: "Updated organization" });
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  })

  .delete("/:id", async (c) => {
    if (!superAdminOnly(c)) return ResponseHandler.forbidden(c, "Super admin only");
    try {
      await OrganizationService.remove(c.req.param("id"));
      return c.json({ success: true, data: null, message: "Deleted organization" });
    } catch (error) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  });

export default router;
