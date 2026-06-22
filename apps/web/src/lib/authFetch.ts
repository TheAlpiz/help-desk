import { useAppStore } from "../store";
import { api } from "./api";

// ─────────────────────────────────────────────────────────────────────────────
// Central authenticated fetch.
//
//  • Access token is injected from in-memory Zustand state (never localStorage).
//  • Refresh + CSRF tokens travel as cookies (credentials: "include").
//  • On 401 we attempt ONE silent refresh (single-flight, shared across concurrent
//    callers) and replay the original request. If refresh fails, we hard-logout.
// ─────────────────────────────────────────────────────────────────────────────

function readCookie(name: string): string | undefined {
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : undefined;
}

/** Headers for callers that build their own fetch (kept for incremental migration). */
export function authHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  const state = useAppStore.getState();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };
  if (state.accessToken)
    headers["Authorization"] = `Bearer ${state.accessToken}`;
  if (state.tenantId) headers["X-Tenant-ID"] = state.tenantId;
  const csrf = readCookie("csrf");
  if (csrf) headers["X-CSRF-Token"] = csrf;
  return headers;
}

const urlOf = (input: RequestInfo | URL): string =>
  typeof input === "string"
    ? input
    : input instanceof URL
      ? input.pathname
      : input.url;

const isAuthEndpoint = (url: string) => url.includes("/api/auths/");

// ── Single-flight refresh ──────────────────────────────────────────────────────
let refreshPromise: Promise<boolean> | null = null;

/** Attempt to mint a new access token from the refresh cookie. Returns success. */
export function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await api.auths.refresh.$post({ json: {} });
      if (!res.ok) return false;
      const data = await res.json().catch(() => null);
      const token = data && data.success ? data.data.accessToken : undefined;
      if (!token) return false;
      useAppStore.getState().setAccessToken(token);
      return true;
    } catch {
      return false;
    } finally {
      // Clear after the microtask settles so queued callers all see the result.
      setTimeout(() => (refreshPromise = null), 0);
    }
  })();
  return refreshPromise;
}

function forceLogout() {
  const state = useAppStore.getState();
  state.logout();
  if (!window.location.pathname.startsWith("/login")) {
    const returnTo = encodeURIComponent(
      window.location.pathname + window.location.search,
    );
    // reason lets the login page explain why the user landed back there.
    window.location.href = `/login?returnTo=${returnTo}&reason=session-expired`;
  }
}

/** Authenticated fetch with automatic refresh-and-retry. Returns the raw Response. */
export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const url = urlOf(input);
  const build = (): RequestInit => {
    const headers = authHeaders(init.headers as Record<string, string>);
    // Let the browser set the multipart boundary for file uploads.
    if (init.body instanceof FormData) delete headers["Content-Type"];
    return { ...init, credentials: "include", headers };
  };

  let res = await fetch(input, build());

  // Never refresh-loop on the auth endpoints themselves (login/refresh/logout).
  if (res.status === 401 && !isAuthEndpoint(url)) {
    const ok = await refreshAccessToken();
    if (ok) {
      res = await fetch(input, build());
    } else {
      forceLogout();
    }
  }
  return res;
}

/** Convenience wrapper: path is relative to /api, returns parsed body alongside res. */
export async function apiFetch(path: string, init: RequestInit = {}) {
  const res = await authFetch(`/api${path}`, init);
  const body = await res.json().catch(() => null);
  return { res, body };
}

/**
 * Boot rehydration. On a fresh page load the access token is gone (memory-only), so
 * we silently refresh from the cookie and repopulate user/tenant from /auths/me.
 * Returns true if an authenticated session was restored.
 */
export async function bootstrapAuth(): Promise<boolean> {
  const ok = await refreshAccessToken();
  if (!ok) return false;
  try {
    const res = await api.auths.me.$get();
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.success) return false;
    const u = data.data;
    const state = useAppStore.getState();
    state.setUser({
      id: u.id,
      organizationId: u.organizationId,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      globalRole: u.globalRole,
      forcePasswordChange: u.forcePasswordChange,
      emailVerified: !!u.emailVerifiedAt,
    });
    state.setTenantId(u.organizationId);
    return true;
  } catch {
    return false;
  }
}
