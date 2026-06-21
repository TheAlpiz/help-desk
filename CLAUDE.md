# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Root (Turborepo — runs all workspaces in parallel)
pnpm dev          # start all apps in watch mode
pnpm build        # build all packages in dependency order
pnpm lint         # lint all workspaces

# Backend only (from repo root)
pnpm --filter @help-desk/backend dev
pnpm --filter @help-desk/backend build

# Frontend only
pnpm --filter @help-desk/web dev

# DB migrations (run from backend/)
pnpm drizzle-kit generate   # generate migration from schema changes
pnpm drizzle-kit migrate    # apply pending migrations

# Scaffold backend resources (custom CLI)
npx alpis-cli create:resource <name>   # schema + service + route in one shot
npx alpis-cli create:schema <name>
npx alpis-cli create:service <name>
npx alpis-cli create:route <name>
# Flags: --orm drizzle  --app <appName>  -f  --dry-run
```

## Architecture

**Monorepo layout** (pnpm workspaces + Turborepo):
- `backend/` — Hono + Node.js API server
- `apps/web/` — React SPA (Vite + TanStack Router/Query/Form/Table)
- `packages/shared/` — Zod schemas shared between frontend and backend
- `packages/config/` — shared TypeScript/tooling config

### Backend (`@help-desk/backend`)

**Module structure** — each domain lives in `src/modules/<name>/` with four files:
- `<name>.schema.ts` — Drizzle table definition (source of truth for DB shape)
- `<name>.service.ts` — business logic, no HTTP concerns
- `<name>.route.ts` — Hono router, wires validators → service
- `index.ts` — re-exports the router

**Infra layer** (`src/infra/`):
- `db/index.ts` — Drizzle pool + `withTenantTransaction` / `withSuperAdminTransaction`
- `env.ts` — envalid-validated env (fail-fast on startup)
- `redis/`, `queue/` — Redis client, BullMQ default queue
- `minio.ts` — object storage init

**Multi-tenancy via Postgres RLS** — every tenant-scoped DB call must go through `withTenantTransaction(tenantId, tx => ...)`. This sets `app.current_tenant_id` via `SET LOCAL` so RLS policies enforce isolation. Background workers and super-admin actions use `withSuperAdminTransaction`.

**Middleware chain** (applied in `server.ts`):
1. `tenantMiddleware` — resolves tenant from subdomain or `X-Tenant-ID` header, validates UUID, sets `c.get("tenantId")`
2. `authMiddleware` — verifies JWT, cross-checks `organizationId` against `tenantId`, sets `c.get("user")`
3. `requirePermission(...actions)` — checks user roles (currently stubbed for dev)

**Workers** (`src/workers/`) — BullMQ workers started at boot:
- `email-ingestion.worker.ts` / `email-delivery.worker.ts` — IMAP/SMTP via `imapflow` + `nodemailer`
- `notification.worker.ts` — fan-out notifications
- `sla.worker.ts` — SLA breach detection
- `audit-archival.worker.ts` — nightly cron (2 AM) audit retention sweep
- `mailbox.manager.ts` — singleton that manages all live IMAP connections

**Type-safe API client** — `AppType` is exported from `server.ts`; the frontend imports router types individually per module to avoid TypeScript depth limits, then creates typed `hono/client` instances in `apps/web/src/lib/api.ts`.

### Frontend (`@help-desk/web`)

- **Routing** — TanStack Router (file-based, `src/routes/`). Route tree auto-generated into `src/routeTree.gen.ts` by the Vite plugin — never edit that file manually.
- **Server state** — TanStack Query; all API calls go through the `api.*` object from `src/lib/api.ts`
- **Client state** — Zustand store (`src/store/index.ts`) persisted to `localStorage` (`helpdesk-storage`). Holds `user`, `tenantId`, `accessToken`.
- **Forms** — TanStack Form + `@tanstack/zod-form-adapter`
- **Styling** — Tailwind CSS + shadcn/ui components (`src/components/ui/`)
- **Features** — domain-specific pages live in `src/features/<domain>/` and are imported by route files
- **Vite proxy** — `/api/*` → `http://localhost:3000` in dev, so frontend and backend run independently without CORS config

### Shared package (`@help-desk/shared`)

Zod schemas used by both the backend (`@hono/zod-validator`) and the frontend (form validation). Add new request/response contracts here rather than duplicating in each app.

## Required environment (backend)

Copy `backend/.env.example` (or set directly):
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/help-desk
REDIS_HOST=localhost
REDIS_PORT=6379
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
JWT_SECRET=<secret>
SENTRY_DSN=          # optional
```

Defaults are baked into `env.ts` so most fields are optional in local dev, except `DATABASE_URL`.

This repository contains a production-grade multi-tenant Service Desk SaaS platform.

The system is conceptually similar to Zendesk, Freshdesk and Jira Service Management but built specifically around a modern Node.js architecture.

Claude must always follow the architecture and constraints described in this document.

---

# Core Principles

## Multi-Tenant First

The application is multi-tenant by design.

Every tenant represents an Organization.

Data isolation is a hard requirement.

Never bypass tenant isolation.

Every tenant-owned entity must contain:

* organizationId

Examples:

* Users
* Tickets
* Tasks
* Mailboxes
* Departments
* SLA Policies
* Notifications
* Audit Logs

All tenant-scoped database operations MUST execute through:

```ts
withTenantTransaction(tenantId, ...)
```

Never access tenant data through direct Drizzle queries.

Use:

```ts
withTenantTransaction()
```

or

```ts
withSuperAdminTransaction()
```

only.

---

# Architecture Style

The system follows a Modular Monolith architecture.

Do NOT introduce microservices.

Do NOT create unnecessary abstraction layers.

Each domain module owns:

* schema
* service
* route

Structure:

src/modules/<domain>

Example:

tickets/
tickets.schema.ts
tickets.service.ts
tickets.route.ts
index.ts

Business logic belongs inside services.

Routes should only:

* validate
* authorize
* call services

---

# Domain Modules

Current domains:

* organizations
* users
* auth
* roles
* permissions
* departments
* mailboxes
* tickets
* ticket-messages
* attachments
* tasks
* notifications
* sla
* audit
* reports

Future domains:

* chat-widget
* whatsapp
* telegram
* api-tokens

---

# Ticket Engine Rules

Tickets are the primary business object.

A ticket may be created from:

* Email
* Portal
* API

Future:

* WhatsApp
* Telegram
* Chat Widget

Never couple Ticket Engine directly to Email.

Email is a channel.

Ticket Engine is channel-agnostic.

Allowed statuses:

* Open
* Assigned
* In Progress
* Waiting Customer
* Resolved
* Closed
* Reopened

Allowed priorities:

* Low
* Medium
* High
* Critical

All ticket changes must generate Audit Logs.

---

# Email System

Email is implemented as a communication channel.

Supported protocols:

Incoming:

* IMAP

Outgoing:

* SMTP

Libraries:

* imapflow
* mailparser
* nodemailer

Each organization may own multiple mailboxes.

Examples:

[support@company.com](mailto:support@company.com)
[sales@company.com](mailto:sales@company.com)
[hr@company.com](mailto:hr@company.com)

Ticket threading must use:

1. Message-ID
2. In-Reply-To
3. References

Subject matching:

[TICKET-123]

is fallback only.

Never rely solely on subject matching.

---

# Mailbox Manager

Mailbox connections are managed centrally.

Use:

src/workers/mailbox.manager.ts

Responsibilities:

* connect
* disconnect
* reconnect
* credential rotation
* health checks

Do not create unmanaged IMAP connections.

All listeners must register through MailboxManager.

---

# Queue Architecture

All background work must run through BullMQ.

Examples:

* Email ingestion
* Email delivery
* Notifications
* SLA checks
* Audit archival

Never execute long-running work inside HTTP routes.

Routes enqueue jobs.

Workers execute jobs.

---

# RBAC + ABAC

Authorization uses both RBAC and ABAC.

RBAC examples:

ticket.read
ticket.assign
ticket.reply
ticket.close

task.create
task.update

mailbox.manage

sla.manage

ABAC examples:

Users may only view tickets assigned to them.

Supervisors may view department tickets.

Admins may view organization-wide tickets.

Never place authorization logic inside routes.

Authorization belongs in services and permission middleware.

---

# Audit Logging

Audit logging is mandatory.

All state changes must generate audit events.

Examples:

Ticket assigned
Ticket closed
Task completed
Mailbox updated
Permission changed

Audit records must include:

* actor
* action
* entity
* before
* after
* timestamp

Never delete audit logs directly.

Retention is handled by workers.

---

# File Storage

All file uploads use MinIO.

Supported attachments:

* Ticket attachments
* Email attachments
* Task attachments

Never store files in PostgreSQL.

Only metadata belongs in PostgreSQL.

---

# Frontend Rules

Frontend uses:

* React
* TanStack Router
* TanStack Query
* TanStack Form
* shadcn/ui

Server state:

TanStack Query

Client state:

Zustand

Never call APIs directly.

Always use:

src/lib/api.ts

---

# Shared Contracts

All request and response contracts belong in:

packages/shared

Use Zod.

Never duplicate validation schemas.

Frontend and backend must share contracts.

---

# Testing

All new modules must include tests.

Preferred stack:

* Vitest
* Supertest
* Testcontainers

Required:

* Service tests
* Route tests
* Permission tests

Critical business workflows must have integration tests.

Examples:

Email → Ticket

Ticket → Reply → Email

Ticket Assignment

SLA Violation

Task Completion

---

# Database Rules

Drizzle is the source of truth.

Schema files:

*.schema.ts

Never write raw SQL migrations unless absolutely necessary.

Prefer schema-driven migrations.

Indexes must exist for:

* organizationId
* ticketId
* assigneeId
* mailboxId
* status
* createdAt

---

# Code Generation Rules

When generating code:

1. Follow existing module structure.
2. Reuse shared contracts.
3. Respect tenant isolation.
4. Generate audit logs.
5. Use queues for async work.
6. Avoid duplicate logic.
7. Keep services focused.
8. Prefer composition over inheritance.

Always assume this system is intended to serve hundreds of organizations and thousands of concurrent tickets.

Scalability and maintainability are primary goals.
