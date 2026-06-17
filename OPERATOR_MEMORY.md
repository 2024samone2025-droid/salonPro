# Memory — Operator Console v1 (BUILT + DEPLOYED LIVE)

Last updated: 2026-06-16

> **Note:** This was previously `memory.md`. The parallel mobile-UX session ran
> `/remember save` and overwrote `memory.md` with its own handoff, so this operator
> handoff was preserved here under `OPERATOR_MEMORY.md`. The "Current state" branch
> section below has been corrected to reflect the mobile session's git cleanup.

> Operator Console v1 is **code-complete AND deployed to production**, live at
> **https://ops.samuelxanda.dev/operator**. Spec + as-built notes:
> `context/operator-console.md` (§11 locked decisions, §12 as-built env/deploy).
> Step-by-step deploy runbook: `OPERATOR_SETUP.md` (repo root, **untracked**).

## What was built / shipped this session

All on `main` now (`07829ff`):
- **PR #31 (merged)** — operator console steps 5–8: middleware `OPERATOR_APP=1`
  404 gate (`src/middleware.ts`); Auth.js Google OIDC (`src/lib/operator-auth.ts`
  + `src/app/api/operator/auth/[...nextauth]/route.ts`); `requireOperator()`
  (`src/lib/operator-guard.ts`); mask helpers (`src/lib/operator-mask.ts`); console
  layout + sign-in (`src/app/operator/{layout.tsx,signin/page.tsx}`); tenant
  directory (`src/app/operator/page.tsx` + `components/operator/DirectoryList.tsx`);
  tenant detail + suspend/reactivate + reveal (`src/app/operator/[salonId]/
  {page.tsx,actions.ts}` + `components/operator/{OwnerContact,StatusActions}.tsx`).
  (Steps 1–4 — status enum/migration, requireAuth gate, public-booking gate, audit
  writer — were already merged earlier in PR #30.)
- **PR #32 (merged)** — sign-in page reads Auth.js `?error=` and renders feedback:
  AccessDenied / Configuration / generic fallback. Fixes the silent-bounce on a
  rejected (non-allowlisted) Google account. Feedback only, no auth behavior change.

## How it's deployed (the operational shape)

- **Two Vercel projects, one repo (`2024samone2025-droid/salonPro`), one Neon DB.**
  - Tenant project: `*.salonpro.me`, **no** `OPERATOR_APP` → operator routes 404.
  - Operator project: domain **`ops.samuelxanda.dev`**, `OPERATOR_APP=1`, production
    branch `main`. Same `DATABASE_URL`/`DIRECT_URL` as tenant.
- **Domain:** `ops.samuelxanda.dev` is a subdomain of the user's `samuelxanda.dev`
  (which is hosted on **Netlify**). Only that ONE subdomain is delegated to Vercel via
  a CNAME → `cname.vercel-dns.com`; the apex stays on Netlify untouched. (Do NOT move
  nameservers to Vercel.)
- **Env vars on the operator project:** `OPERATOR_APP=1`, `OPERATOR_HOST=
  ops.samuelxanda.dev`, `OPERATOR_AUTH_SECRET` (distinct from `AUTH_SECRET`),
  `OPERATOR_ALLOWED_EMAILS`, `GOOGLE_CLIENT_ID/SECRET`, plus the shared `DATABASE_URL`,
  `DIRECT_URL`, `AUTH_SECRET`, `ROOT_DOMAIN` (the shared codebase needs these to boot).
- **Google OIDC:** redirect URI `https://ops.samuelxanda.dev/api/operator/auth/
  callback/google` (+ localhost variant for dev). `GOOGLE_CLIENT_ID` = the
  `…apps.googleusercontent.com` string; `GOOGLE_CLIENT_SECRET` = the `GOCSPX-…` value.

## Verified live (via curl)

- `/operator` → 307 → `/operator/signin`; `/operator/signin` → 200; `/api/operator/
  auth/providers` → 200 with Google configured + correct callback URL.
- `/operator/signin?error=AccessDenied` renders the "Access denied" notice.
- **NOT yet done:** a real end-to-end Google sign-in + functional walk (see next).

## Problems solved

- **No DB migration needed at deploy** — `Salon.status` was already applied to the
  shared Neon DB; operator project just needs the same connection strings.
- **`AUTH_SECRET` collision** — tenant session already uses `AUTH_SECRET`; Auth.js v5
  reads it by default, so operator Auth.js is explicitly given `OPERATOR_AUTH_SECRET`.
- **Operator host check** relaxed when `NODE_ENV !== 'production'` so one localhost dev
  server serves both apps.
- **First deploy 404'd everywhere** because the operator project built from `main`
  before the operator code was merged → fixed by merging PR #31.
- **Sub-on-Netlify/Vercel coexist** — provider attaches per-hostname; apex on
  Netlify + subdomain on Vercel simultaneously via one CNAME.

## Current state (CORRECTED 2026-06-16 after mobile-session git cleanup)

- Operator console is **LIVE and reachable**; SSO + gate + provider all confirmed up.
- The parallel mobile-UX work is now **complete and merged into `feat/operator-console`**
  via **PR #33** (11 `fix(mobile)` commits). The mobile scratch branches
  `fix/mobile-ux-audit` and `fix/mobile-ux-clean` have been **deleted** (local + origin).
- The operator **sign-in-feedback commit** that had been stranded on the mobile scratch
  branch (`3be30f6`) was **relocated onto `feat/operator-console`** as **`f31e799`** and
  pushed; the temporary `rescue/operator-signin-feedback` tag used to protect it has been
  **removed**. No stray operator commit remains on any scratch branch.
- ⚠️ **Verify at next operator→main merge:** the earlier note claimed this sign-in fix is
  already on `main` as `6f8a03d` (PR #32). If true, the same change now also exists on
  `feat/operator-console` as `f31e799` (different SHA, same content). When
  `feat/operator-console` merges to `main`, git should resolve identical content cleanly,
  but confirm there's no duplicate/conflict at that point.
- `feat/operator-console` is the active integration branch; its tip is `f31e799`.
- Untracked at repo root: `OPERATOR_SETUP.md` (deploy runbook).

## Next session starts with

1. **Functional verification walk** (only the user can — real browser, no automation):
   sign in at `https://ops.samuelxanda.dev/operator` with an allowlisted Google
   account → directory loads → open a salon → check counts → Reveal owner contact →
   Suspend with a typed reason → confirm that salon's tenant app blocks access + public
   booking 404s → Reactivate → confirm the SUSPEND/REACTIVATE/REVEAL_PII rows show in
   "Recent operator actions". Confirm a non-allowlisted account sees "Access denied".
2. If Google **OAuth consent screen is in "Testing"**, add operator emails as Test
   users (or publish) so they can sign in.

## Open questions

- Is the Google consent screen published or still in Testing mode? (affects who can sign in)
- Commit `OPERATOR_SETUP.md` to the repo, or keep it as a local-only runbook?
- Enforce operator Host even in dev (via a `salonpro-ops.localhost` hosts entry)
  instead of the current non-prod relax? (deferred call)
- Deferred per §8 (build only when the trigger fires): impersonation, operator RBAC+MFA
  (on hiring a 2nd operator → promote allowlist to an `Operator` table), real Stripe/
  billing actions, `VIEW_TENANT` logging (one-liner), Postgres RLS.
