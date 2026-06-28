import { hc } from "hono/client";
import { authFetch } from "./authFetch";
import type { ApiResponse } from "@help-desk/backend/src/lib/response";

// Re-export the shared helpers so existing imports can migrate to `@/lib/api`.
export {
  apiFetch,
  authHeaders,
  authFetch,
  bootstrapAuth,
  refreshAccessToken,
} from "./authFetch";

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
import type { notificationRouter } from "@help-desk/backend/src/modules/notification/notification.route";
import type { attachmentRouter } from "@help-desk/backend/src/modules/attachment/attachment.route";
import type { macroRouter } from "@help-desk/backend/src/modules/macro/macro.route";
import type { automationRouter } from "@help-desk/backend/src/modules/automation/automation.route";
import type { slaEscalationRuleRouter } from "@help-desk/backend/src/modules/sla/sla-escalation-rule.route";
import type { messagingRouter } from "@help-desk/backend/src/modules/messaging/messaging.route";
import type { ContactRouter } from "@help-desk/backend/src/modules/contact/contact.route";
import type { noteRouter } from "@help-desk/backend/src/modules/note/note.route";
import type { ticketFilterRouter } from "@help-desk/backend/src/modules/ticket-filter/ticket-filter.route";
import type { githubRouter } from "@help-desk/backend/src/modules/github/github.route";
// ─── Auth-injecting fetch ─────────────────────────────────────────────────────
// All clients route through the shared authFetch: in-memory Bearer token injection,
// credentialed cookies (refresh + CSRF), and single-flight refresh-and-retry on 401.

const opts = { fetch: authFetch };

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
const notifications = hc<typeof notificationRouter>(
  "/api/notifications/",
  opts,
);
const attachments = hc<typeof attachmentRouter>("/api/attachments/", opts);
const macros = hc<typeof macroRouter>("/api/macros/", opts);
const automations = hc<typeof automationRouter>("/api/automations/", opts);
const slaEscalationRules = hc<typeof slaEscalationRuleRouter>(
  "/api/sla-escalation-rules/",
  opts,
);
const conversations = hc<typeof messagingRouter>("/api/conversations/", opts);
const contact = hc<typeof ContactRouter>("/api/contact/", opts);
const notes = hc<typeof noteRouter>("/api/notes/", opts);
const ticketFilters = hc<typeof ticketFilterRouter>("/api/ticket-filters/", opts);
const github = hc<typeof githubRouter>("/api/github/", opts);
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
  notifications,
  attachments,
  macros,
  automations,
  slaEscalationRules,
  conversations,
  contact,
  notes,
  ticketFilters,
  github,
};
