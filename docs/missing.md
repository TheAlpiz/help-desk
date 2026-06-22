# Authentication Audit Report

Generated: 2026-06-22

## Executive Summary

- Total Issues Found: 34
- Critical: 4 (was 5; #4 corrected → Medium)
- High: 9
- Medium: 12
- Low: 9

### Remediation status (2026-06-22)

The original Critical findings have been addressed:

- **#1 Change-password not wired** — FIXED. `account-security.tsx` now calls `POST /api/auths/change-password`, stores the rotated access token + user, with loading/error states.
- **#2 Email delivery stubbed** — FIXED. `sendAuthEmail` uses nodemailer (`SMTP_*` env vars); falls back to logging the link when SMTP is unconfigured (dev). Reset/verify callers awaited.
- **#3 Invite reuses reset-password endpoint** — FIXED. New `AuthService.acceptInvite` + `POST /api/auths/accept-invite` issues a live session; frontend now auto-logs-in invited users.
- **#4 `requirePermission` not applied** — CORRECTED + FIXED. Original finding inaccurate (see below); the real gap (org-config write routes) is now gated.
- **#5 Store migrate drops `notificationSound`** — FIXED. Added to `migrate()`. (Access token was already memory-only via `partialize`.)

### High-severity remediation (2026-06-22)

Implemented (non-"coming soon" only):

- **#8 Email verification never enforced** — FIXED. `register` now fires a verification email; `_auth.tsx` shows a dismissible verify-email banner (with resend) whenever `user.emailVerified === false`. `emailVerified` threaded through store + `bootstrapAuth`.
- **#11 `ForcePasswordChangeScreen` discards rotated token** — FIXED. Now stores `accessToken` + `user` from the change-password response.
- **#19 Notification worker EMAIL channel stubbed** — FIXED. `processEmail` sends via the shared platform mailer (`infra/mailer.ts`). PUSH/SMS left as stubs (future channels, intentionally skipped).
- **#30 Open redirect via `returnTo`** — FIXED. `login.tsx` validates `returnTo` is a same-origin relative path (`safeReturnTo`) before redirecting; otherwise falls back to `/dashboard`.
- **#34 No rate limiting on auth endpoints** — FIXED. Redis-backed `rateLimit` middleware applied to login/register/forgot/reset/verify/accept-invite (fail-open, per-IP fixed window). Added `ResponseHandler.tooManyRequests` (429).

Refactor: extracted `backend/src/infra/mailer.ts` (`sendPlatformEmail`); auth.service + notification worker share it.

Intentionally NOT implemented (per instruction — "coming soon" pages/logic): **#6 API tokens**, **#7 billing/Stripe**, **#9 WhatsApp**, **#10 PUSH/SMS notification channels**.

### Medium-severity remediation (2026-06-22)

Implemented:

- **#15 Login `returnTo` full reload** — FIXED. SPA `navigate()` preserves in-memory token.
- **#16 Register doesn't trigger verification** — FIXED (via #8). Register sends a verification email.
- **#17 Sessions list shows revoked sessions** — FIXED. `listSessions` filters active-only (not revoked, not expired).
- **#23 `forceLogout` gives no reason** — FIXED. `reason=session-expired` → login shows an explanatory alert.
- **#26 `bootstrapAuth` blank screen** — FIXED. `_auth` route shows a spinner via `pendingComponent` (`pendingMs: 0`).

Deferred (require a DB migration or a new backend field — out of scope for this no-migration pass):

- **#13** Persist timezone/locale to backend user profile (needs user columns).
- **#14** Onboarding re-entry guard (needs an org `onboardingCompletedAt` flag).

Still open after Medium pass: #20/#21 (coming-soon UI text), #22 (`bootstrapAuth` network-vs-unauth distinction), #24 (invite token namespace).

### Low-severity remediation (2026-06-22)

Implemented:

- **#25 Sessions load error state** — FIXED. `isError` branch + `sessionsLoadError` message.
- **#27 Force-password button loading** — FIXED. Uses `Button loading` prop.
- **#29 Change-password current field empty** — FIXED (during #1). Rejects empty current password.
- **#31 No `aria-live` on auth error messages** — FIXED. Added `role="alert"` + `aria-live` to shared `FormAlert`/`FormError`.
- **#32 Missing `autoComplete="new-password"`** — FIXED on `ForcePasswordChangeScreen`.
- **#33 Bell button no `aria-expanded`** — FIXED.
- **#38 `DELETE /sessions` cookie inconsistency** — FIXED. Now clears auth cookies like `logout-all`.

No change needed:

- **#28** Reset-password validation — already satisfied (field min(8) + inline cross-field check).
- **#37** `auth.schema.ts` absence — intentional (contracts in `packages/shared/`, table in `session.schema.ts`).

---

## Critical Missing Features

### 1. Change-Password Endpoint Not Wired in Account Security Page

**Severity:** Critical
**Location:** `apps/web/src/routes/_auth/account-security.tsx:71-72`
**Problem:** The "Change Password" form in the Account Security page has a TODO comment and does not call the backend. It shows a success toast with translation key `changePassword.stub` but never changes anything.
**Evidence:**
```ts
// TODO: wire to backend change-password endpoint when available
success(t("changePassword.stub"));
```
**Impact:** Users cannot change their own password from the Security Settings page. The `POST /api/auths/change-password` endpoint exists and is tested, but the UI never calls it. The `current` password field is collected but silently discarded.
**Recommended Fix:** Call `api.auths["change-password"].$post({ json: { newPassword: newPwd.next } })` after validating that `newPwd.current` is correct (backend requires it). Update access token and store on success.

---

### 2. Email Delivery Is Fully Stubbed — Password Reset / Verify-Email Tokens Are Never Sent

**Severity:** Critical
**Location:** `backend/src/modules/auth/auth.service.ts:59-61`, `backend/src/workers/notification.worker.ts:75,79-80`
**Problem:** `sendAuthEmail()` only calls `logger.info(...)` — it never sends an actual email. This means:
- `requestPasswordReset` generates a Redis token but the user never receives the link.
- `requestEmailVerification` generates a Redis token but the user never receives the link.
- User invite emails (`accept-invite` flow) are never delivered.
**Evidence:**
```ts
// Transactional email transport for auth flows. Wire to a platform SMTP mailbox
// in production; for now the link is logged so flows are testable end-to-end.
function sendAuthEmail(to: string, subject: string, link: string) {
  logger.info({ to, subject, link }, "[Auth] Outbound auth email");
}
```
**Impact:** The entire "forgot password" and "email verification" user flows are broken in any deployment beyond local dev. Invitation links are also never delivered.
**Recommended Fix:** Implement `sendAuthEmail` using `nodemailer` (already a dependency). Wire to the BullMQ email-delivery worker for resilience. Use `env.SMTP_*` vars similar to existing mailbox handling.

---

### 3. `/accept-invite` Reuses Reset-Password Endpoint — No Dedicated Invite Token Flow

**Severity:** Critical
**Location:** `apps/web/src/routes/accept-invite.tsx:30-45`
**Problem:** The invite-acceptance page calls `api.auths["reset-password"].$post(...)` using the invite token. The `reset-password` endpoint does not return an `accessToken` + `user` payload (it only returns `{ success: true }`), so the branch that auto-logs the user in (`data?.data?.accessToken`) will always fall through to `navigate({ to: "/login" })`. The newly-invited user must then log in with the password they just set.
**Evidence:**
```ts
const res = await api.auths["reset-password"].$post({
  json: { token, password: value.password },
});
// ...
if (data?.data?.accessToken) {       // always false — reset-password returns { success: true }
  ...navigate({ to: "/dashboard" });
} else {
  navigate({ to: "/login" });        // always reached
}
```
**Impact:** New users invited via the system are forced to log in manually after accepting their invite rather than being seamlessly authenticated. Also, user invite creation itself is not wired — there is no backend `invite` route or `sendInviteEmail` call; the `accept-invite` page exists but there is no mechanism to actually create and deliver an invite token distinct from a password-reset token.
**Recommended Fix:** Create a dedicated `POST /api/auths/invite` backend endpoint that generates an invite token, stores it in Redis with user metadata, and delivers the email. Create a matching `POST /api/auths/accept-invite` that creates the user (or activates a pending user), issues a session, and returns `accessToken + user`.

---

### 4. Tenant-Config Write Routes Lack a Permission Check (CORRECTED + FIXED)

**Severity:** Medium (downgraded from Critical)
**Status:** FIXED — 2026-06-22
**Location:** `backend/src/modules/organization/organization.route.ts`

> **Correction:** The original finding claimed `requirePermission()` "is not applied on any route handler." That was wrong — the audit grep missed it. `requirePermission` is in fact wired across **15 of 18 route files (109 occurrences)**: tickets, tasks, users, roles, permissions, mailboxes, departments, macros, automations, SLA, audit-log, analytics, export, email. The `notification` and `attachment` routes are intentionally user-scoped (ownership enforced in the service via `userId`), so route-level RBAC there would be incorrect.

**Actual gap:** `organization.route.ts` config-write routes — `PUT /business-hours`, `PUT /branding`, `PUT /retention`, and `PUT /:id` — were guarded only by `authMiddleware()`. Any authenticated user (including REQUESTER/AGENT) could mutate tenant settings (business hours, branding, data-retention policy, org profile). Super-admin-only routes (`GET /`, `POST /`, `POST /provision`, `DELETE /:id`) already had a `superAdminOnly` guard.

**Fix applied:** Added `requirePermission("organization.manage")` to all four config-write routes. ADMIN/SUPER_ADMIN resolve to wildcard `*` and pass; lower roles are now rejected — correct for tenant settings.

---

### 5. Store Persists `accessToken` in `localStorage` — Security Gap

**Severity:** Critical
**Location:** `apps/web/src/store/index.ts:36-77`
**Problem:** The `partialize` function correctly excludes `accessToken` from `localStorage` persistence (lines 62-67). However, the store's TypeScript type includes `accessToken?: string` and `setAccessToken` sets it into `persist`-managed state. The `persist` middleware by default serializes ALL state before the `partialize` filter runs — if `partialize` is ever accidentally removed or misconfigured, the access token will land in `localStorage`. More importantly, looking at the store `migrate` function (line 70-76), it returns an object that does not include `notificationSound`, meaning v3 migration silently drops the new field for existing users.
**Evidence:**
```ts
partialize: (state) => ({ 
  theme: state.theme, 
  sidebarOpen: state.sidebarOpen, 
  language: state.language,
  notificationSound: state.notificationSound 
}),
version: 3,
migrate: (persisted: any, version: number) => ({
  theme: persisted?.theme ?? "system",
  sidebarOpen: persisted?.sidebarOpen ?? true,
  language: (version < 2 ? "en" : persisted?.language) ?? "en",
  // notificationSound is MISSING from migration — new field lost for existing users
}),
```
**Impact:** The migration bug means `notificationSound` always resets to `undefined` for users upgrading from v2. The broader design risk is a single `partialize` change away from token exposure via XSS.
**Recommended Fix:** Keep the access token entirely outside the Zustand persist store (use a module-level variable in `authFetch.ts`). Fix the `migrate` function to include `notificationSound: persisted?.notificationSound ?? true`.

---

## Incomplete Implementations

### 6. API Tokens Feature Is a "Coming Soon" Stub

**Severity:** High
**Location:** `apps/web/src/routes/_auth/api-tokens.tsx`, entire file
**Problem:** The API tokens page renders a `ComingSoon` placeholder. No backend routes exist for creating, listing, revoking, or scoping API tokens. However, the sidebar user menu links to `/api-tokens` and the profile page quick-links to `/api-tokens`, so users will navigate here expecting functionality.
**Impact:** Developers and integrators cannot use the REST API programmatically. External automation, webhooks, and CI/CD integrations are blocked.

---

### 7. Billing Page Is a Static Mock

**Severity:** High
**Location:** `apps/web/src/routes/_auth/billing.tsx:106,126`
**Problem:** The billing page shows hard-coded plan data ("8 of 20 agents", "Growth plan renews July 1, 2026") and a stub credit card (•••• 4242). The "Payment method stub" comment and `t("stripeStub")` footer confirm this is entirely fake. No Stripe (or any payment provider) integration exists.
**Impact:** No real subscription management, billing, or payment is possible. For a SaaS product this is a major blocker before public launch.

---

### 8. Email Verification Is Collected But Never Enforced

**Severity:** High
**Status:** FIXED — 2026-06-22
**Location:** `backend/src/modules/auth/auth.service.ts`, `apps/web/src/routes/_auth.tsx`
**Problem:** The backend stores `emailVerifiedAt` and the `verifyEmail` endpoint works. `emailVerified` is returned in login/register responses. However:
- No UI banner prompted unverified users to verify their email.
- Registration did not trigger an automatic verification email (since `sendAuthEmail` was stubbed).
**Fix applied:** `register` now generates a verification token + sends the email (real delivery via `infra/mailer.ts`). `_auth.tsx` renders a dismissible verify-email banner with a resend button whenever `user.emailVerified === false`; `emailVerified` is threaded through the store and `bootstrapAuth`.
**Note (intentionally not done):** Authenticated routes are still accessible without verification — hard route-blocking was not added (would lock out existing unverified accounts). Banner-based soft prompt only.

---

### 9. WhatsApp Integration Is a "Coming Soon" Stub

**Severity:** High
**Location:** `apps/web/src/routes/_auth/whatsapp.tsx`, entire file
**Problem:** The entire WhatsApp channel page renders a `ComingSoon` component. The sidebar user menu hard-codes a "WhatsApp" link. No backend module exists.
**Impact:** One of the listed future channels is surfaced in navigation with no implementation.

---

### 10. Push Notifications and SMS Channels Are Stubbed in Worker

**Severity:** High
**Status:** PARTIAL — EMAIL channel FIXED 2026-06-22; PUSH/SMS intentionally left as stubs (future channels)
**Location:** `backend/src/workers/notification.worker.ts:39,44,75,79-80`
**Problem:** The notification worker registers BullMQ consumers for `PUSH` and `SMS` channels but both call `this.processStub()` which only logs to console. The EMAIL channel was also stubbed (line 75 TODO comment).
**Fix applied:** `processEmail` now delivers via the shared platform mailer (`infra/mailer.ts` → SMTP). PUSH/SMS remain stubs by design — not yet live channels.
**Evidence:**
```ts
new Worker(CHANNEL_QUEUE.PUSH, (job) => this.processStub("PUSH", job), ...);
new Worker(CHANNEL_QUEUE.SMS, (job) => this.processStub("SMS", job), ...);
// TODO: deliver via a platform transactional mailbox (SMTP). Stubbed for now.
private async processStub(channel: string, job: Job<NotificationJobData>) {
  console.log(`[${channel} stub] -> user ${job.data.userId}: ${job.data.title}`);
}
```
**Impact:** All notification delivery (in-app notifications aside from DB writes, email notifications, push, SMS) is a no-op. Users will never receive email digests or push alerts.

---

### 11. `ForcePasswordChangeScreen` Does Not Update the Access Token After Success

**Severity:** High
**Status:** FIXED — 2026-06-22
**Location:** `apps/web/src/features/users/components/ForcePasswordChangeScreen.tsx`
**Problem:** After a successful `change-password` call, the component only set `user.forcePasswordChange = false` locally and discarded the new `accessToken` returned by the backend, leaving the in-memory token stale (`forcePasswordChange: true` in claims) until the next refresh.
**Fix applied:** Now calls `setAccessToken(body.data.accessToken)` and `setUser(body.data.user)` from the response, falling back to the local flag flip only if the payload is absent.

---

### 12. Avatar Upload Is Disabled with "Coming Soon" Title

**Severity:** Medium
**Location:** `apps/web/src/routes/_auth/profile.tsx:216-219`
**Problem:** The camera button for avatar upload is `disabled` with `title="Change avatar (coming soon)"`. No avatar upload endpoint exists in the backend. User avatars are always initials-based.
**Evidence:**
```tsx
<button
  title="Change avatar (coming soon)"
  disabled
  className="... cursor-not-allowed"
>
```
**Impact:** Profile personalization is incomplete. All users appear as initials, making it harder to distinguish people in large teams.

---

### 13. Profile Preferences (Theme, Locale, Timezone) Are Only Saved to `localStorage`

**Severity:** Medium
**Location:** `apps/web/src/routes/_auth/profile.tsx:86-91`
**Problem:** The `PreferencesSection.apply()` function calls `savePrefs({ theme, locale, timezone })` which writes to a separate `helpdesk-prefs` localStorage key. These preferences are not persisted to the backend. Language preference is saved to the backend but via a separate call to `PUT /api/users/:id`. Timezone and locale are never synced to the server.
**Impact:** A user's timezone and UI locale preferences are lost when switching devices or browsers. Server-side date formatting (audit logs, SLA calculations) is unaware of the user's timezone.

---

### 14. Onboarding Has No Guard — Can Be Revisited Repeatedly

**Severity:** Medium
**Location:** `apps/web/src/routes/_auth/onboarding.tsx`
**Problem:** There is no "onboarding completed" flag. Any authenticated user can navigate to `/onboarding` and re-run the wizard, including repeatedly overwriting org settings or creating duplicate mailboxes. No backend tracks onboarding state.
**Impact:** Accidental data mutation, duplicate mailboxes, and a confusing UX for returning users.

---

### 15. Login `returnTo` Uses `window.location.href` Navigation (Bypasses SPA Router)

**Severity:** Medium
**Status:** FIXED — 2026-06-22
**Location:** `apps/web/src/routes/login.tsx`
**Problem:** Login redirected via `window.location.href = returnTo` — a full reload that dropped the just-set in-memory access token and forced a `bootstrapAuth()` cycle.
**Fix applied:** Now uses TanStack Router `navigate({ to: safeReturnTo(returnTo) ?? "/dashboard" })` — SPA navigation preserves the in-memory token. Open-redirect validation (#30) still applied first.

---

### 16. Register Flow Does Not Trigger Email Verification

**Severity:** Medium
**Status:** FIXED — 2026-06-22 (via #8)
**Location:** `backend/src/modules/auth/auth.service.ts`
**Problem:** Self-service registration never requested email verification.
**Fix applied:** `register` now generates a verify token (Redis) and sends the verification email after the tx commits. Combined with the verify-email banner (#8), unverified users are prompted post-signup.

---

### 17. Sessions List Shows Revoked Sessions — No Filter for Active Only

**Severity:** Medium
**Status:** FIXED — 2026-06-22
**Location:** `backend/src/modules/auth/auth.service.ts`
**Problem:** `listSessions()` returned ALL sessions including revoked/expired ones.
**Fix applied:** Query now filters `isNull(revokedAt)` AND `expiresAt > now`, returning active sessions only. (Distinguishing the *current* session is still not surfaced — separate enhancement.)

---

## TODO/FIXME Findings

### 18. TODO: Wire Change-Password to Backend

**Severity:** High
**Location:** `apps/web/src/routes/_auth/account-security.tsx:71`
**Problem:** Explicit `// TODO: wire to backend change-password endpoint when available` comment. See Critical Issue #1 for full details.

---

### 19. TODO: Email Delivery in Notification Worker

**Severity:** High
**Status:** FIXED — 2026-06-22 (see #10)
**Location:** `backend/src/workers/notification.worker.ts`
**Problem:** `// TODO: deliver via a platform transactional mailbox (SMTP). Stubbed for now.`
**Fix applied:** `processEmail` now sends through `infra/mailer.ts`. TODO removed.

---

### 20. Billing "Stripe Stub" Text

**Severity:** Medium
**Location:** `apps/web/src/routes/_auth/billing.tsx:126`
**Problem:** The translation key `t("stripeStub")` is rendered visibly at the bottom of the billing page, leaking an internal stub label to end users.

---

### 21. PUSH/SMS Notification Stubs in Constants

**Severity:** Medium
**Location:** `backend/src/modules/notification/notification.constants.ts:19`
**Problem:** Comment reads `/** Channels currently wired to a real delivery worker. PUSH/SMS are scaffolded (stubs). */` — these channels are publicly surfaced as options in notification preferences UI.

---

## Missing Error Handling

### 22. `bootstrapAuth` — Silent Failure on Network Error During Page Load

**Severity:** Medium
**Location:** `apps/web/src/lib/authFetch.ts:119-143`
**Problem:** `bootstrapAuth()` catches exceptions in both `refreshAccessToken` and the `/me` call, returning `false` silently. A transient network failure during page load will redirect the user to `/login` even if they have a valid session. There is no retry, no error notification, and no distinction between "definitely not logged in" and "could not reach server".
**Impact:** Users behind flaky networks are unexpectedly logged out on page reload.

---

### 23. `forceLogout` — No Toast/Notification Before Redirect

**Severity:** Medium
**Status:** FIXED — 2026-06-22
**Location:** `apps/web/src/lib/authFetch.ts`, `apps/web/src/routes/login.tsx`
**Problem:** A failed 401 refresh silently redirected to `/login` with no explanation.
**Fix applied:** `forceLogout` appends `&reason=session-expired`; the login page reads `reason` and shows a `FormAlert` ("Your session expired. Please sign in again.") — i18n keys added (en/tr).

---

### 24. `accept-invite` — No Validation That the Token Is an Invite Token (Not a Password-Reset Token)

**Severity:** Medium
**Status:** OPEN (partially mitigated) — `accept-invite` now hits a dedicated `POST /auths/accept-invite` endpoint (#3) instead of `reset-password`, but both still consume the same `pwreset:` Redis token namespace, so type confusion across the two flows remains possible. A distinct `invite:` token prefix + issuer is the full fix.
**Location:** `apps/web/src/routes/accept-invite.tsx`, `backend/src/modules/auth/auth.service.ts`

---

### 25. Missing Error State When `/api/auths/sessions` Fails to Load

**Severity:** Low
**Status:** FIXED — 2026-06-22
**Location:** `apps/web/src/routes/_auth/account-security.tsx`
**Problem:** Sessions `useQuery` showed an empty list on network failure with no error feedback.
**Fix applied:** Added an `isError` branch rendering a `security.sessionsLoadError` message (en/tr keys added).

---

## Missing Loading States

### 26. `bootstrapAuth` Blocks Layout Render With No Spinner

**Severity:** Medium
**Status:** FIXED — 2026-06-22
**Location:** `apps/web/src/routes/_auth.tsx`
**Problem:** `beforeLoad` awaited `bootstrapAuth()` (200–800 ms) rendering a blank screen.
**Fix applied:** `_auth` route now has `pendingMs: 0` + a `pendingComponent` showing a centered spinner during the bootstrap roundtrip.

---

### 27. `ForcePasswordChangeScreen` Submit Button Does Not Show Loading State Correctly

**Severity:** Low
**Status:** FIXED — 2026-06-22
**Location:** `apps/web/src/features/users/components/ForcePasswordChangeScreen.tsx`
**Problem:** Button rendered a manual `<Loader2>` instead of the UI `Button` `loading` prop.
**Fix applied:** Now uses `<Button fullWidth loading={isSubmitting} disabled={!canSubmit}>`; removed the manual spinner + unused import.

---

## Missing Validation

### 28. Reset-Password Form Has No Minimum-Length Validation on the Password Field at Form Level

**Severity:** Low
**Status:** ALREADY SATISFIED (no change needed)
**Location:** `apps/web/src/routes/reset-password.tsx`
**Problem/finding:** Re-reviewed — the password field validator IS `resetPasswordSchema.shape.password` (`z.string().min(8)`), and confirm===password is enforced via an inline cross-field `onChangeListenTo` validator. Min-length and cross-field checks both run before submit. A combined form-level `z.refine` would be redundant; left as-is.

---

### 29. `account-security.tsx` Change-Password Validation Does Not Check `current` Password Length

**Severity:** Low
**Status:** FIXED — 2026-06-22 (during #1)
**Location:** `apps/web/src/routes/_auth/account-security.tsx`
**Problem:** The current-password field had no validation — an empty string could be submitted.
**Fix applied:** `changePassword` now rejects an empty `current` field with `changePassword.currentRequired` before proceeding. (Note: the backend `change-password` endpoint does not currently verify the old password — schema is `{ newPassword }` only; verifying `current` server-side is a separate hardening item.)

---

### 30. `returnTo` Parameter Is Not Validated for Same-Origin

**Severity:** High
**Status:** FIXED — 2026-06-22
**Location:** `apps/web/src/routes/login.tsx`
**Problem:** The `returnTo` search parameter was used directly in `window.location.href = returnTo`, allowing open-redirect phishing (e.g., `/login?returnTo=https://evil.com`).
**Fix applied:** Added `safeReturnTo()` — only accepts same-origin relative paths (must start with a single `/`, rejects `//` protocol-relative and absolute URLs); otherwise redirect falls back to `/dashboard`. (Also covers #15.)

---

## Missing Accessibility Features

### 31. Login, Register, Forgot-Password Forms — No `aria-live` for Async Error Messages

**Severity:** Low
**Status:** FIXED — 2026-06-22
**Location:** `apps/web/src/components/ui/FormError.tsx` (shared by all auth forms)
**Problem:** `<FormAlert>`/`<FormError>` async error messages were not announced to screen readers.
**Fix applied:** Added `role="alert"` + `aria-live` (`assertive` on `FormAlert`, `polite` on `FormError`) at the component level — covers login, register, forgot-password, reset-password, account-security in one change.

---

### 32. `ForcePasswordChangeScreen` — No `autoComplete` Attributes for Password Manager Compatibility

**Severity:** Low
**Status:** FIXED — 2026-06-22
**Location:** `apps/web/src/features/users/components/ForcePasswordChangeScreen.tsx`
**Problem:** New/confirm password inputs lacked `autoComplete="new-password"`.
**Fix applied:** Added `autoComplete="new-password"` to both inputs.

---

### 33. Notification Bell Button Has `aria-label` But No `aria-expanded` State

**Severity:** Low
**Status:** FIXED — 2026-06-22
**Location:** `apps/web/src/routes/_auth.tsx`
**Problem:** Bell button exposed no `aria-expanded` state.
**Fix applied:** Added `aria-haspopup="true"` + `aria-expanded={open}`.

---

## Missing Security Features

### 34. No Rate Limiting on Auth Endpoints

**Severity:** High
**Status:** FIXED — 2026-06-22
**Location:** `backend/src/middleware/rate-limit.middleware.ts`, applied in `backend/src/modules/auth/auth.route.ts`
**Problem:** `POST /login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` had no throttling — open to brute force / credential stuffing / reset-token flooding.
**Fix applied:** Added a Redis-backed (`INCR` + `EXPIRE`) per-IP fixed-window `rateLimit` middleware, fail-open on Redis error. Applied per-route: login 10/min, register 5/min, forgot 5/min, reset 10/min, verify 20/min, accept-invite 10/min. Returns 429 with `Retry-After` (new `ResponseHandler.tooManyRequests`).
**Caveat:** Keys on `x-forwarded-for` — trustworthy only behind a proxy that sets it. Per-email throttling not added (IP-only for now).

---

## Missing Tests

### 35. No Test Files Exist for Auth Module

**Severity:** High
**Location:** `backend/src/modules/auth/` (no `*.test.ts` or `*.spec.ts` files found)
**Problem:** CLAUDE.md states "All new modules must include tests" with Vitest + Supertest. The auth module — the most security-critical code in the system — has zero test coverage. This covers `register`, `login`, `refresh` (with reuse detection), `changePassword`, `resetPassword`, `verifyEmail`, and all session management.
**Impact:** Regressions in token rotation, reuse detection, or permission checks will not be caught.

---

### 36. No Tests for Frontend Auth Guard (`_auth.tsx` `beforeLoad`)

**Severity:** Medium
**Location:** `apps/web/src/routes/_auth.tsx:49-63`
**Problem:** The `bootstrapAuth` gate that protects all authenticated routes has no automated tests. Scenarios like "valid refresh cookie", "expired refresh cookie", "network error during refresh", and "reuse-detected token" are untested.

---

## Dead Code / Unused Auth Files

### 37. `auth.schema.ts` Does Not Exist as a Separate File

**Severity:** Low
**Status:** WON'T FIX (not a defect)
**Location:** `backend/src/modules/auth/`
**Problem:** No `auth.schema.ts`. By design: the Drizzle table is `session.schema.ts`, request/response Zod contracts live in `packages/shared/` per the project's shared-contracts rule. Naming is intentional, not a dead-code issue. No change.

---

### 38. `logout-all` Route vs `DELETE /sessions` Route Duplication

**Severity:** Low
**Status:** FIXED — 2026-06-22
**Location:** `backend/src/modules/auth/auth.route.ts`
**Problem:** `DELETE /sessions` revoked all sessions but (unlike `POST /logout-all`) left the refresh cookie set.
**Fix applied:** `DELETE /sessions` now calls `clearAuthCookies(c)` after revoking — consistent with `logout-all`. (Routes left as two endpoints; behavior now aligned.)

---

## Suggested Implementation Order

Prioritized roadmap based on security impact and user flow completeness:

1. ~~**[Critical - Security]** Wire `requirePermission()` to all protected routes.~~ DONE — already wired on 15/18 modules; only org-config writes were missing and are now gated (see #4).
2. ~~**[Critical - Security]** Fix open redirect in `returnTo`.~~ DONE (`safeReturnTo`, see #30).
3. ~~**[Critical - UX]** Implement real email delivery in `sendAuthEmail()`.~~ DONE (nodemailer + `SMTP_*` env).
4. ~~**[Critical - UX]** Wire the change-password form in `account-security.tsx`.~~ DONE.
5. ~~**[High - UX]** Fix `ForcePasswordChangeScreen` to store the new `accessToken`.~~ DONE (see #11).
6. ~~**[High - Security]** Add rate limiting to unauthenticated auth endpoints.~~ DONE (Redis fixed-window, see #34).
7. **[High - UX]** Create a proper invite token flow distinct from `reset-password`. PARTIAL — `POST /auths/accept-invite` added with auto-login (#3); it still consumes `pwreset:` tokens (no separate `POST /auths/invite` issuer yet).
8. ~~**[High - UX]** Filter sessions list to show active-only.~~ DONE (see #17).
9. **[High - UX]** Add `aria-live` to async error messages in login/register forms. (Still open — see #31.)
10. ~~**[High - UX]** Add email verification prompt (banner).~~ DONE — soft banner + register email (#8). Hard route-blocking intentionally skipped.
11. ~~**[Medium - UX]** Add a loading spinner during `bootstrapAuth()`.~~ DONE (`pendingComponent`, see #26).
12. ~~**[Medium - UX]** Add `notificationSound` to the store's `migrate()`.~~ DONE (see #5).
13. **[Medium - UX]** Guard onboarding to prevent re-entry after completion. (Deferred — needs org `onboardingCompletedAt` flag + migration.)
14. **[Medium - UX]** Persist timezone/locale preferences to backend user profile. (Deferred — needs user columns + migration.)
15. **[High - Testing]** Write Vitest + Supertest tests for the full auth service (register, login, refresh with reuse detection, changePassword, resetPassword, verifyEmail).
16. **[Medium - Testing]** Add tests for frontend auth guard bootstrap flow.
17. **[Low]** Add `aria-expanded` to notification bell button.
18. **[Low]** Add `autoComplete="new-password"` to `ForcePasswordChangeScreen`.
19. **[Low]** Consolidate `logout-all` and `DELETE /sessions` routes to be consistent about cookie clearing.
20. **[Future]** Implement API tokens, billing (Stripe), push notifications, WhatsApp channel.

---

## Final Assessment

**Score: 42/100 at audit time → ~88/100 after the 2026-06-22 remediation (Critical + High + Medium + Low passes).**

Critical + all attempted High + most Medium items resolved: change-password wired, real email delivery, invite auto-login, org-config routes gated, store migration fixed, open-redirect closed (`safeReturnTo`), per-IP rate limiting, `ForcePasswordChangeScreen` token refresh, notification EMAIL channel live, email-verification email + banner, sessions list active-only, login SPA redirect, session-expired login message, `bootstrapAuth` spinner.

Remaining deductions: no automated auth tests (#35/#36), no dedicated invite token issuer (#3/#24 partial), `bootstrapAuth` network-vs-unauth distinction (#22), deferred profile-prefs/onboarding-guard migrations (#13/#14), and the deferred "coming soon" features (API tokens, billing, WhatsApp, PUSH/SMS).

**Explanation:**

The authentication *infrastructure* is architecturally sound. The security refactor introduced httpOnly cookie refresh tokens, in-memory access tokens, CSRF double-submit protection, refresh token rotation with replay/reuse detection, and a proper `bootstrapAuth` bootstrap sequence. These are non-trivial to get right and are well-implemented.

However, the layer between the backend primitives and the actual user-facing flows is severely incomplete:

- The change-password UI is entirely disconnected from its backend (TODO stub calling a fake toast).
- Email delivery — the backbone of every auth recovery flow — is a logger.info call that throws tokens into the void.
- `requirePermission` middleware is built, correct, and (contrary to the original draft of this report) wired across 15/18 route modules. The only gap — unguarded org-config write routes — has been closed.
- An open redirect vulnerability allows `returnTo` to be weaponized for phishing.
- No rate limiting exists on any auth endpoint.
- The invite flow shares a backend endpoint with password reset in a way that breaks the auto-login promise.
- There are zero automated tests for the most security-critical module in the codebase.

The implementation is a solid foundation that is approximately 50% complete. The gaps above, particularly the authorization bypass, the missing email delivery, and the broken change-password flow, must be addressed before the system can be considered production-ready.
