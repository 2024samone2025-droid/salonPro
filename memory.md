# Memory — UI Spec Foundation Bootstrap (on SaaS Multi-Tenancy branch)

Last updated: 2026-06-10

## What was built

This session was spec-only — no app code changed. Bootstrapped the spec-driven UI foundation via /ui-ux-architect:

- `specs/ui/design-system.md` — target tokens: raspberry accent `#BE185D` (light) / `#F472B6` (dark) over warm stone neutrals; Bricolage Grotesque display + Geist Sans body + Geist Mono for RWF amounts; type scale 1.25; radius 8/12/16/full; comfortable density (44px rows); component inventory mapped to the existing `src/components/ui/` shadcn set (EmptyState is the one component that still needs creating).
- `specs/ui/app-shell.md` — three shells: AppShell (sidebar + topbar), AuthShell (centered card: signup/login), MarketingShell (top nav + footer). Mobile target: bottom tab bar (Dashboard / Appointments / Customers / More-sheet) instead of a hamburger drawer. Overlay policy: Sheet for create/edit, Dialog for confirms only, sonner toasts with undo, Alert banner for trial/billing notices. ASCII wireframes for Dashboard, Appointments, Marketing landing.
- `specs/ui/routes.md` — route table + hierarchy, tenancy note (subdomain via middleware, dev `?salon=`), and two flagged architecture problems (see Problems).
- `specs/ui/screens/` — empty; filled per-feature by ui-ux-architect Feature mode.
- Persistent agent memory: `~/.claude/projects/-home-m25-projects-salonPro/memory/ui-spec-foundation.md`.

**Carried over from 2026-06-07 session (still current):** full SaaS multi-tenancy transformation — `Salon` model + `salonId` FKs across all models, subdomain middleware (`x-salon-subdomain` header), salon-scoped API routes, demo-mode billing endpoints (`/api/billing/checkout` upgrades directly, no real Stripe), `/signup` onboarding, `/billing` page, admin-only Billing nav. Seed: demo salon (subdomain `demo`), users Admin/1234, Alice/5678 (receptionist), Marie/9012 (stylist).

## Decisions made

**This session (UI):**
- Spec-driven UI from now on: every new visible feature gets `specs/ui/screens/<feature>-screen.md` with the full default/empty/loading/error/mobile state table before building; no inline new tokens/components — changes go through the design-system.md amendment log.
- Design direction "boutique, not bank": raspberry + warm stone replacing the stock shadcn near-black theme. Spec is the target; `globals.css` deliberately not migrated yet, pending user reaction.
- Mobile navigation target is a bottom tab bar, not a drawer — front-desk staff book appointments constantly on phones.

**Standing (multi-tenancy, from previous session):**
- Shared DB with `salonId` FK (not schema-per-tenant); salon lookup in API handlers (Prisma is edge-incompatible, so not in middleware); dev subdomain via `?salon=` query param; demo-mode direct upgrade instead of real Stripe; admin-only billing access.

## Problems solved

None code-level this session. Two architecture problems identified and documented in `specs/ui/routes.md`:

1. All six app views (Dashboard/Appointments/Customers/Staff/Services/Reports) are client-side state in `src/app/page.tsx`, not URLs — no deep links, broken back button. Recommended: promote to real routes under a shared AppShell layout (sidebar already maps 1:1).
2. Marketing page is duplicated: `MarketingSection` inline in `page.tsx` AND the new uncommitted `src/app/marketing/page.tsx` — they will drift; keep one source of truth. Also: the marketing header CTA hierarchy is inverted (Login is the filled primary, Sign Up is ghost — should be reversed since signup is the conversion goal).

## Current state

- Branch `feature/saas-multi-tenancy`. Uncommitted: modified `src/app/page.tsx`, new `src/app/marketing/`, new `specs/ui/`.
- specs/ui foundation complete, awaiting user reaction; any correction gets folded into the specs so future screens inherit it.
- App code still on stock shadcn theme; no screen specs written yet; EmptyState component not built.
- ⏳ Still pending from last session: `npx prisma db push` for the `stripeCustomerId`/`stripeSubscriptionId` columns, then test signup → login → billing upgrade → verify free-plan limits lift.

## Next session starts with

Get the user's reaction to `specs/ui/design-system.md` and `app-shell.md`. Then, in order: (1) migrate `globals.css` tokens to raspberry/stone + add Bricolage Grotesque in `layout.tsx`, (2) resolve the marketing-page duplication, (3) fix the marketing header CTA hierarchy. (The views→routes migration is bigger — schedule separately. The pending `prisma db push` + billing-flow test from 2026-06-07 is still open too.)

## Open questions

- Does the user approve the raspberry/warm-stone direction and the mobile bottom-tab plan?
- Keep marketing on unauthed `/` (recommended; delete `/marketing`), or move it to `/marketing`?
- When to do the client-side-views → real-routes migration?
- (Carried over) Plan downgrade: immediate limit enforcement or grace period? How to handle subdomain conflicts at signup?
