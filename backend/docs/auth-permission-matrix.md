# Auth — Architecture & Permission Matrix

## Authentication

| Flow | Endpoint | Mechanism |
|---|---|---|
| Login | `POST /auth/login` | argon2 verify → JWT access (15m) + opaque refresh token; a `session` row is created storing **only** the SHA-256 hash of the refresh token |
| Refresh (rotating) | `POST /auth/refresh` | Looks up session by token hash (must be un-revoked + unexpired), **revokes it**, issues a fresh access+refresh pair |
| Logout | `POST /auth/logout` | Revokes the session for the presented refresh token |
| Session listing | `GET /auth/sessions` | Lists the caller's sessions (UA, IP, created, expiry, revoked) |
| Session revocation | `DELETE /auth/sessions/:id`, `DELETE /auth/sessions` | Revoke one / all sessions for the user |
| Password reset request | `POST /auth/forgot-password` | Creates single-use token in Redis (`pwreset:<sha256>`, TTL 1h); **always 200** (no user enumeration) |
| Password reset | `POST /auth/reset-password` | Consumes token, sets new hash, **revokes all sessions**, invalidates permission cache |
| Email verification request | `POST /auth/request-verification` | Single-use token in Redis (`verify:<sha256>`, TTL 24h) |
| Email verification | `POST /auth/verify-email` | Consumes token, sets `user.email_verified_at` |

**Token storage:** access token = stateless JWT (`userId`, `organizationId`, `globalRole`, `departmentId`, `roleIds`). Refresh token = opaque random; only its hash is persisted, so a DB leak cannot reconstruct live tokens. Reset/verify tokens live in Redis and self-expire.

**Cross-tenant guard:** `authMiddleware` rejects a token whose `organizationId` ≠ the tenant resolved from the subdomain/header.

## Authorization

### RBAC (coarse — "may this action happen at all?")
- `requirePermission(...)` middleware resolves the user's effective permissions (union over assigned roles via `user_role` → `permission`), cached in Redis (`perms:<tenant>:<user>`, 300s, invalidated on password reset / role change).
- `globalRole` `SUPER_ADMIN` / `ORG_ADMIN` ⇒ wildcard `*`. The seeded `ADMIN` org role also holds `*`.

### ABAC (fine — "which rows?") — `abac.service.ts`
Applied in services, never routes. For tickets:
- **ownership**: `ticket.requesterId === user`
- **assignee**: `ticket.assigneeId === user`
- **department**: `ticket.departmentId === user.departmentId`
- Holding `ticket.read.all` (or `*`) lifts row scoping to org-wide.

`findAll` adds a SQL `OR` filter of the above; `findById` re-checks the loaded row (`canViewTicket`).

## Permission Matrix (seeded system roles)

| Permission | REQUESTER | AGENT | SUPERVISOR | ADMIN | SUPER_ADMIN |
|---|:--:|:--:|:--:|:--:|:--:|
| ticket.create | ✅ | ✅ | ✅ | ✅ | ✅ |
| ticket.read (ABAC-scoped) | ✅ (own) | ✅ (own/assigned/dept) | ✅ | ✅ | ✅ |
| ticket.read.all (org-wide) | — | — | ✅ | ✅ | ✅ |
| ticket.update | — | ✅ | ✅ | ✅ | ✅ |
| ticket.reply | ✅ | ✅ | ✅ | ✅ | ✅ |
| ticket.assign | — | ✅ | ✅ | ✅ | ✅ |
| ticket.merge | — | — | ✅ | ✅ | ✅ |
| ticket.delete | — | — | — | ✅ | ✅ |
| task.read | — | ✅ | ✅ | ✅ | ✅ |
| task.create | — | ✅ | ✅ | ✅ | ✅ |
| task.update | — | ✅ | ✅ | ✅ | ✅ |
| task.assign | — | ✅ | ✅ | ✅ | ✅ |
| task.reply | — | ✅ | ✅ | ✅ | ✅ |
| task.delete | — | — | ✅ | ✅ | ✅ |
| mailbox.manage | — | — | — | ✅ | ✅ |
| sla.manage | — | — | ✅ | ✅ | ✅ |
| user.read | — | — | ✅ | ✅ | ✅ |
| user.manage | — | — | — | ✅ | ✅ |
| role.manage | — | — | — | ✅ | ✅ |
| report.read | — | — | ✅ | ✅ | ✅ |
| audit.read | — | — | — | ✅ | ✅ |

`SUPER_ADMIN` is a platform-level `globalRole` (wildcard), not an org role. `ADMIN` is seeded with `*` per tenant.
