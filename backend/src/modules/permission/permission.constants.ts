/**
 * RBAC catalog — single source of truth for permissions and the system-role matrix.
 * Permission strings are "<resource>.<action>". A trailing ".all" variant widens an
 * action from ABAC-scoped (own/department) to organization-wide (see abac.service).
 *
 * Every string here must correspond to a `requirePermission(...)` guard on a real
 * endpoint. Keep this list and the route guards in lock-step.
 */

export const PERMISSIONS = {
  // Tickets — modules/ticket, macros + automations reuse ticket.read / ticket.update
  TICKET_READ: "ticket.read", // ABAC-scoped read (own/assigned/department)
  TICKET_READ_ALL: "ticket.read.all", // org-wide read, bypasses ABAC
  TICKET_CREATE: "ticket.create",
  TICKET_UPDATE: "ticket.update",
  TICKET_ASSIGN: "ticket.assign",
  TICKET_REPLY: "ticket.reply",
  TICKET_MERGE: "ticket.merge",
  TICKET_DELETE: "ticket.delete",
  // Tasks — modules/task
  TASK_READ: "task.read",
  TASK_CREATE: "task.create",
  TASK_UPDATE: "task.update",
  TASK_ASSIGN: "task.assign",
  TASK_REPLY: "task.reply",
  TASK_DELETE: "task.delete",
  // Attachments — modules/attachment (only delete is gated; list/upload/download are auth-only)
  ATTACHMENT_DELETE: "attachment.delete",
  // Mailboxes — modules/mailbox
  MAILBOX_MANAGE: "mailbox.manage",
  // SLA — modules/sla (policies + escalation rules)
  SLA_MANAGE: "sla.manage",
  // Departments — modules/department
  DEPARTMENT_READ: "department.read",
  DEPARTMENT_MANAGE: "department.manage",
  // Users — modules/user
  USER_READ: "user.read",
  USER_CREATE: "user.create",
  USER_UPDATE: "user.update",
  USER_DELETE: "user.delete",
  // Roles / permissions admin — modules/role, modules/permission
  ROLE_READ: "role.read",
  ROLE_MANAGE: "role.manage", // create/update roles + manage permission catalog
  ROLE_DELETE: "role.delete",
  // Organization settings — modules/organization (business hours, branding, retention)
  ORGANIZATION_MANAGE: "organization.manage",
  // Email — modules/email (branding, templates, approvals, signatures)
  BRANDING_MANAGE: "branding.manage",
  TEMPLATE_MANAGE: "template.manage",
  TEMPLATE_APPROVE: "template.approve",
  SIGNATURE_MANAGE_OWN: "signature.manage_own", // personal signature only
  SIGNATURE_MANAGE: "signature.manage", // org/dept signatures + rules (admin)
  // Analytics / export / audit — modules/analytics, modules/export, modules/audit-log
  ANALYTICS_VIEW: "analytics.view", // dashboards + reports
  EXPORT_READ: "export.read",
  AUDIT_READ: "audit.read",
} as const;

export type PermissionString = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type SystemRoleName = "REQUESTER" | "AGENT" | "SUPERVISOR" | "ADMIN";

/**
 * System roles seeded into every organization. ADMIN gets the wildcard "*".
 * SUPER_ADMIN is a platform-level globalRole (not an org role) and always resolves to "*".
 *
 * These lists are also unioned in live (see PermissionService.getEffectivePermissions),
 * so changing a role here grants/revokes for existing users by globalRole without re-seeding.
 */
export const SYSTEM_ROLE_MATRIX: Record<SystemRoleName, { description: string; permissions: string[] }> = {
  REQUESTER: {
    description: "End user. Can open tickets and see only their own.",
    permissions: [PERMISSIONS.TICKET_CREATE, PERMISSIONS.TICKET_READ, PERMISSIONS.TICKET_REPLY],
  },
  AGENT: {
    description: "Support agent. Works tickets/tasks assigned to them or in their department.",
    permissions: [
      PERMISSIONS.TICKET_READ,
      PERMISSIONS.TICKET_CREATE,
      PERMISSIONS.TICKET_UPDATE,
      PERMISSIONS.TICKET_REPLY,
      PERMISSIONS.TICKET_ASSIGN,
      PERMISSIONS.TASK_READ,
      PERMISSIONS.TASK_CREATE,
      PERMISSIONS.TASK_UPDATE,
      PERMISSIONS.TASK_ASSIGN,
      PERMISSIONS.TASK_REPLY,
      PERMISSIONS.ATTACHMENT_DELETE,
      PERMISSIONS.USER_READ, // assignee pickers (tickets/tasks) call GET /users
      PERMISSIONS.ANALYTICS_VIEW, // dashboard + reports view
      PERMISSIONS.SIGNATURE_MANAGE_OWN,
    ],
  },
  SUPERVISOR: {
    description: "Team lead. Org-wide ticket visibility plus merge, SLA, exports and audit.",
    permissions: [
      PERMISSIONS.TICKET_READ_ALL,
      PERMISSIONS.TICKET_READ,
      PERMISSIONS.TICKET_CREATE,
      PERMISSIONS.TICKET_UPDATE,
      PERMISSIONS.TICKET_REPLY,
      PERMISSIONS.TICKET_ASSIGN,
      PERMISSIONS.TICKET_MERGE,
      PERMISSIONS.TASK_READ,
      PERMISSIONS.TASK_CREATE,
      PERMISSIONS.TASK_UPDATE,
      PERMISSIONS.TASK_ASSIGN,
      PERMISSIONS.TASK_REPLY,
      PERMISSIONS.TASK_DELETE,
      PERMISSIONS.ATTACHMENT_DELETE,
      PERMISSIONS.SLA_MANAGE,
      PERMISSIONS.ANALYTICS_VIEW,
      PERMISSIONS.EXPORT_READ,
      PERMISSIONS.AUDIT_READ,
      PERMISSIONS.USER_READ,
      PERMISSIONS.DEPARTMENT_READ,
      PERMISSIONS.SIGNATURE_MANAGE_OWN,
    ],
  },
  ADMIN: {
    description: "Organization administrator. Full access within the tenant.",
    permissions: ["*"],
  },
};

/** Parse "resource.action" -> { resource, action }. */
export function splitPermission(p: string): { resource: string; action: string } {
  const idx = p.indexOf(".");
  return idx === -1
    ? { resource: p, action: "*" }
    : { resource: p.slice(0, idx), action: p.slice(idx + 1) };
}
