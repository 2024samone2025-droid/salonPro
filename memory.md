# Memory — Mobile polish + PWA (PR #34, open)

Last updated: 2026-06-16

> This `memory.md` is shared across parallel sessions. Two other handoffs exist:
> - **Operator Console** state → `OPERATOR_MEMORY.md` (live at https://ops.samuelxanda.dev/operator)
>   + deploy runbook `OPERATOR_SETUP.md`.
> - A **separate** 11-step "Mobile UX audit" session shipped earlier via **PR #33 (merged
>   into `feat/operator-console`)** — iOS zoom, touch targets, error states, bottom-sheet
>   dialog, contrast, landscape, day-view. That is NOT this session; don't redo it.
> This file now holds THIS session: mobile polish + PWA.

## What was built

Branch **`feat/mobile-polish-pwa`** (off `feat/operator-console`), pushed, **PR #34 open**
→ base `feat/operator-console`. 6 self-contained commits, `tsc --noEmit` + ESLint clean.
All surfaces use existing shadcn primitives (no bespoke UI).

1. **Footer hidden on mobile** — `AppShell` footer `hidden md:block`. Content already clears
   the fixed `MobileTabBar` via SidebarInset's `max-md` bottom padding.
2. **Subdomain read-only in Settings** (`SalonSettingsTab.tsx`) — it's console/operator-managed
   now. Replaced the editable field + warning with a read-only booking-link + shadcn copy
   button; **dropped `subdomain` from the settings PATCH** (API no-ops unchanged values, so no
   server change).
3. **Shared `PhoneInput` (+250)** — new `src/components/ui/phone-input.tsx` wrapping shadcn
   `Input`: fixed +250 prefix, `type=tel`/`inputMode=numeric`, 9-digit subscriber cap, strips
   leading 0, emits canonical `+250XXXXXXXXX`. Swapped into salon settings, customers (add+edit),
   staff, **and public booking** (booking dropped its custom Phone-icon adornment). `normalizePhone`
   in `lib/invite.ts` already maps these server-side.
4. **Salon logo displayed** — `profile.logoUrl` (was dead data) now rendered via shadcn `Avatar`
   on the public booking header AND the **app header** next to the salon name (+ settings preview).
   Public booking API (`/api/public/booking/[subdomain]`) now returns `salon.logoUrl`. NOTE: app
   header, NOT sidebar header — the sidebar header is the SalonPro *product* brand, not the tenant.
5. **User photo avatar** — `profile.photoUrl` (was dead data) feeds `AvatarImage` in Sidebar +
   mobile More-sheet + Account preview. Extracted **`getInitials` into `lib/utils`** (was copied
   inline in Sidebar + MobileTabBar) and reused in all three.
6. **PWA** — `app/manifest.ts` (standalone, brand colors #17151f, 192/512/maskable icons in
   `public/icons/` generated from the app mark via sharp), iOS appleWebApp meta + apple-touch icon,
   `themeColor` via the `viewport` export (removed the duplicate manual `<meta viewport>`),
   `app/offline/page.tsx` fallback, and **dependency-free** `public/sw.js` (runtime caching:
   network-first navigations w/ offline fallback, cache-first hashed static, APIs untouched)
   registered in production only via `src/components/ServiceWorkerRegister.tsx` in the root layout.

## Decisions made

- **Hand-written service worker, NOT Serwist** (deviation from the approved plan). Serwist needs
  a build-time compile + `next.config` wrapping, which can't be verified without a production
  build in this env. The hand-rolled SW touches no build pipeline and gives the same
  installable/cached-shell/offline outcome via runtime caching (also safer vs stale hashed chunks).
- **Salon logo → app header** (tenant-identity spot), not the product-brand sidebar header.
- **Phone = +250 default**, 9 subscriber digits, leading-0 stripped (Rwanda).
- **Base = `feat/operator-console`**, not `main` (main would drag in unmerged work; these fixes
  build on files that live on that branch).

## Current state

- All 6 commits isolated on `feat/mobile-polish-pwa` (verified: base branch + main contain none of
  them). Pushed; PR #34 open.
- Working tree: only the 3 session docs uncommitted (`memory.md`, `OPERATOR_MEMORY.md`,
  `OPERATOR_SETUP.md`) — deliberately kept out of the PR.

## Next session starts with

1. **Real-device verification** (cannot automate — needs a physical phone + a production build):
   - PWA install: Android Chrome "Add to Home Screen" + iOS Safari Share→Add; standalone launch + icon.
   - Offline: load app → go offline → navigate → `/offline` page shows.
   - PhoneInput: numeric keypad on device; typing `0788…` collapses to `+250788…`.
2. Review/merge PR #34.

## Open questions

- **Out-of-scope shadcn flag:** `src/components/operator/DirectoryList.tsx:46` uses a raw `<button>`
  status filter (operator console, separate feature) — candidate for shadcn `ToggleGroup` in its
  own pass. Not touched here.
- **Parallel-session caution:** this branch edits `MobileTabBar`, `Sidebar`, `BookingFlow`,
  `AppShell` — the same files the earlier mobile-ux-audit session touched. We branched cleanly off
  `feat/operator-console` (post PR #33 merge), so no conflict unless that session resumes on these
  files.
