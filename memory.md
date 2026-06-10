# Memory — Mobile Tab Bar + Desktop Shell Fixes (one bug unresolved)

Last updated: 2026-06-10, end of session

## What was built

All on `feature/saas-multi-tenancy`, all still uncommitted:

**Mobile bottom tab bar (per confirmed /architect plan):**
- `src/components/salon/nav-items.ts` — single source of truth for app nav (six items + admin-only `billingNavItem`, `navItemsForRole()` helper). First three items = direct mobile tabs, rest go in More.
- `src/components/salon/MobileTabBar.tsx` — fixed bottom bar `<768px`: Dashboard / Appts / Customers / More; More = bottom Sheet with role-filtered remaining links + user identity + Sign Out; safe-area padding; active = `text-primary`.
- `src/app/(app)/layout.tsx` — renders MobileTabBar; SidebarTrigger `hidden md:flex` (no hamburger on mobile); mobile-only topbar search icon → `setCommandOpen(true)`; `max-md:pb-[calc(3.5rem+env(safe-area-inset-bottom))]` on SidebarInset.
- `Sidebar.tsx` refactored to import nav-items. `specs/ui/app-shell.md` amendment added (icon rail still pending).

**Desktop shell fixes (the layout was broken since the routes migration, never visually verified):**
- `src/components/ui/sidebar.tsx` — removed non-standard `md:peer-data-[variant=sidebar]:ml-[var(--sidebar-width)]` from SidebarInset. Sidebar already renders a 16rem gap spacer → content was double-offset 32rem on desktop.
- Topbar: `fixed + md:left-[var(--sidebar-width)] + pt-15` hack replaced with `sticky top-0` in normal flow. (`pt-15` is not a real class in Tailwind v3 — content slid under the header.)
- Content capped `max-w-7xl mx-auto` per spec.
- Someone/something else later changed SidebarInset to `h-svh overflow-hidden` (app-shell scroll model: only content pane scrolls). Kept — user confirmed pinned topbar is the desired SaaS pattern.

**Other:**
- `specs/ui/routes.md` rewritten to real routes; architecture notes 1–3 marked resolved; only currency note open.
- Deduplicated 3 files of a NEW public-booking feature that some other tool wrote with content pasted twice (byte-identical halves): `src/app/api/public/booking/[subdomain]/route.ts` (328→164), `.../slots/route.ts` (170→85), `src/components/booking/BookingFlow.tsx` (1062→531). That tool may double-write future files too.

## Decisions made

- Mobile: no hamburger at all <768px — tab bar replaces drawer; search lives in topbar; user identity + Sign Out live in More sheet.
- Icon-rail sidebar (768–1024) deliberately deferred.
- Desktop topbar stays pinned, content pane scrolls (standard SaaS shell; user confirmed).
- No today-count badge on mobile tabs v1.

## Problems solved

- **ROOT CAUSE of the recurring webpack chunk corruption (`Cannot find module './331.js'`)**: `npm run build` and `npm run dev` share `.next` and clobber each other. NEVER run a build while the dev server is running. This also explains last session's "stale cache" mystery.
- The user's dev server runs OUTSIDE the agent sandbox PID namespace — it cannot be killed/restarted by the agent (port 3000 visible via ss, process invisible to ps/pkill).
- `src/components/ui/sidebar.tsx` is the Tailwind-v4 shadcn variant (contains `--spacing(4)`, `has-data-[...]` syntax) in a Tailwind v3.4 project — watch for silently non-compiling classes.
- Role filtering in `nav-items.ts` hides nav only; routes are NOT guarded (stylist can deep-link `/staff`). Documented in routes.md.

## Current state

- tsc, eslint clean. Tab bar + desktop fixes verified statically only — NO runtime verification (user explicitly refused Playwright/browser automation).
- **UNRESOLVED BUG (where session ended):** on desktop, closing the sidebar leaves a dead ~256px strip — topbar/content do not expand to fill. Verified: source is correct; served JS chunk is current (contains new sticky header, no old offset classes); no service worker. Leading hypothesis: dev server serving stale CSS — its webpack cache was corrupted by the morning `.next` wipe (dev.log shows `PackFileCacheStrategy ... ENOENT 0.pack.gz`). Restart attempt was rejected by user; never executed.
- Secondary hypothesis if restart doesn't fix: `group-data-[collapsible=offcanvas]:w-0` on the sidebar-gap div not compiling/matching under Tailwind v3. Compiled CSS check was inconclusive: grep `data-collapsible=offcanvas` = 0 hits but `data-collapsible` = 15 (attr values may be quoted in output). Fallback fix: switch gap to a v3-safe rule, e.g. explicit CSS in globals or `group-data-[state=collapsed]:w-0`.

## Next session starts with

Ask the user to restart their dev server first (their terminal: Ctrl+C / kill the next dev process, `rm -rf .next`, `npm run dev`), then re-test closing the sidebar on desktop. If the strip is gone → done, commit everything. If not → inspect compiled CSS for the `group-data-[collapsible=offcanvas]:w-0` rule and apply a v3-safe replacement in `ui/sidebar.tsx`.

## Open questions

- Desktop sidebar-close dead strip: stale CSS or v3 class incompatibility? (see above)
- Currency: $29 USD vs RWF (spec leans 15,000 RWF/mo) — touches billing page, LandingPage, Stripe config.
- (Carried) `npx prisma db push` for stripeCustomerId/stripeSubscriptionId; billing e2e; icon rail 768–1024; Appointments mobile FAB; plan-downgrade grace period; subdomain conflict handling.
- Seed users: Admin/1234, Alice/5678, Marie/9012; demo salon `?salon=demo`.

## Working-style notes (important)

- Do NOT install Playwright or browser automation — user explicitly refused, twice.
- No elaborate curl/CSS forensics loops — read the code, be direct, minimize token spend.
- User edits files in parallel (and another tool writes files, sometimes doubled) — re-read before editing, don't assume your version is current.
