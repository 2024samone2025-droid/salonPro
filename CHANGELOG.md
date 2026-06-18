# Changelog

## [Unreleased]

### Features

- **Settings:** Mobile-first business-hours editor with native time picker and "Apply to all" button
- **Operator Console:** Billing panel with payment history, manual payment recording, and reversals
- **Operator Console:** Tenant directory, owner contact info, and status management
- **Subscriptions:** Plan model (Free/Pro), automated subscription creation on salon signup
- **Subscriptions:** Entitlements layer (enforces customer/service/staff limits per plan)
- **Subscriptions:** Stripe checkout integration with billing seam
- **PWA:** App installable as standalone PWA with service worker and offline fallback page
- **PWA:** Apple touch icons, manifest, and runtime caching
- **Branding:** Salon logo visible on public booking page and app header
- **Branding:** User photo avatars in sidebar, mobile sheet, and account preview
- **Phone Input:** Shared Rwanda +250 phone input with E.164 normalization across all surfaces
- **Dashboard:** Day-schedule timeline coloured by appointment status
- **Business Hours:** Editable open/close times with 7-day view and dialog/sheet UI
- **Activity Log:** Track salon activity with operator audit trail
- **Invite System:** Staff invite via shareable link with role-based acceptance
- **Closures:** Manage salon closures and days off

### Fixes

- **Auth:** Fixed auto-relogin after logout on apex domain — redirect-based cookie clearing ensures root picker cookies are cleared on the same origin that set them
- **Auth:** Root picker cookies (`salonpro_owner`/`salonpro_staff`) now scoped to registrable apex for cross-subdomain logout
- **Auth:** Fixed owner cookie scoping on salon creation
- **Subscriptions:** Created subscription automatically when a salon is created via signup
- **Subscriptions:** Mock webhook now requires shared secret for security
- **Dashboard:** Reverted unfinished dashboard UI adoption work (timeline, KPI deltas)
- **UI:** Business hours time-input clipping fix
- **Settings:** Subdomain field made read-only (managed via operator console)
- **Seed:** Guarded seed route as dev-only to prevent production data exposure

### Tests

- **subdomain.ts:** 34 unit tests covering `getRootDomains`, `getSubdomainLabel`, `resolveApex`, and `rootCookieDomain` — env var parsing, apex/subdomain matching, port handling, multi-root, edge cases
- **BusinessHoursEditor:** 12 component tests — day rendering, open/closed toggle, time input, "Apply to all", dialog/sheet open/close, 12h format display
- **BookingFlow:** 2 tests — public booking load and 404 state
- **ServicesView:** 4 tests — load, create, validation, permission gating
- **CustomersView:** 5 tests — load, search, create, validation, permission gating
- **StaffView:** 3 tests — load, invite, permission gating
- **UnifiedLogin:** 2 tests — render and error state
- **StatusActions:** 4 tests — status toggle, loading, error
- **OwnerContact:** 4 tests — contact display, edit, validation
- **DirectoryList:** 4 tests — list render, search, filter, pagination

### Refactors & Chores

- Removed deprecated API routes (`signup`, `invite/revoke`, root route handler)
- Removed "Team member? Go to your salon" link from login form
- Extracted `getInitials` into shared `lib/utils`
- Refactored logout route into shared `extractHost()` + `setClearCookieHeaders()` helpers

### Infrastructure

- Verification loop: `npm run verify` (typecheck + lint + test + isolated build)
- Vitest harness with jsdom, Radix polyfills, component testing utilities
- Safe build dir: custom `distDir` support via `NEXT_DIST_DIR` env var
