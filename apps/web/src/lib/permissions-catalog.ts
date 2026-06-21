/**
 * The canonical list of all permissions available in the platform.
 * Structured as resource → actions[].
 * Used both in the backend (for validation) and the frontend (for the role builder UI).
 */
export const PERMISSION_CATALOG = [
  {
    resource: "ticket",
    label: "Tickets",
    actions: [
      { action: "read", label: "View tickets" },
      { action: "create", label: "Create tickets" },
      { action: "update", label: "Edit tickets" },
      { action: "delete", label: "Delete tickets" },
      { action: "assign", label: "Assign tickets" },
      { action: "close", label: "Close tickets" },
    ],
  },
  {
    resource: "user",
    label: "Users",
    actions: [
      { action: "read", label: "View users" },
      { action: "create", label: "Invite users" },
      { action: "update", label: "Edit users" },
      { action: "delete", label: "Delete users" },
    ],
  },
  {
    resource: "role",
    label: "Roles",
    actions: [
      { action: "read", label: "View roles" },
      { action: "manage", label: "Create & edit roles" },
      { action: "delete", label: "Delete roles" },
    ],
  },
  {
    resource: "department",
    label: "Departments",
    actions: [
      { action: "read", label: "View departments" },
      { action: "manage", label: "Manage departments" },
    ],
  },
  {
    resource: "sla",
    label: "SLA Policies",
    actions: [
      { action: "read", label: "View SLA policies" },
      { action: "manage", label: "Create & edit SLA policies" },
    ],
  },
  {
    resource: "mailbox",
    label: "Mailboxes",
    actions: [
      { action: "read", label: "View mailboxes" },
      { action: "manage", label: "Manage mailboxes" },
    ],
  },
  {
    resource: "report",
    label: "Reports",
    actions: [
      { action: "read", label: "View reports" },
      { action: "export", label: "Export reports" },
    ],
  },
  {
    resource: "settings",
    label: "Settings",
    actions: [
      { action: "read", label: "View settings" },
      { action: "manage", label: "Manage settings" },
    ],
  },
  {
    resource: "audit_log",
    label: "Audit Logs",
    actions: [{ action: "read", label: "View audit logs" }],
  },
] as const;

export type PermissionEntry = { resource: string; action: string };
