# SalonPro Operator Console — Agent Source of Truth

> **For the implementing agent.** This is the authoritative spec for building the internal
> operator/admin console for SalonPro. Follow it over your own assumptions. It is grounded
> in an audit of the existing repo — file paths cited below are real; verify against the
> current code before changing anything. The tenant-facing product is **already built and
> working**; this document covers only the operator console that sits above all tenants.
>
> **Scale assumption: ~20 tenants.** This is deliberately the small-scale cut. Do NOT build
> for scale the product doesn't have. When in doubt, build less.

---

## 0. The one principle

Every salon-facing screen is scoped to a single tenant by an application-level
`where: { salonId }` filter derived from the request Host. **The operator console is the
one app intentionally allowed to query across all salons without that filter.**

Critically: this app has **no database safety net**. The repo uses app-level isolation
only — there is **no Postgres Row-Level Security** (confirmed: no `ENABLE ROW LEVEL
SECURITY` / `CREATE POLICY` anywhere). So in the tenant app a missed filter leaks data; in
the operator app, querying unscoped is *the whole point*. That makes the separation,
auth, masking, and audit rules below non-negotiable — they are the only protections that
exist. Every rule derives from this.

---

## 1. Existing repo — what to reuse, what is missing

### Stack (do not change)
- Next.js 15 App Router + TypeScript + React 18 (`package.json`)
- Prisma 6 + PostgreSQL on Neon serverless (`prisma/schema.prisma`, `src/lib/db.ts`)
- Deployed on Vercel. No background jobs / queue / cron exist.
- UI: Tailwind 3.4 + shadcn/Radix.

### Reuse these — they already solve half the work
- **Tenant registry = `Salon`** (`prisma/schema.prisma:11-31`). The directory and detail
  pages read this directly. No new core tenant model needed.
- **Apex-domain auth pattern via `Owner`** (`prisma/schema.prisma:199-230`,
  `src/lib/auth.ts`, `src/app/api/owner/*`). `Owner` is a global identity that lives above
  salons, authenticates at the apex/root domain, and hands off across subdomains via
  signed `OneTimeToken` + exchange tokens. **The operator console reuses this apex +
  signed-handoff pattern** — do not reinvent routing/handoff.
- **Per-tenant audit pattern** (`ActivityLog` at `prisma/schema.prisma:275-292`,
  `src/lib/activity.ts`). Reuse the append-only *pattern*, not the table (see §4).
- **Clean separation already preserved**: there is NO `is_admin`/superadmin flag in the
  tenant app — `admin` is strictly a tenant-scoped `User.role`. Keep it that way.

### Missing — this is the build
- `Salon` has **no `status` field** (only `plan: "free" | "pro"`). Lifecycle = plan flip only.
- **`requireAuth` never checks plan or status** (`src/lib/auth-guard.ts`).
- **No platform operator principal** distinct from tenant `Owner`/`User`.
- **No operator app / back office / admin console** of any kind.
- **No operator-level audit log** (`ActivityLog` is per-salon, for owner transparency).
- **Billing is mocked** — `src/lib/stripe.ts` is a placeholder; `checkout` and `webhook`
  routes just flip the `plan` string. The `stripeCustomerId`/`stripeSubscriptionId`
  columns are never written. There is no subscription status/period stored.
- No plans/pricing table, no limits/quota fields, no feature flags, no trial dates.

---

## 2. Console v1 scope (the ENTIRE build — stop here)

Build exactly these six. Nothing else.

1. **Separate operator app, internal-only, behind staff SSO** (see §3).
2. **Tenant directory** — read-only searchable/filterable/sortable list of all salons.
3. **Tenant detail page** — read-only "single pane of glass" for one salon.
4. **`Salon.status` + suspend / reactivate** — enforced in `requireAuth` (see §5).
5. **Operator audit log** — separate append-only table (see §4).
6. **PII masking by default + logged reveal** (see §6).

Billing view is **stubbed** (show `plan` + a link out to Stripe's own dashboard) because
billing is mocked in the repo. Do not build a subscription panel with no real data behind it.

**Impersonation is deferred** for v1 (low value at 20 tenants; you can reproduce most
issues from the DB). The plumbing already exists (`OneTimeToken` handoff) for when it's
needed. If added later: read-only first, persistent banner, time-boxed, logged on entry
AND exit.

---

## 3. Access & separation (the gate — build first, before any other screen)

- **Separate app, not an `is_admin` flag in the salon app.** Preferred: a separate
  deployment on its own internal domain. Acceptable pragmatic alternative for a solo dev:
  an apex-only route group that is *hard-gated* to (a) the apex Host and (b) operator SSO,
  reusing the `Owner` apex pattern — but document this as a deliberate tradeoff, since it
  shares the runtime with the tenant app. Never reachable from a tenant subdomain.
- **Staff SSO.** Authenticate operators via Google Workspace (OIDC). Do not roll custom
  auth for the app that can read every salon's data. An email allowlist is sufficient at
  this scale.
- **New operator principal — NOT `Owner`.** `Owner` is a *customer*. The operator is *your
  staff*. Add a minimal `Operator` record (or allowlist) keyed by SSO email; this identity
  is what the audit log records as the actor. Do not overload `Owner` or `User`.
- **RBAC: skip for v1.** One operator role (you). Add roles (support vs super-admin) only
  when you hire. Do not build a role system now.
- The operator session must be entirely separate from tenant sessions
  (`salonpro_session`). Different cookie, different secret context.

---

## 4. Operator audit log (build day one — cannot be backfilled)

`ActivityLog` is per-salon and scoped by `salonId` for owner transparency. Operator
actions cross tenants and must NOT be written there. Create a separate table.

Required shape (append-only; never updated or deleted):
- `id`
- `operatorEmail` (or `operatorId`) — the staff actor from SSO
- `action` — e.g. `SUSPEND`, `REACTIVATE`, `CHANGE_PLAN`, `REVEAL_PII`, `VIEW_TENANT`
- `targetSalonId`
- `reason` — required for every write/destructive action (typed by the operator)
- `metadata` — JSON, before/after where relevant
- `createdAt`

Reuse the best-effort write pattern from `src/lib/activity.ts`. Log: every write action,
every PII reveal, and (optionally) tenant detail views. The log is the receipt that staff
access to customer data was legitimate.

---

## 5. `Salon.status` + lifecycle (the one schema change everything depends on)

Plan and status are **different axes** — keep them separate:
- `plan` (`free` | `pro`) = what they pay for. Already exists. Leave it.
- `status` (`ACTIVE` | `SUSPENDED`) = whether they can use the product at all. **New.**

Steps:
1. Add `status` enum to `Salon` in `prisma/schema.prisma`, default `ACTIVE`. Migrate;
   backfill existing salons to `ACTIVE`.
2. **Enforce in `requireAuth`** (`src/lib/auth-guard.ts`): after resolving the salon from
   the Host, if `status === SUSPENDED`, block access (reject the request / redirect to a
   "suspended" notice). Today nothing checks this — without the check, the field is inert.
3. Suspend = set `status = SUSPENDED`. Reactivate = set `status = ACTIVE`. Both require a
   typed reason written to the operator audit log.
4. **Suspend NEVER deletes data.** Note the danger in the current schema: `Salon` has
   `onDelete: Cascade` to every child (customers, appointments, payments, etc.
   `schema.prisma:42,64,106,125,153,185,289`), so deleting a `Salon` row hard-deletes ALL
   tenant data. The console must NOT expose salon deletion in v1. Suspend is a status flip
   only.

---

## 6. PII handling (because the data plane holds real client data)

PII is localized — confirmed locations:
- `Customer`: `name`, `phone`, `notes` (free-text; may hold preferences/treatment notes) —
  `prisma/schema.prisma:33-49`. Primary client-PII table.
- `Appointment.notes` (free-text).
- Owner/staff contact: `Owner.email/name`, `User.email/name/phone`.

Rules in operator views:
- Mask PII by default (e.g. `a••••@gmail.com`, `A•••• N•••••`).
- Reveal is an explicit action and is **logged to the operator audit log** (`REVEAL_PII`).
- Minimize what's shown at all — the directory and detail pages need owner contact and
  aggregate counts, not raw client lists. Do not surface bulk client PII in v1.

---

## 7. The two screens (this is the whole UI)

### Screen 1 — Tenant directory (home)
- Top bar: "SalonPro · operator console", marked internal, with the signed-in operator email.
- Metric cards (read from `Salon`): total salons, active, suspended, on pro.
- Search (salon name / subdomain) + status filter (all / active / suspended). Do filtering
  client-side or with a simple query — no analytics engine.
- List/table rows: salon name + subdomain, `plan` badge, `status` badge, owner email (masked).
- Row → opens the detail page.

### Screen 2 — Tenant detail (read-only single pane of glass)
- Header: salon name, subdomain, created date, `status` badge.
- Counts (queried from child tables for that `salonId`): staff, clients, appointments (30d).
- Owner & contact: name + email, **masked**, with logged "reveal".
- Billing row: **stubbed** — show `plan` and "open in Stripe" link-out. No fake subscription data.
- Recent operator actions for this salon (from the operator audit log).
- Actions: `suspend` (red, requires typed reason) / `reactivate`. Impersonate shown as
  deferred/read-only. Every action confirms + writes a reason to the audit log.

(A rendered mockup of both screens accompanies this spec; match its structure.)

---

## 8. Do NOT build (over-engineering for this product / scale)

- **No Postgres RLS now.** It's a separate, large retrofit; app-level isolation works
  today; the operator app intentionally queries unscoped anyway. (Worth doing eventually as
  defense-in-depth, but it is not part of this console.)
- **No multi-location/chain modeling.** Reality: a chain is several `Salon` tenants under
  one `Owner` (via `OwnerSalon`). At 20 tenants, do not refactor. The console may *group
  salons by owner* using `OwnerSalon`, nothing more.
- **No operator RBAC roles, no analytics dashboard** (MRR/churn/cohorts/funnel — you can
  count 20 in your head), **no feature-flag UI, no limits/quota/trial fields, no bulk
  actions, no background jobs, no plans/pricing table.**
- **No real Stripe integration as part of this work** — keep the billing view stubbed
  until real billing volume justifies wiring Stripe; handle the rare billing event in
  Stripe's own dashboard.
- **No trust & safety / moderation / ML / anomaly detection / admin API / SCIM / session
  replay.** Not applicable at this profile.

Each deferred item returns only when its trigger fires (you hire → RBAC + MFA; real money
flows → Stripe + billing actions; a contract demands it → SSO/SCIM/export tooling). Build
when the manual workaround hurts, not before.

---

## 9. Definition of done (v1)

- [ ] Operator app is separate + internal-only + behind staff SSO; never reachable from a tenant subdomain
- [ ] Operator principal exists, distinct from `Owner`/`User`; identity sourced from SSO
- [ ] Operator audit log table exists; every write + PII reveal is recorded with actor, target, reason, timestamp
- [ ] `Salon.status` added, migrated, backfilled; **`requireAuth` blocks suspended salons**
- [ ] Suspend / reactivate work via status flip + typed reason; no deletion exposed
- [ ] Tenant directory: search, status filter, metric cards, rows → detail
- [ ] Tenant detail: counts, owner contact (masked + logged reveal), stubbed billing, per-salon audit, actions
- [ ] PII masked by default everywhere; reveal logged
- [ ] No item from §8 was built

When these are checked, **stop**. Let the actions you find yourself doing by hand in the DB
be the only signal for what to build next.

---

## 10. Anti-patterns (hard stops)

- Do NOT add an `is_admin`/superadmin flag to the tenant app.
- Do NOT overload `Owner` or `User` to represent platform staff.
- Do NOT write operator actions into the per-salon `ActivityLog`.
- Do NOT add a `status` field without also enforcing it in `requireAuth`.
- Do NOT expose salon deletion (cascade hard-deletes all tenant data).
- Do NOT show raw client PII by default; do NOT add a bulk client browser.
- Do NOT build RLS, multi-location, RBAC, analytics, or Stripe as part of this console.
- Do NOT polish this as a customer feature — it has zero customer-facing value; the
  cheapest version that is *safe and auditable* is the correct version.

---

## 11. Implementation plan — decisions locked (architect session, 2026-06-16)

These refine §1–§10 with the concrete calls made before building. Where this section
and the prose above differ in specificity, this section is the operative version.

### Infra & access (the gate)
- **Separate Vercel deployment**, off the **same repo**, on a **dedicated separate domain
  `salonpro-ops.com`** (NOT a `*.salonpro.me` subdomain, NOT the apex — the apex is owned
  by the tenant project's `Owner` login). Same Neon `DATABASE_URL`/`DIRECT_URL`, same
  Prisma client (`src/lib/db.ts`), shared schema. The separation bought is
  deployment/host/session/origin — **NOT data**. Same database on purpose; never a second DB.
- **Same-repo route leak fix:** an `OPERATOR_APP=1` deploy-scoped env var, set ONLY on the
  operator project. Enforced at the **middleware** layer, **default-deny**, returning **404**
  (not 403 — the tenant deployment must not admit operator routes exist) unless the var is
  explicitly set. Covers the operator route group, the Auth.js handlers, and anything added
  later. Infra gate (Vercel Authentication / IP allowlist on the operator project) and this
  code gate are both required; neither is trusted alone.
- **Operator auth = genuine Auth.js Google OIDC**, a separate session stack: its own cookie,
  its own secret — never `AUTH_SECRET` / `salonpro_session`. The hand-rolled HMAC/scrypt
  session is never extended to operators.
- **Operator principal = env email allowlist** (no `Operator` table for v1). Audit log stores
  `operatorEmail` as a plain string, no FK. Hard rule: this identity is never `Owner`, never
  `User`. Promote to an `Operator` table only when a 2nd operator or roles appear.
- **`requireOperator()`** — centralized, default-deny: validates Host is the operator host
  + a valid OIDC session + email in the allowlist.

### Lifecycle: `Salon.status`
- `status` (`ACTIVE | SUSPENDED`, Prisma enum, default `ACTIVE`) is a **separate axis** from
  `plan`. Migrate; backfill existing rows to `ACTIVE`.
- **Suspension means the product is OFF on every transacting surface, status-first, derived
  only from the Host-resolved salon (never client input):**
  - **Authenticated app** via `requireAuth` (`src/lib/auth-guard.ts`): **403 JSON** for API
    routes, **suspended-notice** for page loads. (This asymmetry is intentional — a suspended
    tenant's staff are entitled to know and be routed toward billing/comms.)
  - **Public booking surface** — checked **before** the `publicBookingEnabled` branch,
    returning the **existing `404 "Salon not found"`** shape (no suspended-state leak to the
    public; a suspended salon reads as simply not-found). Applied uniformly to ALL public
    reads and writes: `/app/book/[subdomain]` page GET, `/api/public/booking/[subdomain]` GET,
    the slots/availability read, and the booking POST. (Failure mode to avoid: gating the
    write but leaving availability live.)
- Suspend/reactivate are **status flips only**. **No salon deletion exposed** (Salon cascades
  hard-delete all child data).

### Operator audit log
- **Separate append-only table** (never `ActivityLog`): `id`, `operatorEmail`, `action`
  (`SUSPEND`/`REACTIVATE`/`REVEAL_PII`/`VIEW_TENANT`/…), `targetSalonId`, `reason` (required
  for writes), `metadata` (JSON, before/after), `createdAt`. Writer in `lib/operator-audit.ts`
  mirroring `src/lib/activity.ts`.
- **Transactionality split:** best-effort/non-throwing is fine for `REVEAL_PII` and
  `VIEW_TENANT`. For **state changes** (`SUSPEND`/`REACTIVATE`) the audit row and the status
  flip land in the **same transaction** — if the reason can't be recorded, the action doesn't
  happen. The reason-record is part of the action, not a side effect.
- **`VIEW_TENANT` defined in the enum but logging OFF by default for v1** (writes + reveals are
  what carry consequence; per-view logging at ~20 tenants is noise). Turning it on later is a
  one-line change, not a migration.

### PII
- Masked by default everywhere (`a••••@gmail.com`, `A•••• N•••••`). Reveal is explicit and
  logged (`REVEAL_PII`). No bulk client browser; directory/detail show owner contact +
  aggregate counts only.

### Billing
- **Stubbed:** show `plan` + a link out to Stripe's dashboard. Zero new billing code, zero
  network. No subscription panel.

### Build order & progress
Tracked live in the session task list (TaskCreate/TaskUpdate). Order:
1. `Salon.status` enum + migration + backfill to `ACTIVE` — **(in progress)** the foundation
   both enforcement points sit on; smallest, safest first commit.
2. Enforce suspended in `requireAuth` (authenticated app).
3. Gate the public booking surface on status (status-first, 404).
4. Operator audit table + writer (transactional for state changes).
5. Operator app shell: `OPERATOR_APP=1` middleware split + Auth.js Google OIDC +
   `requireOperator()`.
6. Tenant directory screen.
7. Tenant detail screen + suspend/reactivate (transactional with audit).
8. Final check against §8 (nothing on the do-not-build list) and §9 (definition of done),
   then **stop**.