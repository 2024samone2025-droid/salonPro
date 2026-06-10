# Routes — SalonPro

Tenancy: salon resolved from subdomain (dev: `?salon=` query param) via `src/middleware.ts`. All authed routes are scoped to the resolved salon.

| Route | Shell | Purpose (one line) | Spec |
|---|---|---|---|
| `/` (unauthed) | MarketingShell | landing: pitch, features, pricing, trial CTA | — |
| `/` (authed) | AppShell | dashboard: today's stats + upcoming appointments | — |
| `/` → Appointments view | AppShell | day/week calendar; book, reschedule, cancel | — |
| `/` → Customers view | AppShell | client list + history | — |
| `/` → Staff view | AppShell | staff roster + availability | — |
| `/` → Services view | AppShell | service catalog + prices | — |
| `/` → Reports view | AppShell | revenue and activity reports | — |
| `/signup` | AuthShell | create salon + admin account (onboarding) | — |
| `/login` | AuthShell | staff sign-in (name + PIN); redirects to `/` when authed | — |
| `/billing` | AppShell | plan status, upgrade to Pro (admin-only) | — |
| `/marketing` | MarketingShell | renders shared `LandingPage` — kept as alias of unauthed `/`, candidate for deletion | — |

Hierarchy:
```
/                       (marketing when unauthed, app when authed)
├── [views]             Dashboard · Appointments · Customers · Staff · Services · Reports
│                       — currently client-side state in page.tsx, not URLs
├── signup
├── login
├── billing
└── marketing           alias of unauthed / (shared LandingPage component)
```

## Architecture notes

1. **Views are state, not URLs** (open). All six app views render from `/` via a client-side switcher in `page.tsx`. Cost: no deep links ("send me the reports page"), back button doesn't work between views, no per-view code splitting. Recommended migration when convenient: promote to real routes (`/appointments`, `/customers`, `/staff`, `/services`, `/reports`) under a shared AppShell layout. Sidebar already maps 1:1.
2. **Marketing duplication** (resolved 2026-06-10). Both unauthed `/` and `/marketing` now render the single `src/components/marketing/LandingPage.tsx`. `/marketing` is a thin alias kept so nothing links into a 404 — delete the folder once confirmed nothing references it.
3. **Login reachability** (resolved 2026-06-10). `LoginPage.tsx` was rendered nowhere; the old marketing header linked to a dead `#login` anchor. Now `/login` (AuthShell) renders it and redirects to `/` on success, preserving `?salon=`.
4. **Currency inconsistency** (open). Billing + marketing pricing show **$29/month**; product copy and service prices use **RWF**. Pick one — likely RWF for a Rwanda-market product — and update `billing/page.tsx`, `LandingPage.tsx`, and Stripe price config together.
