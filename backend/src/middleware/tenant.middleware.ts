import { Context, Next } from "hono";
import { OrganizationService } from "../modules/organization/organization.service";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Reserved labels that are never tenant subdomains.
const RESERVED_SUBDOMAINS = new Set(["www", "api", "app", "admin", "localhost"]);

// Small in-memory cache: subdomain -> organization UUID (or null when unknown).
// Avoids a DB round-trip on every request. TTL keeps it eventually consistent
// with org create/rename/delete without a restart.
const CACHE_TTL_MS = 60_000;
const subdomainCache = new Map<string, { id: string | null; expires: number }>();

async function resolveSubdomain(subdomain: string): Promise<string | null> {
  const cached = subdomainCache.get(subdomain);
  if (cached && cached.expires > Date.now()) return cached.id;

  let id: string | null = null;
  try {
    const org = await OrganizationService.findBySubdomain(subdomain);
    if (org && org.status === "active") id = org.id;
  } catch {
    id = null;
  }

  subdomainCache.set(subdomain, { id, expires: Date.now() + CACHE_TTL_MS });
  return id;
}

export const tenantMiddleware = () => async (c: Context, next: Next) => {
  const host = (c.req.header("host") || "").split(":")[0]; // strip port
  const parts = host.split(".");

  let tenantId: string | undefined;

  // Subdomain form: <tenant>.platform.com -> at least 3 labels.
  if (parts.length > 2) {
    const subdomain = parts[0].toLowerCase();
    if (!RESERVED_SUBDOMAINS.has(subdomain)) {
      const resolved = await resolveSubdomain(subdomain);
      if (resolved) tenantId = resolved;
    }
  }

  // Fallback: explicit header for API clients / local dev / tests.
  if (!tenantId) {
    tenantId = c.req.header("X-Tenant-ID");
  }

  // Only accept a valid UUID; otherwise leave tenantId unset so downstream
  // auth/RLS denies by default (no tenant => RLS returns zero rows).
  if (tenantId && UUID_REGEX.test(tenantId)) {
    c.set("tenantId", tenantId);
  }

  await next();
};
