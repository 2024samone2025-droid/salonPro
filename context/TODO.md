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

**Phase 1 — subdomain tenancy unit (must ship together; staff auth keeps working)**
- [ ] Middleware: parse `Host` → `x-salon-subdomain` for ALL requests; `ROOT_DOMAIN` env; root/`www` + reserved (`app`/`api`) = no-tenant; `sub.localhost:3000` dev; `?salon=` dev-only fallback.
- [ ] Server `(app)/layout.tsx` wrapper: resolve subdomain → salon via Prisma, `notFound()` on unknown, BEFORE auth; pass salon to existing client shell.
- [ ] `requireAuth`: salonId from resolved Host; verify staff `User` belongs to resolved salon; preserve `AuthResult` shape (13/14 call sites unchanged).
- [ ] Retire Bearer/`localStorage` channel (`authFetch`, `getSessionFromRequest`, `/api/auth/me` header fallback, client `login`/`refreshSession`) — same pass as `requireAuth`.

**Phase 2 — owner identity + global login (ship together; depends on 0+1)**
- [ ] `crypto.scrypt` password util.
- [ ] `POST /api/owner/login`: email+password → linked salons → one = exchange token; many = picker list.
- [ ] `GET /api/auth/exchange` (subdomain): consume one-time token, set owner session cookie, redirect to `/dashboard` (strip `?t=`).
- [ ] `requireAuth` owner branch: verify `OwnerSalon` link → admin perms; owner `AuthResult` (`id=ownerId`, `role='admin'`, `staffId=null`, `isOwner=true`).
- [ ] Owner-specific surgery: `/api/auth/me` + `/api/users/me/tour-complete` branch on owner (return owner profile, skip tour — owners have no `User` row).
- [ ] Root `/login` owner UI + multi-salon picker UI.

**Phase 3 — signup → owner (depends on 2)**
- [ ] `/api/salons`: unauth → create `Owner` inline; authed owner → link to existing; **authed staff → reject (403)**. Drop admin-`User` creation; auto-login owner via exchange. Update signup form fields (email/password vs name/PIN). Keep subdomain hardening.

**Phase 4 — migrate existing data**
- [ ] Backfill `Owner` + `OwnerSalon` for existing salons. **BLOCKED on decision:** (a) supply email per salon + placeholder/forced-reset (no claim flow), OR (b) PIN-verified "claim your owner account" flow. _(User left the pick blank — needs answer before this phase.)_

**Phase 5 — docs (final)**
- [ ] Update `context/ARCHITECTURE.md` + `context/DATA_MODELS.md`.

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
