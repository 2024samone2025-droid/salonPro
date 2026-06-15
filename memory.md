# Memory — Operator Console v1 (build kickoff)

Last updated: 2026-06-16

> Prior `memory.md` covered the Settings Expansion session — that state lives in
> `context/SETTINGS-EXPANSION-context.md` (and its `feat/settings-expansion` branch).

## What was built

Step 1 of the SalonPro Operator Console is partially landed (schema artifacts written, migration NOT yet applied):

- **`prisma/schema.prisma`** — added `enum SalonStatus { ACTIVE SUSPENDED }` and a `status SalonStatus @default(ACTIVE)` field on `Salon` (separate axis from `plan`).
- **`prisma/migrations/20260616000000_salon_status/migration.sql`** — `CREATE TYPE "SalonStatus"` + `ALTER TABLE "Salon" ADD COLUMN "status" ... NOT NULL DEFAULT 'ACTIVE'`. The NOT NULL+DEFAULT backfills all existing salons to ACTIVE in the same statement (no separate backfill script).
- **`prisma/migrations/migration_lock.toml`** — created (was missing); `provider = "postgresql"`.
- **`prisma generate`** ran successfully — TS client now knows `status` / `SalonStatus`.
- **`context/operator-console.md`** — appended **§11 Implementation plan (decisions locked)** capturing every architect-session decision. §11 is operative where more specific than §1–§10.

Full plan + live progress tracked in the session task list (8 tasks with dependencies). Spec = `context/operator-console.md`.

## Decisions made (architect session — all locked)

- **Separate Vercel deployment** off the SAME repo, on a **dedicated separate domain `salonpro-ops.com`** (NOT a `*.salonpro.me` subdomain, NOT the apex — apex is owned by the tenant project's Owner login). Same Neon DB, same `src/lib/db.ts` client, shared schema. Separation bought = deployment/host/session/origin, NOT data (same DB on purpose; never a second DB).
- **Same-repo route-leak fix:** `OPERATOR_APP=1` deploy-scoped env var set ONLY on the operator project. Enforced at **middleware** layer, **default-deny**, returns **404** (not 403) unless explicitly set. Infra gate (Vercel Auth/IP allowlist on operator project) + this code gate; neither trusted alone.
- **Operator auth = genuine Auth.js Google OIDC** — separate session stack (own cookie, own secret); NEVER reuse `AUTH_SECRET` / `salonpro_session` / the hand-rolled HMAC-scrypt session.
- **Operator principal = env email allowlist** (no `Operator` table in v1). Audit log stores `operatorEmail` as plain string, no FK. Hard rule: never `Owner`, never `User`. Promote to a table only when a 2nd operator/roles appear.
- **`requireOperator()`** — centralized, default-deny: operator Host + valid OIDC session + email in allowlist.
- **`Salon.status` (ACTIVE|SUSPENDED)** is a separate axis from `plan`. SUSPENDED enforced everywhere a tenant can transact, status-first, derived ONLY from the Host-resolved salon:
  - Authenticated app via `requireAuth`: **403 JSON** for API, **suspended-notice** for pages (intentional asymmetry — staff are entitled to know).
  - **Public booking surface**: checked **before** the `publicBookingEnabled` branch, returns the existing generic **404 "Salon not found"** (no suspended-state leak). Applied to ALL public reads+writes: `/app/book/[subdomain]` page GET, `/api/public/booking/[subdomain]` GET, slots read, booking POST.
- **No salon deletion exposed** ever (Salon cascades hard-delete all child data). Suspend = status flip only.
- **Operator audit log = separate append-only table** (NEVER `ActivityLog`). Fields: id, operatorEmail, action (SUSPEND/REACTIVATE/REVEAL_PII/VIEW_TENANT/…), targetSalonId, reason, metadata (JSON before/after), createdAt. Writer in `lib/operator-audit.ts` mirroring `src/lib/activity.ts`.
- **Transactionality split (key refinement):** best-effort/non-throwing fine for REVEAL_PII and VIEW_TENANT. For **state changes (SUSPEND/REACTIVATE)** the audit row + status flip go in the **SAME transaction** — if the reason can't be recorded, the action does not happen.
- **VIEW_TENANT** defined in the enum but logging **OFF by default** for v1; enabling later is one line, not a migration.
- **PII masked by default** everywhere; reveal is explicit + logged (REVEAL_PII). No bulk client browser.
- **Billing stubbed** — show `plan` + Stripe dashboard link-out, zero new billing code, zero network.

## Problems solved

- Read-only audit (11 dimensions) confirmed: app-level `salonId` isolation only, **no Postgres RLS**, billing fully mocked, no operator console/principal, no `Salon.status`. Grounds the whole build.
- **Caught two gaps the spec underspecified:** (1) same-repo → operator routes physically ship to the tenant deployment too, so Vercel Auth alone is insufficient → needs the `OPERATOR_APP=1` middleware 404 gate. (2) §5 said "enforce in `requireAuth`" but the **public booking surface bypasses `requireAuth` entirely** (`src/middleware.ts:9` passes `/book/` and `/api/public/` through), so suspension MUST also gate public booking or a suspended salon keeps taking appointments.
- `migration_lock.toml` was absent; created it so `prisma migrate` history is well-formed.

## Current state

- Schema + migration files written; Prisma client regenerated. **Migration NOT yet applied to the Neon DB** — deliberately left for the user to trigger (mutates shared DB).
- No git branch created for this work yet. Tree still has in-flight `feat/settings-expansion` WIP. User asked whether to branch off main — **awaiting answer.** No git commands run (an earlier `git status` was interrupted).
- Tasks 2–8 pending; tasks 2 & 3 blocked by task 1 (needs migration applied).

## Next session starts with

1. **Apply the migration**: `npm run db:deploy` (prisma migrate deploy — pending only, no reset). User triggers (shared Neon DB). Then mark task 1 complete.
2. **Branching decision**: branch off main for operator-console work vs. continue in current tree (`feat/settings-expansion` WIP uncommitted).
3. **Step 2**: enforce `SUSPENDED` in `requireAuth` (`src/lib/auth-guard.ts`) — 403 JSON for API, suspended-notice page for page loads. Then step 3 (public booking gate), step 4 (audit table), etc.

## Open questions

- Apply migration now, or wait? (User to trigger / authorize.)
- Branch off main, or keep working in current tree?
- Operator domain `salonpro-ops.com` registration is a real-world action outside the code; assumed handled by user at deploy time.
