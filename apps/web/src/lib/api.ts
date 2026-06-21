import { hc } from "hono/client";
import { useAppStore } from "../store";
import type { ApiResponse } from "@help-desk/backend/src/lib/response";

// ─── Import each router type individually ─────────────────────────────────────
// This is the correct pattern for large Hono apps: import each sub-router's
// type separately to avoid TypeScript hitting its depth/complexity limits
// when inferring a long .route().route().route()... chain.

import type { authRouter } from "@help-desk/backend/src/modules/auth/auth.route";
import type { auditLogRouter } from "@help-desk/backend/src/modules/audit-log/audit-log.route";
import type { slaRouter } from "@help-desk/backend/src/modules/sla/sla.route";
import type { taskRouter } from "@help-desk/backend/src/modules/task/task.route";
import type { ticketRouter } from "@help-desk/backend/src/modules/ticket/ticket.route";
import type userRouter from "@help-desk/backend/src/modules/user/user.route";
import type roleRouter from "@help-desk/backend/src/modules/role/role.route";
import type permissionRouter from "@help-desk/backend/src/modules/permission/permission.route";
import type organizationRouter from "@help-desk/backend/src/modules/organization/organization.route";
import type departmentRouter from "@help-desk/backend/src/modules/department/department.route";
import type mailboxRouter from "@help-desk/backend/src/modules/mailbox/mailbox.route";
import type { analyticsRouter } from "@help-desk/backend/src/modules/analytics/analytics.route";

// ─── Auth-injecting fetch ─────────────────────────────────────────────────────

const customFetch = async (input: RequestInfo | URL, requestInit?: RequestInit) => {
  const state = useAppStore.getState();
  const headers = new Headers(requestInit?.headers);

  if (state.tenantId) {
    headers.set("X-Tenant-ID", state.tenantId);
  }
  if (state.accessToken) {
    headers.set("Authorization", `Bearer ${state.accessToken}`);
  }

  const res = await fetch(input, { ...requestInit, headers });

  if (res.status === 401) {
    state.logout();
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?returnTo=${returnTo}`;
  }

  return res;
};

const opts = { fetch: customFetch };

// ─── Per-module typed clients ─────────────────────────────────────────────────
// Each client is individually typed from its own router, giving full autocomplete
// and type-safety for inputs and outputs.

const auths = hc<typeof authRouter>("/api/auths/", opts);
const auditLogs = hc<typeof auditLogRouter>("/api/auditLogs/", opts);
const slas = hc<typeof slaRouter>("/api/slas/", opts);
const tasks = hc<typeof taskRouter>("/api/tasks/", opts);
const tickets = hc<typeof ticketRouter>("/api/tickets/", opts);
const users = hc<typeof userRouter>("/api/users/", opts);
const roles = hc<typeof roleRouter>("/api/roles/", opts);
const permissions = hc<typeof permissionRouter>("/api/permissions/", opts);
const organizations = hc<typeof organizationRouter>(
  "/api/organizations/",
  opts,
);
const departments = hc<typeof departmentRouter>("/api/departments/", opts);
const mailboxes = hc<typeof mailboxRouter>("/api/mailboxes/", opts);
const analytics = hc<typeof analyticsRouter>("/api/analytics/", opts);

// ─── Unified api object ───────────────────────────────────────────────────────

export const api = {
  auths,
  auditLogs,
  slas,
  tasks,
  tickets,
  users,
  roles,
  permissions,
  organizations,
  departments,
  mailboxes,
  analytics,
};
