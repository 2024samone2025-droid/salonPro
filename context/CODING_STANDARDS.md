# Coding Standards — SalonPro

Derived from the existing codebase. When in doubt, match the surrounding file.

## Language & types
- **TypeScript everywhere**, `strict` (see `tsconfig.json`). No `any` — prefer explicit interfaces or `unknown` + narrowing (e.g. `Record<string, unknown>` for dynamic Prisma `where`).
- Export shared types from where the data lives: domain unions in `lib/constants.ts` (`AppointmentStatus`, `PaymentStatus`), permissions in `lib/permissions.ts` (`UserRole`, `Permissions`), settings in `lib/salon-settings.ts`.
- Derive types from data with `as const` + `keyof typeof` (see `STATUS_CONFIG`). Don't hand-maintain parallel union lists.
- Component props: inline `interface XProps` above the component, or inline `{ ... }: { ... }` for tiny ones. Default values via destructuring defaults.

## Naming & files
- **Components**: PascalCase files and exports. Feature components in `src/components/salon/` are PascalCase (`CustomersView.tsx`); shadcn primitives in `src/components/ui/` are kebab-case (`dropdown-menu.tsx`) — keep that split.
- **Non-component modules**: kebab-case (`auth-guard.ts`, `salon-settings.ts`, `nav-items.ts`).
- **Hooks**: `use-*.ts` (`use-mobile.ts`).
- **Route handlers**: always `route.ts`; folder name is the URL segment; dynamic segments `[param]`.
- Variables/functions camelCase; constants/config objects SCREAMING_SNAKE or `as const` objects (`ROLE_PERMISSIONS`, `STATUS_CONFIG`, `FREE_PLAN_LIMITS`).

## Imports
- Use the **`@/` alias** for everything under `src/` (`@/components/ui/button`, `@/lib/utils`). No deep relative `../../`.
- Rough order (as seen in files): external packages → `next/*` → `@/components/*` → `@/lib/*` / `@/hooks/*` → types. Group related imports.
- Aliases (from `components.json`): `@/components`, `@/components/ui`, `@/lib`, `@/hooks`, `@/lib/utils`.

## React / Next
- Mark interactive components `'use client'` at the top. `(app)` page files stay server components that just render a client view.
- Data fetching in client views: `useState` + `useEffect` + `fetch()`; wrap callbacks in `useCallback` where they're deps. Show `Skeleton` while loading and `Loader2` spinners for async actions — **no full-page spinners**.
- Class names: compose with **`cn()`** (`@/lib/utils`) — never string-concatenate conditional classes.
- Icons from `lucide-react`. Use semantic Tailwind tokens for color (see [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)) — no raw hex in JSX.

## API route conventions
- First line of every handler: `const auth = await requireAuth(req[, 'permissionKey']); if (!auth.authorized) return auth.error`.
- **Scope every query by `auth.salonId`.** Never accept `salonId` from the request body.
- Verbs: `GET` list/filter (query params), `POST` create (→ `201`), `PUT` update (`id` in body), `DELETE` (`?id=`).
- Errors: `NextResponse.json({ error: 'message' }, { status })` — `400` bad input, `403` permission/plan limit, `404` not found.
- Enforce plan limits in create handlers (pattern in `api/customers/route.ts`).

## Domain rules
- **Money is display-only**: store plain numbers; format with `formatMoney(amount, currency)` / `formatRWF()`. Currency comes from salon settings, not hardcoded.
- **Salon settings**: always read via `parseSalonSettings()` so partial/missing JSON falls back to defaults.
- **Roles**: check against `ROLE_PERMISSIONS` (server) — don't scatter literal role strings; nav visibility via `navItemsForRole()`.
- Sentence case for user-facing labels/buttons.

## Quality gates
- `npm run lint` (ESLint flat config, `eslint-config-next`) must be clean — 0 errors before committing.
- `tsc` clean (no type errors).
- Don't run `npm run build` while the dev server is running (they share `.next`).
