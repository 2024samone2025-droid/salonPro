# Memory — Subdomain hardening merged to main; subdomain tenancy at decision point

Last updated: 2026-06-13 (later session)

## What was built (this session)

- **Merged `feat/signup-subdomain-hardening` → `main`** via fast-forward (`8ad63af..10f04a0`) and **pushed to `origin/main`**. This was the signup subdomain-conflict hardening work (formerly "PR #12, open") — it is now on `main`.

## Prior session recap (still relevant)

The merged signup-hardening work consists of:
- `lib/constants.ts`: `RESERVED_SUBDOMAINS`, `SUBDOMAIN_MIN/MAX_LENGTH` (3/30), `validateSubdomain()` — client-safe single source of truth.
- `api/salons` POST: shared validation + **Prisma P2002 catch → 409** (race-safe). GET: same validation + `{ available, reason }`.
- `signup/page.tsx`: debounced (450ms) live availability check, abort-on-keystroke latest-wins, status line, submit gated on `available`.
- Docs updated: `DATA_MODELS.md`, `DESIGN_SYSTEM.md`, `TODO.md`. lint + tsc were clean.
- Earlier: PR #11 (merged) — `/context/` docs + `CLAUDE.md`, retired radix toast, deleted `lib/prisma.ts`, fixed payment-status `partial` bug, dropped unused deps `@tanstack/react-query` + `next-themes`.

## Decisions made

- **`main` is canonical**; `/context/` = engineering quick-ref, `specs/ui/` = design source of truth.
- **Commit after every change** (persistent preference): incremental commits, branch off `main`, don't push unless asked.
- **Subdomain tenancy — recommended approach is Option A** (header-based scoping), pending user confirmation (see below).
- This session: user chose **fast-forward merge** (not `--no-ff`) and **discarded** the `.gitignore` change that would have ignored `context/memory.md`.

## Problems solved (prior, keep for reference)

- **Recurring disk-full** root cause = `~/.local/share/Trash` (4.9G). File-manager deletes don't free space; use `rm -rf` or empty Trash.
- **Payment badge bug**: config key didn't match the `partial` value used everywhere — fixed in `lib/constants.ts`.

## Current state

- **On branch `main`**, up to date with `origin/main` (HEAD = `10f04a0`).
- `context/memory.md` is **untracked** on `main` (the `.gitignore` ignore-entry was discarded this session, so it's no longer git-ignored — re-add it if you want it ignored again).
- ⚠️ **Browser smoke test of `/signup` still pending** — never confirmed done. Test: reserved name, `demo` (existing), a fresh name; verify live availability + 409 on race.

## Subdomain-based tenant resolution — AUDIT DONE, NO CODE YET

Goal: each salon reachable at `<sub>.salonpro.com`, sees own data; 404 unknown subdomains; cross-check subdomain vs session to block cross-tenant access; reuse `validateSubdomain`.

**Audit findings (key):**
- `src/middleware.ts` reads the **`?salon=` query param, NOT the Host header**; sets `x-salon-subdomain` for `/api/*`. No rewrites. **Edge runtime — cannot use Prisma**.
- App routes are **flat under `(app)/`** — no `[subdomain]` segment. Only `/book/[subdomain]` + `/api/public/booking/[subdomain]` are subdomain-aware (path param).
- **`(app)/layout.tsx` is a client component** — auth gate via `useAuth()`; no server-side salon resolution / `notFound()`.
- Data scoped by **`requireAuth().salonId` = session token's salonId**, never the subdomain. `x-salon-subdomain` header read only by `api/auth/login` (picks salon to auth against; falls back to `?salon=` then `'demo'`).
- **Tenant isolation already exists but is session-based**, established at login via `?salon=`; production has zero Host awareness.

**Gaps to close:** (1) middleware Host parsing; (2) subdomain→salon lookup + `notFound()` (must be Node context, not edge); (3) enforce `session.salonId === resolvedSalon.id`.

## Next session starts with

Get the user's answers to 3 pending (blocking) questions, then implement:
1. **Routing strategy — Option A (header-based, recommended) vs B (path rewrite to `/[subdomain]/...`).** A keeps flat routes + leverages session isolation; B re-nests every route under a `[subdomain]` segment.
2. **On subdomain↔session mismatch** (admin A visits salonB's host): redirect to that salon's `/login` (recommended) vs hard 403.
3. **Dev testing**: support both `sub.localhost:3000` AND `?salon=` fallback (recommended) vs `sub.localhost` only.

Then (for Option A): middleware parses Host → `x-salon-subdomain` (reuse `validateSubdomain`); convert `(app)/layout.tsx` into a server wrapper that resolves the salon via `prisma.salon.findUnique` + `notFound()` and renders the existing client shell as a child; add session↔subdomain enforcement in `requireAuth`. Then update `context/ARCHITECTURE.md` + `TODO.md`.

## Open questions

- The 3 questions above (routing strategy / mismatch behavior / dev mode) — blocking implementation.
- Infra prerequisite (out of code scope): wildcard DNS + Vercel wildcard-domain config for `*.salonpro.com`. Consider a `ROOT_DOMAIN` env var rather than hardcoding `salonpro.com`.
- Re-add `/context/memory.md` to `.gitignore`? (was discarded this session.)
- Deferred disk cleanup (not done): `docker system prune -af` (~2.3G, daemon was off); sudo caches `sudo apt-get clean && sudo rm -rf /var/crash/* && sudo journalctl --vacuum-size=50M` (~640M).
