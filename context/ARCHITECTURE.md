# Architecture — SalonPro

## Folder structure
```
src/
  app/                      Next.js App Router
    (app)/                  authed route group — shared layout (auth gate + shell)
      layout.tsx            sidebar + topbar + ⌘K + mobile tab bar; client-side auth gate
      dashboard|appointments|customers|staff|services|reports|settings|billing/page.tsx
    api/                    route handlers (see "API" below)
    book/[subdomain]/       public self-booking page
    login/, signup/         auth screens (AuthShell)
    page.tsx                marketing landing ("/")
    layout.tsx              root layout: fonts, theme bootstrap script, <Toaster>
    globals.css             design tokens (single source of truth) + tour CSS
    icon.svg, not-found.tsx, global-error.tsx
  components/
    ui/                     shadcn primitives (47) — themed via tokens
    salon/                  feature views + shared app components (see DESIGN_SYSTEM.md)
    booking/BookingFlow.tsx public booking UI
    marketing/              LandingPage.tsx + scoped landing.css (own theme)
    theme-toggle.tsx        light/dark switch
  hooks/                    use-mobile, use-toast (legacy)
  lib/                      data, auth, domain logic (see "Key modules")
  middleware.ts             subdomain → x-salon-subdomain header
prisma/schema.prisma        data model (see DATA_MODELS.md)
specs/                      design/product source-of-truth docs
```

## Routing
- **App Router** only (no `pages/`).
- **`(app)` route group** holds every authed screen behind one shared `layout.tsx`. Page files are thin wrappers — they render a view component: `export default () => <CustomersView />`.
- **Views are URLs, not state.** Navigation goes through real routes; the sidebar, ⌘K palette, and dashboard links all `router.push`. Zustand no longer holds nav state.
- Public/unauthed: `/` (marketing), `/login`, `/signup`, `/book/[subdomain]`.
- Full route table + shell mapping: `specs/ui/routes.md` and `specs/ui/app-shell.md`.

## Multi-tenancy
- Salon resolved from **subdomain** in `src/middleware.ts` (dev: `?salon=` query param), which sets an `x-salon-subdomain` header for API routes.
- **Every** domain model carries `salonId` and every query is scoped by it. Cascade deletes from `Salon`.

## Authentication & authorization
- **Auth**: name + SHA-256-hashed **PIN**, signed session cookie (`salonpro_session`, 7-day). Logic in `src/lib/auth.ts`; route guard in `src/lib/auth-guard.ts` (`requireAuth(req, permission?)`).
- **Auth gating is client-side** in `(app)/layout.tsx` (localStorage token + `/api/auth/me`); unauthenticated visits redirect to `/login` preserving `?salon=`. **No middleware auth.**
- **Roles**: `admin`, `receptionist`, `stylist`. Permission matrix in `src/lib/permissions.ts` (`ROLE_PERMISSIONS`, client-safe). Server routes enforce via `requireAuth`; nav visibility filtered via `src/components/salon/nav-items.ts` (display only — does **not** guard routes).

## API layer
Route handlers under `src/app/api/*/route.ts`. Convention (see `api/customers/route.ts` as the reference):
```ts
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)          // or requireAuth(req, 'canDeleteRecords')
  if (!auth.authorized) return auth.error
  const where = { salonId: auth.salonId, ... } // ALWAYS scope by salonId
  ...
  return NextResponse.json(data)               // POST returns { status: 201 }
}
```
- Standard verbs per resource: `GET` (list/filter), `POST` (create), `PUT` (update by `id` in body), `DELETE` (`?id=`).
- Role checks inline (`auth.user?.role === 'stylist'` → 403) and via the permission arg to `requireAuth`.
- **Free-plan limits** enforced in create handlers (e.g. max 100 customers, 5 staff) → 403 with upgrade message.
- Resources: appointments, customers, staff, services, payments, dashboard, reports, salons, seed; `auth/*`, `billing/*` (mock), `salon/settings`, `users/*` (+ `users/me/tour-complete`), `public/booking/[subdomain]` (+ `/slots`).

## Data fetching
- **Client-side fetch.** `(app)` pages are server components that render `'use client'` view components; each view fetches its own data with `useState` + `useEffect` + raw `fetch()`. No props passed down from the page.
- `@tanstack/react-query` is installed but **not currently used** (no `QueryClientProvider`). See cleanup notes in `CLAUDE.md` / [TODO.md](./TODO.md).

## State management
- **Zustand** (`src/lib/salon-store.ts`): current salon info, selected date, ⌘K open state, mobile sidebar open. Nav is URL-based, not in the store.
- **React Context** (`src/lib/auth-context.tsx`): current user, salon, role permissions; wraps the `(app)` tree (and the landing's CTA).

## Key `lib/` modules
| File | Purpose |
|---|---|
| `db.ts` | Prisma client singleton (`db`). **Use this** — `prisma.ts` is an empty dead file. |
| `auth.ts` | session create/verify, PIN hashing, server-side role re-exports |
| `auth-guard.ts` | `requireAuth(req, permission?)` → `{ authorized, user, permissions, salonId, error }` |
| `permissions.ts` | `ROLE_PERMISSIONS`, `ROLE_LABELS`, `PERMISSION_MATRIX_ROWS` (client-safe) |
| `salon-settings.ts` | `SalonSettings` type + `parseSalonSettings()` (always read settings through it), currencies, business-hours defaults |
| `salon-store.ts` | Zustand store |
| `auth-context.tsx` | auth React context/provider |
| `constants.ts` | `STATUS_CONFIG`, `PAYMENT_STATUS_CONFIG` + status types (token-based classes) |
| `utils.ts` | `cn()`, `formatMoney()`, `formatRWF()` |
| `tour.ts` | Driver.js tour steps/config |
| `stripe.ts` | placeholder stub (mock billing) |

## Conventions to preserve
- New authed data screen → add a page under `(app)/`, a view in `components/salon/`, a `salonId`-scoped API route, and a nav entry in `nav-items.ts` if it needs navigation.
- Every API query/mutation is scoped by `auth.salonId`. Never trust a `salonId` from the request body.
- Currency is display-only formatting (`formatMoney`); amounts stored as plain numbers, no conversion.
