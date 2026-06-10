# Memory — Views → Real Routes Migration (built, verification interrupted)

Last updated: 2026-06-10

## What was built

Two work blocks this session, both on branch `feature/saas-multi-tenancy` (all uncommitted):

**Block 1 — design system applied to code:**
- `globals.css` + `tailwind.config.ts`: raspberry/warm-stone tokens (light + dark) per `specs/ui/design-system.md`, including new semantic `success`/`warning`/`info` tokens and `--chart-1…5` (which were referenced in the Tailwind config but never defined). `--radius: 0.625rem`.
- `layout.tsx`: Bricolage Grotesque loaded as `--font-display`; `fontFamily.sans/display/mono` mapped in Tailwind — the body was never actually rendering Geist before (variables existed but `sans` was unmapped).
- `src/components/marketing/LandingPage.tsx`: single source of truth for marketing (merged the two diverged copies), correct CTA hierarchy, Free + Pro ($29/mo, copied from billing) pricing.

**Block 2 — views → real routes migration (per confirmed /architect plan):**
- `src/app/(app)/layout.tsx`: client layout owning SidebarProvider → AuthProvider → auth gate (loading → splash; no user → `router.replace('/login' + search)`) → Sidebar + topbar + CommandPalette + Toaster. Lifted from old `AuthenticatedApp`.
- Six thin pages: `(app)/{dashboard,appointments,customers,staff,services,reports}/page.tsx`, each rendering its existing View component.
- `(app)/billing/page.tsx`: moved from `src/app/billing/` (old dir deleted), stripped its own min-h-screen wrapper + fixed ThemeToggle; now gets the sidebar and — importantly — a real AuthProvider (it previously rendered with the `useAuth` no-provider fallback, i.e. null salon).
- `src/app/page.tsx`: now just renders `LandingPage` (server component). `/` is ALWAYS marketing per user decision.
- `src/components/marketing/MarketingHeader.tsx` (new, client): wraps itself in AuthProvider; signed-out → ghost "Log in" + primary "Start free trial"; signed-in → avatar (initials) with dropdown (Dashboard, Log out). Reserves header space while auth loads to avoid layout shift.
- `Sidebar.tsx`: nav items are now `href`-based `<Link>`s inside `SidebarMenuButton asChild`; active = `pathname === href` via `usePathname`; today-count effect keyed on `pathname`; Billing button is a `<Link>` (no more full reload).
- `CommandPalette.tsx`: all navigation via `router.push`; entity results push `/customers` / `/appointments`.
- `DashboardView.tsx`: nine `setActiveTab(...)` quick-links → `router.push(...)`.
- `salon-store.ts`: `activeTab`/`setActiveTab`/`ViewTab` deleted; keeps `selectedDate`, `sidebarOpen`, `commandOpen`, `salon`.
- `src/app/login/page.tsx`: success redirect now `/dashboard` (+ preserved `?salon=`).
- `src/app/marketing/` deleted (redundant once `/` is always marketing).
- Specs updated earlier in session: `specs/ui/routes.md` (route table, resolved/open architecture notes incl. USD-vs-RWF currency inconsistency), `app-shell.md`, `design-system.md` amendment log. NOTE: routes.md still describes views as client-side state — needs updating to the new real routes once verified.

## Decisions made

- `/` is always marketing, even signed in; header shows avatar dropdown instead of auth buttons. Dashboard lives at `/dashboard`. (User's explicit choice over redirect-to-dashboard.)
- Auth gating is client-side in `(app)/layout.tsx` — matches the existing localStorage-token + `/api/auth/me` session model; no middleware change.
- URL is the single navigation truth; zustand no longer holds nav state.
- Spec-driven UI workflow stands: new screens get `specs/ui/screens/<feature>-screen.md` first.

## Problems solved

- `useAuth()` silently returns a null-user fallback when no AuthProvider is mounted (see `auth-context.tsx` ~line 145) — this masked the fact that the old standalone `/billing` page never had real auth context. Beware: any component using `useAuth` outside a provider fails silently, not loudly.
- Block 1: `LoginPage.tsx` was imported nowhere (login unreachable; marketing header linked to a dead `#login` anchor) — fixed with `/login` route.
- Stale `.next` artifacts after deleting routes: `.next/types` referenced deleted `src/app/billing`/`marketing` pages (tsc errors), and a partial `.next` deletion corrupted webpack chunks (`Cannot find module './611.js'` during "Collecting page data"). Fix in flight: full `rm -rf .next && npm run build`.

## Current state

- All migration code is written; `next build` "Compiled successfully" — compile and types are fine.
- **Verification incomplete**: the final clean rebuild (`rm -rf .next && npm run build`) was interrupted by the user. The webpack-chunk error is a stale-cache artifact, not a code error, but this is unproven until the clean build finishes. No runtime smoke test done (login → /dashboard → sidebar nav → /billing → marketing header avatar).
- Block 1 work (theme, fonts, landing page, /login) was fully verified earlier (tsc + eslint + production build all green before Block 2 began).
- Still pending from 2026-06-07: `npx prisma db push` for `stripeCustomerId`/`stripeSubscriptionId` columns; billing-flow end-to-end test. Seed users: Admin/1234, Alice/5678, Marie/9012; demo salon subdomain `demo` (dev tenancy via `?salon=demo`).

## Next session starts with

`rm -rf .next && npm run build` — must pass clean. Then smoke-test: `/` shows marketing (avatar when signed in), `/login` → `/dashboard`, sidebar links navigate with active marking, ⌘K palette navigates, dashboard quick-links work, `/billing` shows salon name + sidebar, unauthed `/appointments` redirects to `/login`. Then update `specs/ui/routes.md` to reflect real routes and mark architecture note 1 resolved.

## Open questions

- Currency: $29 USD (billing + marketing) vs RWF everywhere else — pick one (likely RWF), touches Stripe config.
- Mobile bottom-tab bar (spec'd in app-shell.md) — not yet built; sidebar still collapses offcanvas on mobile.
- (Carried) Plan downgrade grace period; subdomain conflict handling at signup.
