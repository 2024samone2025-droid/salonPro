# Product Tour Implementation Plan — Driver.js First-Run Tour

Status: **awaiting approval — no code written**
Library: `driver.js` v1.x (MIT), ~5 kB gzip, zero deps
Date: 2026-06-11

---

## 1. Proposed step list

Tour runs on the **Appointments page** (steps 1–5) with a welcome step on Dashboard (step 0). No element on the page currently has a stable id or tour attribute — every target needs a `data-tour` attribute added (one-line changes, listed per step).

| # | Step | Target element | File | Attribute to add | Route |
|---|------|----------------|------|------------------|-------|
| 0 | Welcome ("Let's take a 1-minute tour") | none — centered modal popover (Driver.js step without `element`) | — | — | `/dashboard` |
| 1 | Quick booking bar | The `<Card>` root of the quick-booking form | `src/components/salon/QuickBookingForm.tsx` (root `<Card className="shadow-sm">`, ~line 207) | `data-tour="quick-booking"` | `/appointments` |
| 2 | Appointments calendar/grid | The wrapper that hosts both day-view grid and week view (the container around `{grid}` / week markup) | `src/components/salon/AppointmentsView.tsx` (day grid ~line 209, week grid ~line 287; attribute goes on their common parent) | `data-tour="appointments-grid"` | `/appointments` |
| 3 | Share booking link button | The `<Button onClick={handleShareBookingLink}>` | `src/components/salon/AppointmentsView.tsx` ~line 571 | `data-tour="share-booking"` | `/appointments` |
| 4 | Customers (navigation) | Desktop: sidebar `Link` for `/customers`. Mobile: bottom-tab `Link` for `/customers` | `src/components/salon/Sidebar.tsx` (~line 127) and `src/components/salon/MobileTabBar.tsx` (~line 52) | `data-tour="nav-customers"` on both | any (sidebar/tab bar are global chrome) |
| 5 | Reports (navigation) | Desktop: sidebar `Link` for `/reports`. Mobile: the **More** button (Reports lives inside the More sheet) | `Sidebar.tsx` and `MobileTabBar.tsx` (~line 68) | `data-tour="nav-reports"` (sidebar) / `data-tour="nav-more"` (mobile More button) | any |

Attribute strategy in `Sidebar.tsx`/`MobileTabBar.tsx`: derive from the nav item — `data-tour={"nav" + item.href.replace("/", "-")}` — so every nav item gets a stable hook with one template literal, not per-item conditionals.

**Role-aware filtering (required):** nav is filtered by role (`nav-items.ts`). Stylists have no Reports entry, so step 5 must be dropped for `role === 'stylist'`. The step list is built at runtime from the session role.

## 2. Cross-page strategy

Good news: only **one** navigation is needed. Steps 1–3 live on `/appointments`, and steps 4–5 target the sidebar/tab bar, which is global chrome visible *on* the appointments page. So the flow is: welcome modal on Dashboard → navigate once → 5 spotlight steps, all on one page.

Mechanics with Driver.js + Next.js App Router:

- A singleton driver instance lives in a client module (`src/lib/tour.ts`), created with `driver({ steps, ... })`.
- Step 0 → step 1 transition uses Driver.js's per-step `onNextClick` override: call `router.push('/appointments')`, then poll (`requestAnimationFrame` loop, ~5 s timeout) for `[data-tour="quick-booking"]` to exist, then call `driverObj.moveNext()`. The Driver.js overlay survives client-side route changes because the React tree (and the overlay's DOM node) isn't torn down.
- All step `element` values are **selector strings**, not node references — Driver.js resolves them at highlight time, which tolerates re-renders.
- If polling times out (API slow/offline), destroy the tour gracefully and do **not** mark it complete, so it retries next login.

**Fallback if this proves fragile:** pure single-page tour — auto-start redirects to `/appointments` first (`router.push` before `drive()`), and step 0's welcome shows there instead of on Dashboard. We'd lose only "tour begins on the screen the user landed on"; every spotlight step is identical. I recommend building the one-hop version and keeping this fallback in our pocket — the diff between them is ~10 lines.

## 3. Mobile strategy (375 px)

Key fact: at `< md` the sidebar is **completely unreachable** — `collapsible="offcanvas"` and the `SidebarTrigger` is `hidden md:flex`. Mobile navigation is the bottom `MobileTabBar` (Dashboard / Appts / Customers / More) plus a Radix `Sheet` behind **More**.

| Step | At 375 px | Handling |
|------|-----------|----------|
| 0 Welcome | Centered modal — fine | No change |
| 1 Quick booking | Card is full-width at top — fine | No change |
| 2 Calendar grid | Grid is tall; Driver.js auto-scrolls the highlight into view | Position popover `bottom`, rely on built-in scroll |
| 3 Share link | Button collapses to icon-only (`hidden sm:inline` label) | Still targetable; popover text carries the explanation |
| 4 Customers | **Direct tab** in the bottom bar (3rd of 4) — visible | Target `[data-tour="nav-customers"]` in MobileTabBar; popover `top` |
| 5 Reports | **Hidden inside the More sheet.** The sheet's open state is internal `useState` — not controllable from outside without modification | Do **not** open the sheet programmatically (Radix focus-trap + portal z-index vs. Driver.js overlay is a fight we don't need). Instead target the **More button** (`data-tour="nav-more"`) with copy like "Reports, Services and Settings live here." |

Step targets are chosen per breakpoint at tour-build time via a `matchMedia('(min-width: 768px)')` check — desktop gets sidebar selectors, mobile gets tab-bar selectors. Z-index is safe: tab bar is `z-20`, header `z-10`, Driver.js overlay defaults to `10000+`.

## 4. Auto-start mechanism

New client component `TourController` mounted once in `src/app/(app)/layout.tsx` inside `AppFrame` (it's already `'use client'` and inside `AuthProvider`):

- Waits for `!loading && user` from `useAuth()` — never fires during the `Splash` loading state.
- Fires only when `user.tourCompleted === false` **and** `usePathname() === '/dashboard'` — login redirects land there, so the tour never ambushes someone deep-linked into, say, a half-filled booking form.
- A `useRef` guard ensures one attempt per mount (also covers React 18 strict-mode double-effects).
- Step 0 is a centered modal with no element dependency, so dashboard skeletons/loading cards underneath don't matter.
- On `onDestroyed` (finish **or** skip/X/escape): call the completion API, then update local auth state (via `refreshSession()`) so it can't re-fire this session. Skipping counts as completed — nobody gets re-ambushed.

"Replay tour" in Settings calls the same `startTour()` from `src/lib/tour.ts`, skipping the welcome step's auto-start guard (replay works from any role's perspective — but see Risk #1).

## 5. Persistence

**Schema** (`prisma/schema.prisma`, `User` model):

```prisma
tourCompleted Boolean @default(false)
```

**Migration & backfill.** Caution: the project has exactly one migration (`20260101000000_init`) but the schema has drifted since via `prisma db push` (e.g. `Salon.settings`). Running `prisma migrate dev` now would want to reconcile that drift. Recommendation: follow the established workflow — `prisma db push`, then a one-time backfill against the production DB:

```sql
UPDATE "User" SET "tourCompleted" = true;
```

run **before** the feature deploys (new signups after deploy get `false` from the column default; admin-created users via the Users settings tab also correctly get `false` and see the tour on first login). If you'd rather avoid ordering concerns entirely, the alternative is `@default(true)` + explicitly setting `false` in the two user-creation paths (`/api/auth/signup`, `/api/users` POST) — zero backfill, but every future creation path must remember the flag. Primary proposal is default-false + backfill, as you specified.

**Read path:** `/api/auth/me` currently returns the JWT-decoded session user (no User table read — it only queries Salon). Add a `db.user.findUnique` (or widen the existing query) to include `tourCompleted` in the response; add the field to `SessionUser` in `src/lib/auth-context.tsx`. No token re-issue needed since the flag is read fresh per session load.

**Write path:** new route `POST /api/users/me/tour-complete` — session-authenticated (any role), updates only the caller's own row (`where: { id: session.id, salonId: session.salonId }`), returns 204. No body, not callable cross-user.

## 6. Styling plan

Import `driver.js/dist/driver.css` once (in `globals.css` or the tour module), then override in `globals.css` using only semantic tokens — works in both themes automatically since the variables flip with `[data-theme]`:

```css
.driver-popover {
  background-color: hsl(var(--surface-raised));
  color: hsl(var(--ink));
  border: 0.5px solid hsl(var(--line));
  border-radius: var(--radius); /* 12px, matches cards */
}
.driver-popover-title { color: hsl(var(--ink)); font-size: 15px; font-weight: 500; }
.driver-popover-description { color: hsl(var(--ink-muted)); font-size: 13px; }
.driver-popover-arrow-side-* { /* arrow colors point at --surface-raised */ }
.driver-popover-next-btn {
  background-color: hsl(var(--accent));
  color: hsl(var(--accent-contrast));
  border-radius: calc(var(--radius) - 4px); /* 8px, matches buttons */
}
.driver-popover-prev-btn { /* ghost: transparent, hairline border, --ink-muted text */ }
.driver-popover-progress-text { color: hsl(var(--ink-faint)); }
```

No hex anywhere. The "next" button is the one solid accent element in the popover (consistent with the one-primary-per-screen rule); prev/close are ghost. Driver.js's overlay dim is fine as-is in both themes (`rgba(0,0,0,…)` over light and dark both read correctly).

## 7. File manifest

| File | Change |
|------|--------|
| `package.json` | add `driver.js` dependency |
| `prisma/schema.prisma` | `tourCompleted Boolean @default(false)` on `User` |
| *(one-time SQL, not a file)* | backfill `UPDATE "User" SET "tourCompleted" = true` before deploy |
| `src/lib/tour.ts` | **new** — step definitions (role- and breakpoint-aware), driver singleton, `startTour()` |
| `src/components/salon/TourController.tsx` | **new** — auto-start logic (auth-ready + dashboard + flag checks) |
| `src/app/api/users/me/tour-complete/route.ts` | **new** — POST, marks own record complete |
| `src/app/api/auth/me/route.ts` | include `tourCompleted` in user payload (adds a User table read) |
| `src/lib/auth-context.tsx` | add `tourCompleted` to `SessionUser` |
| `src/app/(app)/layout.tsx` | mount `<TourController />` in `AppFrame` |
| `src/components/salon/QuickBookingForm.tsx` | `data-tour="quick-booking"` on root Card |
| `src/components/salon/AppointmentsView.tsx` | `data-tour="appointments-grid"` on calendar wrapper, `data-tour="share-booking"` on share button |
| `src/components/salon/Sidebar.tsx` | `data-tour` attrs on nav links (template from `item.href`) |
| `src/components/salon/MobileTabBar.tsx` | `data-tour` attrs on tab links + More button |
| `src/components/salon/SalonSettingsTab.tsx` (or `SettingsView.tsx`) | "Replay tour" button calling `startTour()` |
| `src/app/globals.css` | Driver.js popover theme overrides (section 6) |

Not touched: landing page, booking flow, any business logic, API routes other than the two listed.

## 8. Risks / unknowns

1. **Settings is admin-only** (`SettingsView` returns "Access Restricted" for non-admins, and the nav entry is role-gated). A "Replay tour" entry there is invisible to receptionists and stylists. Options: (a) accept it — admins are the buyers; (b) also add a small "Replay tour" item to the mobile More sheet / sidebar footer. The plan implements (a) as specified; flag if you want (b).
2. **Calendar renders after async fetch.** `AppointmentsView` fetches appointments client-side; the grid markup itself renders immediately but inside loading skeletons. Selector polling after navigation (section 2) covers the route transition; per-step selector resolution covers re-renders.
3. **Week view vs day view.** The grid attribute goes on the wrapper common to both view modes, so the spotlight is correct whichever mode the user last had active.
4. **Migration drift** (section 5): `prisma migrate dev` would fight the `db push` history. Mitigation: keep using `db push` + manual backfill, consistent with how `Salon.settings` shipped.
5. **Mobile More sheet** can't be opened externally without adding state plumbing; deliberately avoided by spotlighting the More button instead (section 3).
6. **Stylist role** lacks Reports (and at mobile, More contains different items per role) — step list is built per-role at runtime; worst case a stylist gets a 4-step tour, which is fine.
7. **Strict-mode double-mount** could double-fire the tour — ref guard in `TourController`.
8. **Share button availability**: rendered unconditionally today, but if public booking is later gated off in the UI, that step's selector poll would fail — the step builder will skip any step whose selector is absent at start time (cheap insurance for all steps).

---

**Approval gate:** nothing above is implemented. Reply "approved" (or with amendments) and implementation proceeds in the file order of section 7.
