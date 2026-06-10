# Routes — SalonPro

Tenancy: salon resolved from subdomain (dev: `?salon=` query param) via `src/middleware.ts`. All authed routes are scoped to the resolved salon.

| Route | Shell | Purpose (one line) | Spec |
|---|---|---|---|
| `/` | MarketingShell | landing: pitch, features, pricing, trial CTA — always marketing, even signed in (header shows avatar instead of auth buttons) | — |
| `/signup` | AuthShell | create salon + admin account (onboarding) | — |
| `/login` | AuthShell | staff sign-in (name + PIN); redirects to `/dashboard` on success, preserving `?salon=` | — |
| `/dashboard` | AppShell | today's stats + upcoming appointments | — |
| `/appointments` | AppShell | day/week calendar; book, reschedule, cancel | — |
| `/customers` | AppShell | client list + history | — |
| `/staff` | AppShell | staff roster + availability (admin, receptionist) | — |
| `/services` | AppShell | service catalog + prices | — |
| `/reports` | AppShell | revenue and activity reports (admin, receptionist) | — |
| `/billing` | AppShell | plan status, upgrade to Pro (admin-only) | — |

Hierarchy:
```
/                       marketing (always — signed-in users get an avatar menu → Dashboard)
├── signup              AuthShell
├── login               AuthShell
└── (app)/              shared authed layout: src/app/(app)/layout.tsx
    │                   auth gate (client-side) → sidebar + topbar + ⌘K palette
    │                   nav config: src/components/salon/nav-items.ts (role-filtered)
    ├── dashboard
    ├── appointments
    ├── customers
    ├── staff
    ├── services
    ├── reports
    └── billing
```

Notes:
- Auth gating is client-side in `(app)/layout.tsx` (localStorage token + `/api/auth/me`); unauthenticated visits to any `(app)` route redirect to `/login` with `?salon=` preserved. No middleware auth.
- Role visibility (`nav-items.ts`) hides nav entries only — it does not guard the routes themselves.
- Mobile (<768px): bottom tab bar replaces the sidebar; see `app-shell.md`.

## Architecture notes

1. **Views are state, not URLs** (resolved 2026-06-10). All six app views were rendered from `/` via a client-side switcher. Migrated to real routes under the `(app)` route group with a shared layout; sidebar, ⌘K palette, and dashboard quick-links all navigate via URL. Zustand no longer holds nav state.
2. **Marketing duplication** (resolved 2026-06-10). `/marketing` deleted; `/` always renders the single `src/components/marketing/LandingPage.tsx` (server component) with `MarketingHeader` handling signed-in state.
3. **Login reachability** (resolved 2026-06-10). `LoginPage.tsx` was rendered nowhere; now `/login` (AuthShell) renders it and redirects to `/dashboard` on success, preserving `?salon=`.
4. **Currency inconsistency** (open). Billing + marketing pricing show **$29/month**; product copy and service prices use **RWF**. Pick one — likely RWF for a Rwanda-market product — and update `billing/page.tsx`, `LandingPage.tsx`, and Stripe price config together.
