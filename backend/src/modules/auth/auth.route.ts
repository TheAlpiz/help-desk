import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  loginSchema,
  registerSchema,
  refreshSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "@help-desk/shared";
import { AuthService } from "./auth.service";
import { ResponseHandler } from "../../lib/response";
import { authMiddleware, JwtPayload } from "../../middleware/auth.middleware";
import { UserService } from "../user/user.service";
import {
  setRefreshCookie,
  setCsrfCookie,
  clearAuthCookies,
  getRefreshToken,
  verifyCsrf,
} from "../../lib/auth-cookies";

const clientMeta = (c: any) => ({
  userAgent: c.req.header("user-agent"),
  ipAddress: (c.req.header("x-forwarded-for") || "").split(",")[0].trim() || undefined,
});

// Move the refresh token out of the JSON body and into cookies; also (re)issue the
// readable CSRF token. Returns the body-safe payload (access token + user only).
function establishSession<T extends { accessToken: string; refreshToken: string }>(
  c: any,
  result: T,
) {
  setRefreshCookie(c, result.refreshToken);
  setCsrfCookie(c);
  const { refreshToken, ...safe } = result;
  return safe;
}

export const authRouter = new Hono<{ Variables: { tenantId: string; user: JwtPayload } }>()
  .post("/register", zValidator("json", registerSchema), async (c) => {
    const data = c.req.valid("json");
    try {
      const result = await AuthService.register(data, clientMeta(c));
      return ResponseHandler.created(c, establishSession(c, result), "Account created");
    } catch (error: any) {
      return ResponseHandler.badRequest(c, error.message);
    }
  })
  .post("/login", zValidator("json", loginSchema), async (c) => {
    const tenantId = c.get("tenantId");
    const data = c.req.valid("json");
    try {
      const result = await AuthService.login(tenantId, data.email, data.password, clientMeta(c));
      return ResponseHandler.success(c, establishSession(c, result), { message: "Login successful" });
    } catch (error: any) {
      return ResponseHandler.unauthorized(c, error.message);
    }
  })
  .post("/refresh", zValidator("json", refreshSchema), async (c) => {
    const data = c.req.valid("json");
    // Cookie is the source of truth for browsers; body fallback for API clients.
    const token = getRefreshToken(c) ?? data.refreshToken;
    if (!token) return ResponseHandler.unauthorized(c, "Missing refresh token");
    // CSRF: cookie-authenticated state change → require double-submit token.
    if (getRefreshToken(c) && !verifyCsrf(c)) {
      return ResponseHandler.forbidden(c, "Invalid CSRF token");
    }
    try {
      const result = await AuthService.refresh(token, clientMeta(c));
      const { refreshToken, ...safe } = result;
      setRefreshCookie(c, refreshToken);
      setCsrfCookie(c);
      return ResponseHandler.success(c, safe, { message: "Token refreshed" });
    } catch (error: any) {
      // On any refresh failure (incl. reuse detection) clear cookies so the client
      // cannot keep replaying a dead token.
      clearAuthCookies(c);
      return ResponseHandler.unauthorized(c, error.message);
    }
  })
  .post("/logout", zValidator("json", logoutSchema), async (c) => {
    const data = c.req.valid("json");
    const token = getRefreshToken(c) ?? data.refreshToken;
    if (getRefreshToken(c) && !verifyCsrf(c)) {
      return ResponseHandler.forbidden(c, "Invalid CSRF token");
    }
    try {
      const result = token ? await AuthService.logout(token) : { success: true };
      clearAuthCookies(c);
      return ResponseHandler.ok(c, result);
    } catch (error: any) {
      clearAuthCookies(c);
      return ResponseHandler.badRequest(c, error.message);
    }
  })
  .post("/logout-all", authMiddleware(), async (c) => {
    const user = c.get("user");
    try {
      const result = await AuthService.revokeAllSessions(user.organizationId, user.userId);
      clearAuthCookies(c);
      return ResponseHandler.ok(c, result);
    } catch (error: any) {
      return ResponseHandler.badRequest(c, error.message);
    }
  })
  .post("/forgot-password", zValidator("json", forgotPasswordSchema), async (c) => {
    const tenantId = c.get("tenantId");
    const data = c.req.valid("json");
    // Always 200 — never reveal whether the email exists.
    const result = await AuthService.requestPasswordReset(data.email, tenantId);
    return ResponseHandler.ok(c, result);
  })
  .post("/reset-password", zValidator("json", resetPasswordSchema), async (c) => {
    const data = c.req.valid("json");
    try {
      const result = await AuthService.resetPassword(data.token, data.password);
      return ResponseHandler.ok(c, result);
    } catch (error: any) {
      return ResponseHandler.badRequest(c, error.message);
    }
  })
  .post("/verify-email", zValidator("json", verifyEmailSchema), async (c) => {
    const data = c.req.valid("json");
    try {
      const result = await AuthService.verifyEmail(data.token);
      return ResponseHandler.ok(c, result);
    } catch (error: any) {
      return ResponseHandler.badRequest(c, error.message);
    }
  })
  // --- Authenticated endpoints ---
  .post("/request-verification", authMiddleware(), async (c) => {
    const user = c.get("user");
    try {
      const result = await AuthService.requestEmailVerification(user.organizationId, user.userId);
      return ResponseHandler.ok(c, result);
    } catch (error: any) {
      return ResponseHandler.badRequest(c, error.message);
    }
  })
  .get("/sessions", authMiddleware(), async (c) => {
    const user = c.get("user");
    try {
      const sessions = await AuthService.listSessions(user.organizationId, user.userId);
      return ResponseHandler.ok(c, sessions);
    } catch (error: any) {
      return ResponseHandler.badRequest(c, error.message);
    }
  })
  .delete("/sessions/:id", authMiddleware(), async (c) => {
    const user = c.get("user");
    const id = c.req.param("id") as string;
    try {
      const result = await AuthService.revokeSession(user.organizationId, user.userId, id);
      return ResponseHandler.ok(c, result);
    } catch (error: any) {
      return ResponseHandler.badRequest(c, error.message);
    }
  })
  .delete("/sessions", authMiddleware(), async (c) => {
    const user = c.get("user");
    try {
      const result = await AuthService.revokeAllSessions(user.organizationId, user.userId);
      return ResponseHandler.ok(c, result);
    } catch (error: any) {
      return ResponseHandler.badRequest(c, error.message);
    }
  })
  .get("/me", authMiddleware(), async (c) => {
    const payload = c.get("user");
    try {
      const found = await UserService.findById(payload.organizationId, payload.userId);
      if (!found) return ResponseHandler.notFound(c, "User not found");
      const { passwordHash, ...safeUser } = found;
      return ResponseHandler.ok(c, safeUser);
    } catch (error: any) {
      return ResponseHandler.internalServerError(c, "Internal Server Error", error);
    }
  });
