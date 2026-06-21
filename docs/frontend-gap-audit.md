# Frontend Gap Audit — Service Desk SaaS

Audit of `apps/web` for production readiness vs Zendesk / Freshdesk / Jira Service Management / Intercom.
Scope: missing pages, workflows, components, states, enterprise features. **Not** a visual redesign.

Priority key: **P0** launch blocker · **P1** critical · **P2** important · **P3** future.

---

## 0. What exists today

Routes: `index` (marketing), `login`, `register`, `forgot-password`; `_auth/` shell with
`dashboard`, `tickets` (list + `$ticketId`), `tasks`, `mailboxes`, `notifications`, `reports`,
`users`, `departments`, `roles`, `sla`, `settings`, plus super-admin `tenants`, `global-users`, `global-roles`.

API clients wired: auths, auditLogs, slas, tasks, tickets, users, roles, permissions, organizations, departments, mailboxes.

Confirmed coverage:
- Tickets list: text search + status/priority filter. Detail: reply, status change, priority, assign, reopen, link, internal note, basic SLA mention.
- Tasks: status, due dates, assign, a board concept.
- Reports: recharts charts computed **client-side from `api.tickets`** (backend Analytics endpoints unused).
- Loading skeletons present in several tables (`animate-pulse`).

Structural problems found:
- **`src/components/ui` is empty** — no shared component library. Every modal/table/badge is re-implemented per feature → drift, no reuse. **(P1)**
- **Accessibility essentially absent** — 1 aria/role/tabIndex/keyboard marker in the entire app. **(P1)**
- **No notifications/analytics/attachments API clients** — pages use raw `fetch`, losing type-safety. **(P2)**

---

## 1. Feature Gap Report (per area)

### Authentication
- Have: login, register (now creates org+admin), forgot-password request.
- Missing: **reset-password page** (backend `/reset-password` has no UI) **P0**; **verify-email page** (`/verify-email` endpoint unused) **P0**; **active sessions / device management** (`/auths/sessions` exists, no UI) **P1**; security settings (change password, sign-out-all) **P1**; MFA/2FA **P2**; resend-verification banner **P2**.

### Organization Management
- Have: settings form (name/domain), super-admin tenant provisioning.
- Missing: organization profile/branding (logo, colors, support email) **P1**; org members overview **P2**; subdomain management **P2**; danger zone (deactivate/delete) **P2**; org-level defaults (business hours, timezone, locale) **P1**.

### User Management
- Have: users table, invite (creates user w/ password), edit, role badge.
- Missing: **true invite flow** (email invite + accept, not admin-set password) **P1**; department assignment in UI **P1**; bulk actions (deactivate/role change) **P2**; user detail/profile drawer **P2**; resend invite / pending state **P2**; agent vs requester distinction in UI **P1**.

### Roles & Permissions
- Have: roles table, permission picker, global roles.
- Missing: per-permission ABAC scope toggles (own/dept/all) **P2**; role clone/duplicate **P3**; "who has this role" view **P3**; permission-denied UX when editing system roles **P2**.

### Departments
- Have: CRUD table.
- Missing: department members/agents assignment **P1**; department → mailbox/queue routing **P2**; department lead/SLA defaults **P2**; empty state CTA **P3**.

### Tickets
- Have: list (search/filter), detail (reply, status, priority, assign, reopen, link, internal note).
- Missing: **bulk actions** (multi-select, mass assign/close/tag) **P0**; **saved views / smart queues** **P1**; **merge UI** (backend supports) **P1**; **tags UI** (backend supports) **P1**; **attachments upload/view** **P0**; escalate + transfer (department reassign) **P1**; pagination / infinite scroll **P0**; sort columns **P1**; **activity timeline / audit trail panel** **P1**; macros/canned responses **P1**; ticket templates **P2**; archived tickets view **P2**; rich-text reply editor **P1**; requester/contact panel on detail **P1**; CC/followers **P2**; ticket-to-task conversion **P2**.

### Tasks
- Have: list with status/due/assign, board concept.
- Missing: task detail drawer w/ comments + subtasks (backend has both) **P1**; bulk update **P2**; templates **P3**; workload/capacity view **P2**; kanban DnD (if board is static) **P2**; convert task↔ticket **P3**; due-date reminders surfacing **P2**.

### Mailboxes (IMAP/SMTP)
- Have: mailbox CRUD page (668 lines — most complete).
- Missing: **connection diagnostics / health status** (connected/error/last-sync) **P1**; OAuth connect flow (Gmail/M365) **P1**; credential rotation UX **P2**; activity/sync history **P2**; test-connection button **P1**; per-mailbox routing rules **P2**; mailbox→department mapping **P2**.

### WhatsApp
- Have: **nothing** (listed as core feature; no routes, no API client).
- Missing (all): channel list + connect **P1**; delivery monitoring **P2**; webhook logs **P2**; message templates (WABA-approved) **P2**; session-window indicator **P2**. (Gate behind backend availability.)

### Notifications
- Have: list page (raw fetch), mark read / mark all.
- Missing: **notification preferences** page (per-channel/event; backend `/notifications/preferences` exists) **P1**; notification history/filter **P2**; bell dropdown w/ unread count + realtime **P1**; toast system for transient events **P1**.

### Reports
- Have: client-side charts from tickets.
- Missing: **wire to backend Analytics** (tickets-summary, agent-performance, sla-compliance, task-completion) **P1**; date-range filter **P1**; real export (CSV/PDF) **P1**; report builder **P3**; saved reports **P2**; scheduled reports **P3**; per-agent/department drilldown **P2**.

### SLA
- Have: SLA policy CRUD table.
- Missing: SLA breach dashboard / at-risk queue **P1**; **SLA countdown component** on tickets **P1**; business-hours editor **P1**; escalation rule builder UI **P2**; SLA timeline on ticket detail **P2**.

### Audit Logs
- Have: API client only — **no page**.
- Missing: **audit log viewer** (filter by actor/entity/action/date) **P1**; entity-scoped audit panels **P2**; export **P2** (see compliance).

### Settings
- Have: org settings form.
- Missing: settings hub/nav (org, security, notifications, members, billing, branding, API, data) **P1**; personal profile/preferences (theme, locale, timezone) **P2**.

### Billing
- Have: nothing.
- Missing: plan/subscription page **P2**; usage metering **P2**; invoices **P2**; payment method **P2**; seat management **P2**. (P1 only if launching paid.)

### Platform Administration (super-admin)
- Have: tenants, global users, global roles.
- Missing: platform dashboard (tenant health, MRR, signups) **P2**; tenant detail (suspend/impersonate/usage) **P1**; impersonation w/ audit **P2**; feature flags per tenant **P3**; platform-wide audit **P2**.

---

## 2. Missing Pages Inventory

| Page | Area | Priority |
|---|---|---|
| Reset password | Auth | P0 |
| Verify email | Auth | P0 |
| Active sessions / devices | Auth/Security | P1 |
| Security settings (change pwd, sign-out-all) | Auth | P1 |
| Accept invitation | Users | P1 |
| Audit log viewer | Audit | P1 |
| Notification preferences | Notifications | P1 |
| Settings hub (nav shell) | Settings | P1 |
| Org branding/profile | Org | P1 |
| SLA breach / at-risk dashboard | SLA | P1 |
| Tenant detail (super-admin) | Platform | P1 |
| Saved views / smart queues | Tickets | P1 |
| Archived tickets | Tickets | P2 |
| Ticket templates | Tickets | P2 |
| Macros / canned responses | Tickets | P1 |
| Automation rules builder | Tickets | P2 |
| Task workload / capacity | Tasks | P2 |
| Mailbox diagnostics / activity | Mailboxes | P1/P2 |
| WhatsApp channels + monitoring + templates | WhatsApp | P1/P2 |
| Report builder / saved / scheduled | Reports | P2/P3 |
| API tokens | Security/Enterprise | P2 |
| Export center | Enterprise | P2 |
| Compliance dashboard | Enterprise | P3 |
| Data retention settings | Enterprise | P2 |
| SSO / SCIM config | Enterprise | P2 |
| Billing / subscription | Billing | P2 |
| Personal profile & preferences | Settings | P2 |
| Customer portal (submit/track tickets) | Portal | P1 if customer-facing |

---

## 3. Missing Workflows

- **Ticket bulk actions** (select → assign/close/tag/delete) — P0
- **Ticket merge** UI (backend ready) — P1
- **Ticket escalate / transfer** (dept reassign) — P1
- **Attachment upload** on reply/create (MinIO; backend ready) — P0
- **Pagination/virtualized lists** for tickets/tasks/users/audit — P0
- **Real invite flow** (email link → set password → join org) — P1
- **Department & role assignment** from user detail — P1
- **Mailbox onboarding** (test connection, OAuth, status) — P1
- **Organization onboarding wizard** (post-register: invite team, connect mailbox, first SLA) — P1
- **Convert ticket ↔ task** — P2/P3
- **WhatsApp setup** — P1 (if in scope)
- **Session revoke / sign-out everywhere** — P1
- **Reset / verify email** end-to-end — P0

---

## 4. Missing Components (build into empty `components/ui`)

P0/P1 foundation:
- **shadcn/ui primitives** (Button, Input, Select, Dialog, Drawer/Sheet, Dropdown, Tooltip, Toast, Tabs, Badge, Checkbox, Table, Skeleton) — consolidate the hand-rolled copies — P1
- **Toast/notification system** — P1
- **Attachment manager** (upload, preview, progress) — P0
- **Rich-text editor** (reply/notes; tiptap) — P1
- **SLA countdown** (live timer, breach color) — P1
- **Bulk action toolbar** (selection bar) — P0
- **Pagination / data-table** wrapper — P0
- **Activity timeline** (ticket/task history + audit) — P1
- **Status & priority badges** (single source) — P1
- **Empty-state component** (icon + copy + CTA) — P1

P2/P3:
- **Command palette** (cmdk) + keyboard shortcuts — P2
- **Global search** (cross-entity) — P2
- **Mention picker** (@user in notes) — P2
- **Saved-filter chips** — P2
- **Queue / mailbox / WhatsApp health widgets** — P2
- **Audit viewer** (filterable) — P1
- **Avatar + presence**, **date-range picker**, **confirm dialog** — P2

---

## 5. Missing States (per module)

- **Empty states**: tickets, tasks, notifications, mailboxes, reports, users, departments, WhatsApp, audit, saved views — most lists lack a designed empty state w/ CTA. Some exist (notifications, global-users). — P1
- **Loading**: skeletons exist in a few tables; missing on detail pages, dashboard, reports, mailboxes. Add progressive + optimistic updates (reply send, status change). — P1
- **Error states**: only inline `error.message`. Need network error w/ retry, permission-denied (403) screen, 404, expired-session redirect to login w/ return-to, empty-response vs error distinction. — **P0** (403/expired) / P1 (rest)
- **Permission states**: nav hides admin items by role but pages don't gate actions or show "no access" gracefully. — P1
- **Offline state**: none (banner + queue retries). — P3

---

## 6. Missing Enterprise Features

| Feature | Priority |
|---|---|
| SSO (SAML/OIDC) config + login | P2 |
| SCIM provisioning management | P2 |
| API token management (create/scope/revoke) | P2 |
| Export center (tickets/audit/users) | P2 |
| Audit export (CSV/JSON, date range) | P2 |
| Data retention policy settings | P2 |
| Compliance dashboard | P3 |
| Legal hold | P3 |
| Org branding (logo/colors/custom domain) | P1 |
| Impersonation w/ audit (super-admin) | P2 |

---

## 7. Accessibility Gaps (target WCAG AA) — P1

- Near-zero ARIA/roles; modals lack `role="dialog"`, focus trap, `Esc` close, return-focus.
- No keyboard nav for tables/menus; no visible focus rings audited.
- Form fields: labels mostly present but no `aria-invalid`/`aria-describedby` on errors.
- Icon-only buttons lack `aria-label`.
- Color-contrast pass needed on muted `text-on-surface-variant/40-50` tokens.
- No skip-to-content; no live region for toasts/async results.

---

## 8. Mobile Gaps — P1/P2

- Sidebar is fixed `w-56`; no responsive collapse / hamburger / bottom nav. — P1
- Tables overflow on small screens (some `hidden md:` columns, but no card fallback). — P1
- Ticket detail two-pane not adapted to mobile stacking. — P1
- No touch targets sizing / swipe actions. — P2
- Dashboard + reports charts not responsive-tested. — P2
- Field-agent quick actions (assign/reply on mobile). — P2

---

## 9. Prioritized Implementation Roadmap

### P0 — Launch blockers
1. Reset-password + verify-email pages (dead-end auth flows today).
2. 403 / expired-session / network-error handling app-wide (with login redirect + return-to).
3. Ticket attachments (upload + view) — core service-desk function.
4. Ticket list pagination (lists will not scale).
5. Ticket bulk actions + selection toolbar.

### P1 — Critical (pre-launch)
- shadcn/ui foundation + Toast system + shared Badge/Table/Dialog (kills duplication).
- Accessibility baseline (dialog roles, focus trap, aria-labels, form aria).
- Responsive shell (mobile nav) + table card fallback.
- Saved views/smart queues, merge UI, tags UI, escalate/transfer, rich-text editor, activity timeline, macros.
- SLA countdown + breach dashboard + business hours.
- Audit log viewer.
- Notification preferences + bell dropdown + toasts.
- Reports wired to backend Analytics + date range + export.
- Real invite flow; department/role assignment in user UI.
- Mailbox health/diagnostics + test connection.
- Settings hub + org branding.
- Onboarding wizard post-register.
- Tenant detail (super-admin).

### P2 — Important
- Command palette + keyboard shortcuts + global search.
- Task detail (comments/subtasks), bulk task update, workload view.
- API tokens, export center, data retention, SSO/SCIM config.
- WhatsApp channels + monitoring + templates (if backend ready).
- Archived/templates/automation for tickets.
- Billing/subscription (if paid launch → promote to P1).
- Saved reports, drilldowns.

### P3 — Future
- Report builder, scheduled reports, compliance dashboard, legal hold.
- Convert ticket↔task, role clone, feature flags, offline mode.

---

### Recommended first sprint (unblocks the most)
1. Stand up `components/ui` with shadcn (Dialog, Toast, Table, Badge, Skeleton, Button, Input, Select).
2. Global error/permission/expired-session boundary + auth-flow pages (reset/verify).
3. Attachments + pagination + bulk toolbar on tickets.
4. Accessibility + responsive shell pass on the new primitives so it propagates everywhere.
