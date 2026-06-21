import { Context, Next } from "hono";
import { ResponseHandler } from "../lib/response";
import { JwtPayload } from "./auth.middleware";
import { PermissionService } from "../modules/permission/permission.service";

/**
 * RBAC gate. Allows the request when the authenticated user holds at least one of
 * the required permissions (or the wildcard "*").
 *
 * Fine-grained, row-level decisions (ownership / department / assignee) are ABAC
 * and live in the services — see abac.service.ts. This middleware only answers
 * "may this user perform this kind of action at all?".
 */
export const requirePermission =
  (...requiredPermissions: string[]) =>
  async (c: Context, next: Next) => {
    const user = c.get("user") as JwtPayload | undefined;
    if (!user) return ResponseHandler.unauthorized(c, "Authentication required");

    const userPermissions = await PermissionService.getEffectivePermissions(
      user.organizationId,
      user.userId,
      user.globalRole,
    );

    const allowed =
      userPermissions.includes("*") ||
      requiredPermissions.some((req) => userPermissions.includes(req));

    if (!allowed) {
      return ResponseHandler.forbidden(c, "Insufficient permissions");
    }

    // Expose resolved permissions so services can apply ABAC row scoping.
    c.set("permissions", userPermissions);

    await next();
  };
