import { Context, Next } from "hono";
import { verify } from "jsonwebtoken";
import { env } from "../infra/env";
import { ResponseHandler } from "../lib/response";

export type JwtPayload = {
  userId: string;
  organizationId: string;
  roleIds: string[];
  globalRole: string;
  departmentIds: string[];
  forcePasswordChange: boolean;
};

export const authMiddleware = () => async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return ResponseHandler.unauthorized(c, "Missing or invalid Authorization header");
  }

  const token = authHeader.substring(7);

  try {
    const payload = verify(token, env.JWT_SECRET) as JwtPayload;

    // Cross-tenant Token Validation Check
    // Compare the token's organizationId to the context's tenantId extracted by tenantMiddleware
    const contextTenantId = c.get("tenantId");
    if (contextTenantId && payload.organizationId !== contextTenantId) {
       return ResponseHandler.forbidden(c, "Token does not belong to this tenant");
    }

    // Guarantee tenantId is always set — fall back to JWT's organizationId if tenant middleware didn't set it
    if (!contextTenantId) {
      c.set("tenantId", payload.organizationId);
    }

    // Pass the user payload into context
    c.set("user", payload);

    await next();
  } catch (err) {
    return ResponseHandler.unauthorized(c, "Token expired or invalid");
  }
};
