# SalonPro — Agent Guide

Multi-tenant SaaS for salon management in Rwanda/East Africa. Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Prisma/Postgres. Read the relevant `/context` doc before working in an area.

## Context map
- **What it does, stack, status, gaps** → [context/PROJECT_OVERVIEW.md](./context/PROJECT_OVERVIEW.md)
- **Folders, routing, tenancy, auth, API, state, data fetching** → [context/ARCHITECTURE.md](./context/ARCHITECTURE.md)
- **Design tokens + full component inventory (check before building UI)** → [context/DESIGN_SYSTEM.md](./context/DESIGN_SYSTEM.md)
- **Naming, TS, imports, API & domain conventions** → [context/CODING_STANDARDS.md](./context/CODING_STANDARDS.md)
- **Prisma models + types + API surface** → [context/DATA_MODELS.md](./context/DATA_MODELS.md)
- **Roadmap + cleanup backlog** → [context/TODO.md](./context/TODO.md)
- **Verification loop (run after every change)** → [context/VERIFICATION.md](./context/VERIFICATION.md)
- **Design/product source of truth (intent)** → `specs/ui/` + `specs/product-tour-plan.md`

## Non-negotiables
- **UI**: never hardcode colors/radii/fonts — use the semantic tokens in `globals.css` / Tailwind classes. Check the component inventory before creating anything new. One solid pink (`primary`) button per screen; accent ≤10% of a screen.
- **Multi-tenancy**: every query scopes by `auth.salonId` (from `requireAuth`); never trust `salonId` from the request body.
- **Data client**: import the Prisma singleton from `@/lib/db` (not the empty `lib/prisma.ts`).
- **Money**: stored as plain numbers; format via `formatMoney()`/`formatRWF()`; currency comes from salon settings.
- **Toasts**: use `sonner`. The radix `ui/toaster` is legacy/being retired.

## Working style
- **Verify after every change**: run `npm run verify` (typecheck + lint + build into `.next-verify`). It's the loop that confirms code compiles/builds before it's "done" — see [context/VERIFICATION.md](./context/VERIFICATION.md). Safe to run while the dev server is up (separate build dir).
- Don't run `npm run dev` from the agent, and don't run a plain `npm run build` while the dev server runs (shared `.next`) — use `npm run verify` instead, which builds into `.next-verify`. Verify runtime behaviour visually in the user's browser, not via automation.
- Always `git status` before assuming state — the repo may be edited in parallel.
- `main` is up to date with `feature/saas-multi-tenancy` (merged 2026-06-13).
