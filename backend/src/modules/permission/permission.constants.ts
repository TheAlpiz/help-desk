/**
 * RBAC catalog — single source of truth for permissions and the system-role matrix.
 * Permission strings are "<resource>.<action>". A trailing ".all" variant widens an
 * action from ABAC-scoped (own/department) to organization-wide (see abac.service).
 */

export const PERMISSIONS = {
  // Tickets
  TICKET_READ: "ticket.read", // ABAC-scoped read (own/assigned/department)
  TICKET_READ_ALL: "ticket.read.all", // org-wide read, bypasses ABAC
  TICKET_CREATE: "ticket.create",
  TICKET_UPDATE: "ticket.update",
  TICKET_ASSIGN: "ticket.assign",
  TICKET_REPLY: "ticket.reply",
  TICKET_MERGE: "ticket.merge",
  TICKET_DELETE: "ticket.delete",
  // Tasks
  TASK_READ: "task.read",
  TASK_CREATE: "task.create",
  TASK_UPDATE: "task.update",
  TASK_ASSIGN: "task.assign",
  TASK_REPLY: "task.reply",
  TASK_DELETE: "task.delete",
  // Mailboxes
  MAILBOX_MANAGE: "mailbox.manage",
  // SLA
  SLA_MANAGE: "sla.manage",
  // Users / RBAC admin
  USER_READ: "user.read",
  USER_MANAGE: "user.manage",
  ROLE_MANAGE: "role.manage",
  // Reports / audit
  REPORT_READ: "report.read",
  AUDIT_READ: "audit.read",
} as const;

export type PermissionString = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type SystemRoleName = "REQUESTER" | "AGENT" | "SUPERVISOR" | "ADMIN";

/**
 * System roles seeded into every organization. ADMIN gets the wildcard "*".
 * SUPER_ADMIN is a platform-level globalRole (not an org role) and always resolves to "*".
 */
export const SYSTEM_ROLE_MATRIX: Record<SystemRoleName, { description: string; permissions: string[] }> = {
  REQUESTER: {
    description: "End user. Can open tickets and see only their own.",
    permissions: [PERMISSIONS.TICKET_CREATE, PERMISSIONS.TICKET_READ, PERMISSIONS.TICKET_REPLY],
  },
  AGENT: {
    description: "Support agent. Works tickets assigned to them or in their department.",
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
    ],
  },
  SUPERVISOR: {
    description: "Team lead. Org-wide ticket visibility plus merge and SLA management.",
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
      PERMISSIONS.SLA_MANAGE,
      PERMISSIONS.REPORT_READ,
      PERMISSIONS.USER_READ,
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
