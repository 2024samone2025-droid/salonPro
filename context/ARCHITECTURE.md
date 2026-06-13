# Architecture — SalonPro

## Folder structure
```
src/
  app/                      Next.js App Router
    (app)/                  authed route group
      layout.tsx            SERVER: resolve subdomain→salon + notFound() before auth
      AppShell.tsx          client shell: sidebar + topbar + ⌘K + mobile tab bar + auth gate
      dashboard|appointments|customers|staff|services|reports|settings|billing/page.tsx
    api/                    route handlers (see "API" below)
    book/[subdomain]/       public self-booking page (path-param tenant; not Host-resolved)
    login/                  host-branched: owner email/password (root) vs staff PIN (tenant)
    signup/                 create salon + owner account
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
  middleware.ts             Host → x-salon-subdomain header on the request (all tenant routes)
prisma/schema.prisma        data model (see DATA_MODELS.md)
specs/                      design/product source-of-truth docs
```

## Routing
- **App Router** only (no `pages/`).
- **`(app)` route group** holds every authed screen behind one shared `layout.tsx`. Page files are thin wrappers — they render a view component: `export default () => <CustomersView />`.
- **Views are URLs, not state.** Navigation goes through real routes; the sidebar, ⌘K palette, and dashboard links all `router.push`. Zustand no longer holds nav state.
- Public/unauthed: `/` (marketing), `/login`, `/signup`, `/book/[subdomain]`.
- Full route table + shell mapping: `specs/ui/routes.md` and `specs/ui/app-shell.md`.

## Multi-tenancy (Host is the authority)
The operating salon is derived from the **request Host**, never the token or request body. Two-stage resolution:
1. **Edge (middleware, no DB):** `lib/subdomain.ts` extracts the subdomain *label* from `Host` vs `ROOT_DOMAIN` (apex/`www`/reserved → no tenant; dev `*.localhost` + dev-only `?salon=` fallback). It's forwarded on the **request** header `x-salon-subdomain` for all tenant routes — *except* the path-param public booking surface (`/book/[subdomain]`, `/api/public/booking/[subdomain]`).
2. **Node (Prisma):** the `(app)` **server** layout and `requireAuth`/`/api/auth/me` look up `subdomain → salon` and `notFound()` (pages) / 404 (API) unknown subdomains.
- `requireAuth` reads `salonId` from the resolved Host and **verifies membership** (see below); a per-request indexed `salon.findUnique` (no cache yet — invalidation is the real work when one is added). `ROOT_DOMAIN` env: `salonpro.me` prod / `localhost:3000` dev.
- **Every** domain model carries `salonId` and every query is scoped by `auth.salonId`. Cascade deletes from `Salon`.

## Authentication & authorization (two surfaces)
Cookie-only (the Bearer/`localStorage` channel was retired). The `salonpro_session` cookie is **host-only** (no `Domain`), so it's naturally isolated per subdomain. Logic in `src/lib/auth.ts`; guard in `src/lib/auth-guard.ts` (`requireAuth(req?, permission?)`). `AUTH_SECRET` is **required** (no fallback — fails loudly).

- **Staff** — per-salon `User`, name + SHA-256 **PIN**, login at the tenant host (`<sub>/login`). Roles: `admin`, `receptionist`, `stylist` (`src/lib/permissions.ts`, `ROLE_PERMISSIONS`, client-safe).
- **Owner** — global `Owner` (email + **scrypt** password, `lib/password.ts`), logs in at the **root** host (`/login`), gets a short-lived root-owner cookie (`salonpro_owner`), picks a salon, and is handed off to the subdomain via a **single-use exchange token** (`/api/owner/select` → `/api/auth/exchange`). An owner has **admin** rights to any salon it's linked to via `OwnerSalon` — **no `User` row required**.
- **`requireAuth`** decodes the cookie (discriminated `kind: 'staff' | 'owner'`), resolves the Host salon, then verifies membership: staff → active `User` in that salon; owner → `OwnerSalon` link. Two failures: unknown subdomain → 404; valid subdomain + non-member → **401 identical to no-session** (no existence leak). Role/name come from the fresh DB row.
- **Auth gating is client-side** in `AppShell` (`/api/auth/me`); the **server** `(app)` layout only does salon-resolution + `notFound()` (a logged-out visitor briefly sees the shell before the client redirect — known-deferred). Owners have no `User`, so `/api/auth/me` and `users/me/tour-complete` branch on `kind`.
- Server routes enforce via `requireAuth`; nav visibility via `nav-items.ts` (display only — does **not** guard routes).

## API layer
Route handlers under `src/app/api/*/route.ts`. Convention (see `api/customers/route.ts` as the reference):
```ts
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)          // or requireAuth(req, 'canDeleteRecords')
  if (!auth.authorized) return auth.error
  const where = { salonId: auth.salonId, ... } // auth.salonId = Host-resolved salon
  ...
  return NextResponse.json(data)               // POST returns { status: 201 }
}
```
- Standard verbs per resource: `GET` (list/filter), `POST` (create), `PUT` (update by `id` in body), `DELETE` (`?id=`).
- Role checks inline (`auth.user?.role === 'stylist'` → 403) and via the permission arg to `requireAuth`.
- **Free-plan limits** enforced in create handlers (e.g. max 100 customers, 5 staff) → 403 with upgrade message.
- Resources: appointments, customers, staff, services, payments, dashboard, reports, salons, seed; `auth/*` (login, logout, me, signup, **exchange**), `owner/*` (**login, me, select** — root-host owner flow), `billing/*` (mock), `salon/settings`, `users/*` (+ `users/me/tour-complete`), `public/booking/[subdomain]` (+ `/slots`).

## Data fetching
- **Client-side fetch.** `(app)` pages are server components that render `'use client'` view components; each view fetches its own data with `useState` + `useEffect` + raw `fetch()`. No props passed down from the page.
- No data-fetching library — `@tanstack/react-query` was removed (unused). Cookie auth rides along automatically on same-origin requests; `authFetch` is now a thin `fetch` wrapper.

## State management
- **Zustand** (`src/lib/salon-store.ts`): current salon info, selected date, ⌘K open state, mobile sidebar open. Nav is URL-based, not in the store.
- **React Context** (`src/lib/auth-context.tsx`): current user, salon, role permissions; wraps the `(app)` tree (and the landing's CTA).

## Key `lib/` modules
| File | Purpose |
|---|---|
| `db.ts` | Prisma client singleton (`db`). **Use this.** |
| `auth.ts` | session create/verify (staff + owner, discriminated `kind`), PIN hashing, root-owner + single-use exchange tokens, `AUTH_SECRET` (required) |
| `password.ts` | scrypt `hashPassword`/`verifyPassword` (owner passwords; NOT staff PINs) |
| `subdomain.ts` | edge-safe `getSubdomainLabel(host, ROOT_DOMAIN)` + `SALON_SUBDOMAIN_HEADER` |
| `auth-guard.ts` | `requireAuth(req?, permission?)` → `{ authorized, user, permissions, salonId, error }`; salonId from Host + membership verify |
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
