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
| `/billing` | AppShell | plan status, upgrade to Pro (admin-only) | — |
| `/marketing` | MarketingShell | ⚠ duplicate of unauthed `/` — see note below | — |

Hierarchy:
```
/                       (marketing when unauthed, app when authed)
├── [views]             Dashboard · Appointments · Customers · Staff · Services · Reports
│                       — currently client-side state in page.tsx, not URLs
├── signup
├── billing
└── marketing           ⚠ consolidate (see below)
```

## Architecture notes (flagged at bootstrap)

1. **Views are state, not URLs.** All six app views render from `/` via a client-side switcher in `page.tsx`. Cost: no deep links ("send me the reports page"), back button doesn't work between views, no per-view code splitting. Recommended migration when convenient: promote to real routes (`/appointments`, `/customers`, `/staff`, `/services`, `/reports`) under a shared AppShell layout. Sidebar already maps 1:1.
2. **Two marketing surfaces.** `MarketingSection` lives inline in `page.tsx` AND as the new uncommitted `/marketing` page. Pick one source of truth: keep the unauthed-`/` render (better for SEO/conversion — visitors land on the root domain) and delete `/marketing`, or extract one shared component both render. Two copies will drift.
