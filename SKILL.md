---
name: alpis-cli-dev-workflow
description: Professional workspace orchestration for Alpiş Yazılım. Automates alpis-cli commands and enforces the /ui-uix-pro-max styling system with shadcn elements.
---

# Alpiş Yazılım Monorepo Protocol

You are an expert AI agent executing tasks within a Turborepo workspace. The workspace structures applications into an `apps/` directory (containing frontend clients) and backend modules powered by Hono, Drizzle ORM, and PostgreSQL.

## ⚡ Trigger Conditions

- When modifying or scaffolding frontend applications, pages, or components inside the workspace.
- When generating backend modules, routes, schemas, or service architectures.
- When explicitly instructed to use `alpis-cli` or when executing artisan-style backend creation commands.

## 🛠️ Execution Rules

### 1. Frontend Architecture Layer (`/ui-uix-pro-max`)

When generating or modifying frontend code or triggering client-side scaffolding via `alpis-cli`:

- **Command Syntax:** Always append the `/ui-uix-pro-max` modifier to contextual evaluations or prompt instructions.
- **Component Primitives:** Use **shadcn UI** components as the absolute architectural base for layout, buttons, forms, dialogs, and inputs.
- **Data Visualization:** Seamlessly integrate and configure **graphify** whenever data visualization, charts, analytics, or metric reporting views are required.
- **Aesthetic Guidelines:** Apply an expert developer-centric dark theme layout featuring glassmorphism surfaces, vivid neon glows, and a strict palette consisting of electric blue, purple, and white accents. Match any explicit wireframe layouts precisely without compromising spacing, type sizing, or structural parity.

### 2. Backend Resource Management (`alpis-cli`)

When generating domain services, database schemas, or route handlers, you must align code generation with the following `alpis-cli` capabilities:

- For comprehensive feature sets, prefer creating full scopes: `alpis-cli create:resource <name>` (automatically provisions schema, service, route, and indexes).
- For atomic generation, isolate targets via:
  - `alpis-cli create:schema <name>`
  - `alpis-cli create:service <name>`
  - `alpis-cli create:route <name>`
- Maintain configuration visibility by using proper execution flags when necessary:
  - `--app <appName>` to force a specific directory mapping.
  - `--orm drizzle` explicitly to guarantee strict TypeScript typing.
  - `-f` or `--force` when explicit file replacement protocols are ordered.
  - `--dry-run` during verification states to check generated structure pipelines safely.

### 3. Execution Context Isolation

- Run backend resource operations matching standard execution environments from the root workspace configuration or localized project boundaries (e.g., using explicit package execution commands like `npx alpis-cli`).
- Never mix layout instructions belonging to frontend systems into backend routing engines.

## 🚀 Intent Mapping Examples

**IF User Intends:** "Build an automated billing system module with schemas and routes"
**THEN Execute:** Run `npx alpis-cli create:resource billing` to build out the full domain structure under the Hono/Drizzle pipeline.

**IF User Intends:** "Create a modern visual dashboard screen for our tracking application"
**THEN Execute:** Scaffold using `npx alpis-cli` primitives, inject shadcn primitives, implement data layout layers via graphify, and color-profile using the electric blue/purple dark glassmorphic scheme under the `/ui-uix-pro-max` standard.
