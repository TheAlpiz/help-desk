import type { Context } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import crypto from "crypto";
import { env } from "../infra/env";

// ─── Cookie names ─────────────────────────────────────────────────────────────
export const REFRESH_COOKIE = "rt";
export const CSRF_COOKIE = "csrf";
export const CSRF_HEADER = "x-csrf-token";

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // keep in sync with auth.service
const isProd = env.NODE_ENV === "production";

// Refresh cookie is scoped to the auth path only, so it is never attached to
// ordinary API requests — it leaves the browser solely for /refresh and /logout.
const REFRESH_PATH = "/api/auths";

const baseCookie = {
  secure: isProd,
  domain: env.COOKIE_DOMAIN || undefined,
  sameSite: "Strict" as const,
};

/** HttpOnly refresh cookie — JS can never read it (XSS-resistant). */
export function setRefreshCookie(c: Context, token: string) {
  setCookie(c, REFRESH_COOKIE, token, {
    ...baseCookie,
    httpOnly: true,
    path: REFRESH_PATH,
    maxAge: Math.floor(REFRESH_TTL_MS / 1000),
  });
}

/** Readable CSRF cookie — client echoes it back in the X-CSRF-Token header. */
export function setCsrfCookie(c: Context): string {
  const csrf = crypto.randomBytes(32).toString("hex");
  setCookie(c, CSRF_COOKIE, csrf, {
    ...baseCookie,
    httpOnly: false,
    path: "/",
    maxAge: Math.floor(REFRESH_TTL_MS / 1000),
  });
  return csrf;
}

export function clearAuthCookies(c: Context) {
  deleteCookie(c, REFRESH_COOKIE, { path: REFRESH_PATH, domain: env.COOKIE_DOMAIN || undefined });
  deleteCookie(c, CSRF_COOKIE, { path: "/", domain: env.COOKIE_DOMAIN || undefined });
}

export function getRefreshToken(c: Context): string | undefined {
  return getCookie(c, REFRESH_COOKIE);
}

/**
 * Double-submit CSRF check: the value in the readable cookie must equal the value
 * echoed in the request header. An attacker on a third-party origin cannot read
 * the cookie (SOP) and therefore cannot forge a matching header. Uses constant-time
 * comparison to avoid timing leaks.
 */
export function verifyCsrf(c: Context): boolean {
  const cookieVal = getCookie(c, CSRF_COOKIE);
  const headerVal = c.req.header(CSRF_HEADER);
  if (!cookieVal || !headerVal) return false;
  const a = Buffer.from(cookieVal);
  const b = Buffer.from(headerVal);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
