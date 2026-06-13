# TODO — SalonPro

Template — fill in the product/roadmap sections. The cleanup backlog at the bottom is seeded from the initial audit so nothing gets lost; tick items off as you go.

## Now (in progress)
- **Owner accounts + subdomain tenancy** — see the dedicated section below.

## Next (this milestone)
- _…_

## Later / backlog
- _…_

## Ideas / parking lot
- _…_

---

## Owner accounts + subdomain tenancy (started 2026-06-13)

Branch: `feat/owner-accounts-subdomain-tenancy` (off `main`). Big, sensitive (auth/session) change — plan approved, building in phases. Two separate auth surfaces: **owner global accounts** (email+password, root-domain login, admin rights via `OwnerSalon` link) and **staff name+PIN** (per-subdomain, unchanged). Clients stay auth-less `Customer`s.

**Decisions locked:**
- Owner identity is a global layer ABOVE per-salon `User`; owners get admin rights directly via `OwnerSalon` (no `User` row required).
- `salonId` derives from the resolved Host (subdomain), NOT the token; verified against the subject's membership (401 on mismatch, no redirect).
- Owner login at root `salonpro.me/login` (host-branched; tenant host `/login` = staff PIN).
- Signup creates owner inline; authed owner → links to existing account; **authed staff → rejected (no orphan salon)**.
- Retire the Bearer/`localStorage` token channel → cookie-only.
- Prod domain `salonpro.me`; `?salon=` is dev-only. Cookies stay host-only (no `Domain`).
- Password hashing: `crypto.scrypt` (no new dep); PIN SHA-256 unchanged.

**Phase 0 — foundation (independent, no behavior change)** — ✅ done 2026-06-13
- [x] `AUTH_SECRET` required; insecure hardcoded fallback removed (fails loudly at startup). Commit `151dc13`.
- [x] Additive schema: `Owner`, `OwnerSalon`, `OneTimeToken` + `Salon.owners`; applied via `prisma db push` (baselined repo, no `migrate dev`). Commit `0dc65b2`.
- [ ] _Note:_ `.env.example` is git-ignored repo-wide, so the documented `AUTH_SECRET` line there is local-only — decide whether to force-track it.

**Phase 1 — subdomain tenancy unit (must ship together; staff auth keeps working)** — ✅ done 2026-06-13
- [x] Middleware: parse `Host` → `x-salon-subdomain` (on the **request**) for ALL requests; `ROOT_DOMAIN` env; root/`www` + reserved (`app`/`api`) = no-tenant; `sub.localhost:3000` dev; `?salon=` dev-only fallback. Excludes the public booking surface (`/book/[subdomain]`, `/api/public/booking/[subdomain]`), which stays path-param. New `lib/subdomain.ts` (edge-safe label extraction).
- [x] Server `(app)/layout.tsx` wrapper: resolve subdomain → salon via Prisma, `notFound()` on unknown, BEFORE auth; renders extracted client `AppShell`.
- [x] `requireAuth`: salonId from resolved Host; verify staff `User` belongs to resolved salon; role from DB row; `AuthResult` shape preserved (13/14 call sites unchanged). Two failures: unknown subdomain → 404; valid subdomain + non-member → 401 identical to no-session.
- [x] Dropped `salonId` from the token payload (host is sole authority); `tour-complete` uses `auth.salonId`.
- [x] Host-aware `/api/auth/me` (sub-decision B): same resolve + membership check.
- [x] Dropped the `'demo'` silent default (sub-decision A) from `/api/auth/login` + client.
- [x] Retired Bearer/`localStorage` channel — cookie-only (`auth-guard`, `auth-context`, `/api/auth/me`, signup page).

_Verified: `tsc --noEmit` + `eslint .` clean. Not browser-smoke-tested yet (see below). Owner login still Phase 2._

**Phase 1 — notes / known-deferred (so these aren't mistaken for bugs later):**
- **Dev URL pattern changed:** a bare `localhost:3000` with no tenant now resolves to NO salon → **404 is expected, not a broken build**. Run the app via `demo.localhost:3000` (browsers resolve `*.localhost` to 127.0.0.1) or `localhost:3000/?salon=demo` (dev-only `?salon=` fallback). `ROOT_DOMAIN=localhost:3000` in dev. Documented in `.env.example`.
- **Flash of app shell (deferred):** the `(app)` auth gate stays client-side in Phase 1, so a logged-out (or cross-tenant) visitor briefly sees the shell before the client `me` call redirects to `/login`. Known-deferred — server-side gate / flash-prevention is intentionally out of Phase 1 scope.

**Phase 2 — owner identity + global login (ship together; depends on 0+1)** — ✅ done 2026-06-13
- [x] `crypto.scrypt` password util (`lib/password.ts`, salt:hash, timing-safe).
- [x] Owner session token + root-owner + single-use exchange tokens in `auth.ts`; `SessionUser` widened to staff|owner union.
- [x] Picker auth via **root owner session cookie** (`salonpro_owner`, 30 min): `POST /api/owner/login` (sets it, returns salons), `GET /api/owner/me` (restore), `POST /api/owner/select` (mint exchange token + redirect URL).
- [x] `GET /api/auth/exchange` (subdomain): verify token + host match, consume nonce atomically (single-use), set owner session cookie, redirect to `/dashboard`.
- [x] `requireAuth` owner branch: verify `OwnerSalon` link → admin perms; non-linked owner → 401 no-leak.
- [x] Owner-specific surgery: `/api/auth/me` owner branch; `/api/users/me/tour-complete` no-ops for owners.
- [x] Host-branched `/login`: root host → `OwnerLogin` (email/password + picker); tenant host → `StaffLogin`.

_Verified: `tsc --noEmit` + `eslint .` clean. Not browser-smoke-tested. **Owner flow dev-testing needs `demo.localhost:3000` (real subdomain host), NOT `?salon=`** — the handoff sets a host-only cookie on the subdomain. Deferred: owner login rate-limiting; a root-domain owner logout (subdomain logout only clears the tenant cookie; root-owner cookie expires on its own)._

**Phase 3 — signup → owner (depends on 2)** — ✅ done 2026-06-13
- [x] `/api/salons` POST owner-aware: **hard staff gate first** (valid staff `salonpro_session` → 403, before any owner cookie is read); authed owner (owner session or root-owner cookie) → create Salon + link; unauth → mint new `Owner` (name+email+scrypt password) + Salon + link in one tx. Dropped admin-`User` creation.
- [x] Unauth + existing email → **409, never attach** (no password side-door). Both paths return an exchange-redirect URL (auto-login); unauth also sets the root-owner cookie. Subdomain + email P2002 → 409.
- [x] Signup form: owner name + email + password (min 8) instead of admin name/PIN; redirects via the handoff URL. Suffix shown as `.salonpro.me`.

_Known tradeoff (conscious, not accidental): the 409 "that email already has an account" message is a minor **email-enumeration oracle** — it reveals which emails are registered owners. Accepted for clearer signup UX on a salon SaaS. Revisit if abuse appears (e.g. generic message + email-based recovery)._

_Verified: `tsc --noEmit` + `eslint .` clean. Not browser-smoke-tested. Signup now creates real `Owner` rows, so the Phase 2 owner-login flow becomes exercisable (test at `<sub>.localhost:3000`). "Add another salon" UI for authed owners not built yet (API supports it)._

**Phase 4 — migrate existing data** — script ready 2026-06-13 (awaiting emails + run)
- Decision: **option (a)** — supply emails, placeholder password, no claim flow.
- [x] Added `Owner.mustResetPassword` flag (additive db push).
- [x] `scripts/backfill-owners.ts`: idempotent, **dry-run by default / `--commit` to write**; `SUBDOMAIN_TO_EMAIL` map at top (`demo` pre-filled); creates Owner+OwnerSalon only (never touches `User`); prints temp passwords for newly-created owners.
- [ ] **You:** fill the email map (6 salons: `demo` done; `hello`, `mysalon`, `mysalon1`, `vision3030`, `vision`), run dry-run, then `npx tsx scripts/backfill-owners.ts --commit` (no bun needed — `npx tsx` works) and save the printed temp passwords.
- [ ] **Deferred follow-up (Phase 4.5):** build forced-reset-on-first-login *enforcement* — login checks `mustResetPassword` → set-new-password screen/endpoint. Until then the flag is an unenforced marker and temp passwords work for login.

**Phase 5 — docs (final)** — ✅ done 2026-06-13
- [x] `ARCHITECTURE.md`: Host-is-authority multi-tenancy (two-stage resolve), two auth surfaces (owner email/password + staff PIN, cookie-only), updated folder tree + lib modules + API resources. Fixed stale react-query/`prisma.ts` mentions.
- [x] `DATA_MODELS.md`: added Owner / OwnerSalon / OneTimeToken, clarified User as per-salon staff, owner-aware `/api/salons` + owner/exchange routes, db-push (baselined) + `npx tsx` note. Removed stale payment-status note.

**Deployment prerequisite (out of code scope):** wildcard DNS `*.salonpro.me` + wildcard SSL before Phase 1 deploys.

---

## Cleanup backlog (from initial /context audit — 2026-06-13)

Done 2026-06-13:
- [x] **Retired legacy toast system.** Deleted `hooks/use-toast.ts` + `ui/toast.tsx` + `ui/toaster.tsx` and removed the radix `<Toaster>` mount from root `app/layout.tsx`. sonner remains, mounted in `(app)/layout.tsx` + `BookingFlow.tsx`.
- [x] **Deleted dead `src/lib/prisma.ts`** (empty; real client is `lib/db.ts`).
- [x] **Amended `specs/ui/design-system.md`** with the 2026-06-13 row (light restored, toggle re-added, Poppins).
- [x] **Reconciled payment status naming** — `PAYMENT_STATUS_CONFIG` key `partially_paid` → `partial` to match the value used by `AppointmentDialog`, seed, dashboard, reports (partial badges now render their amber style).
- [x] **Dropped `@tanstack/react-query`** from `package.json` — was unused (no `QueryClientProvider`/`useQuery`); lockfile synced.
- [x] **Dropped `next-themes`** from `package.json` — was unused (theme handled by custom `data-theme` script + `theme-toggle.tsx`); lockfile synced.

Cleanup backlog complete.

## Product gaps (carried from old worklogs — decide build vs defer)
- [ ] Real Stripe billing (15,000 RWF zero-decimal price, webhook, downgrade grace).
- [ ] Marketing-vs-product gap: WhatsApp/SMS reminders, offline mode, birthday reminders, data export, 30-day Pro trial (build or soften landing copy).
- [ ] Landing placeholders: real `WHATSAPP_URL`; `/privacy` + `/terms` pages (or drop footer links).
- [ ] Responsive: icon-rail sidebar (768–1024px); mobile booking FAB.
- [x] Signup: subdomain conflict handling — done 2026-06-13. Shared `validateSubdomain()` + `RESERVED_SUBDOMAINS` in `lib/constants.ts`; race-safe create (P2002 → 409); debounced live availability check on the signup page. See [DATA_MODELS.md](./DATA_MODELS.md#subdomain-rules-single-source-of-truth-srclibconstantsts).
