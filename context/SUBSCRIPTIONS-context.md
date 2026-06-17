# Subscriptions Integration — Source of Truth & Progress Tracker

> Living doc for integrating subscription management into SalonPro. This file is
> the authoritative plan + progress log. Update the checklist as each step lands.
> Branch: **`feat/subscriptions`** (off `origin/main`). Commit per step.

## Goal

Replace the mocked `Salon.plan` string-flipping with a real relational
subscription model, routed through a shared seam (`billing.ts`) and an
entitlements layer (`entitlements.ts`). `Salon.plan` stays as a **synced
denormalized cache** so existing reads (operator console, billing page) keep
working unchanged. **No Stripe, no gateway, no real webhooks, no UI redesign.**

## Source files (prepared, in `context/`)

- `context/subscription-models.prisma` — Plan, Subscription, BillingPayment, SubscriptionStatus enum (+ 2 Salon relation lines).
- `context/entitlements.ts` → `src/lib/entitlements.ts`
- `context/billing.ts` → `src/lib/billing.ts`
- `context/seed.subscriptions.ts` → `prisma/seed.subscriptions.ts`

Files are used **verbatim** — not "improved".

## Key decisions (locked)

- **Branch** `feat/subscriptions` off `origin/main` (verified main has billing routes, customers route, full Salon model). Commit per change.
- **Migration safety:** `prisma migrate status` = "up to date, no drift" before starting → migration applies additively with **no reset**. HARD RULE: if Prisma proposes a reset or reports drift, STOP and paste it verbatim. Never lose data.
- **Migration is additive only:** 3 new tables + 1 enum + 2 back-relations on Salon. No existing column changed/renamed/removed. `Salon.plan String @default("free")` stays.
- **Seed runner:** `npx tsx prisma/seed.subscriptions.ts` (tsx not installed → npx fetches it transiently).
- **"three relation lines" discrepancy:** the prepared file actually shows **two** back-relations (`subscription Subscription?`, `billingPayments BillingPayment[]`). Two is correct; added two.
- **Webhook mock inputs:** webhook reads optional `?reference=&amount=&method=` from query; defaults → Pro price, `method: 'manual'`, stable reference `mock-${salonId}-activate` (so idempotency guard works on re-fires). Mock shape only — no Stripe signatures.
- **All business logic stays in `src/lib/billing.ts`;** route handlers only call seam functions.

## Progress checklist

- [x] 1. Branch `feat/subscriptions` off main + this tracker file
- [x] 2. Schema: paste Plan/Subscription/BillingPayment/SubscriptionStatus + 2 Salon relations
- [x] 3. Migrate — see "Migration result" below (used `db push`, not `migrate dev`)
- [x] 4. Place logic files: entitlements.ts + billing.ts → src/lib/
- [x] 5. Seed: prisma/seed.subscriptions.ts + run `npx tsx` (free+pro plans, backfill subs)
- [x] 6. Seam — checkout route → `applyPlanChange(salonId, 'pro')`
- [x] 7. Seam — webhook route → activate: applyPlanChange + recordPayment; cancel: setStatus CANCELED
- [x] 8. Entitlements — customers route → `isAtLimit(salonId, 'maxCustomers', count)`
- [x] 9. Verify: `tsc --noEmit` (0 errors); grep remaining plan checks (below)
- [x] 10. Report: migration result, files changed, remaining scattered plan checks

## Explicitly NOT in scope (do not implement)

Payment gateway integration · proration · dunning/retries · downgrade overflow
handling (the `applyPlanChange` overflow hook stays a comment) · any plan beyond
free/pro · Stripe signature verification · UI redesign.

## Migration result

**`prisma migrate dev` FAILED — used `prisma db push` instead (Option A, user-approved).**

- `migrate dev` aborted with **P3006 / P1014**: migration `20260615000000_staff_invite`
  failed on the **shadow database** ("The underlying table for model `User` does not
  exist"). Root cause: the `_init` migration is a **baseline stub** (`-- Baseline:
  database already contains the expected schema`) that creates nothing, so the history
  isn't replayable from zero on the shadow DB. Pre-existing condition, unrelated to
  subscriptions. The **real Neon DB was never touched** by this (shadow DB only).
- A first `db push` warned about dropping operator/settings columns+tables — that was a
  **stale working tree** (a parallel branch-switch had swapped schema.prisma to a
  pre-operator version). It **refused** (no `--accept-data-loss`), so nothing happened.
- After returning to the correct `feat/subscriptions` schema, **`prisma db push`
  succeeded cleanly**: "Your database is now in sync" — additive only, NO drops, NO
  data-loss prompt. Verified post-push: Plan=0/Subscription=0/BillingPayment=0 (new,
  empty) and existing data intact (Salon=5, DayOff=2, OperatorAuditLog=5).
- **Note:** `db push` creates NO migration file. The migration-history baseline is
  broken and should be repaired separately (out of scope here) before `migrate dev`
  works again.

## Remaining scattered plan checks (step 9 — report only, do NOT change)

Found via grep. **Left unchanged** for us to decide together. Three real
plan-string comparisons remain:

1. **`src/app/(app)/billing/page.tsx`** — `const isPro = salon?.plan === 'pro'`
   (lines 43, 66, 70, 100, 101, 105). The customer-facing billing UI; drives the
   upgrade button / "Subscribed" state. Candidate to move to `getAccess`/plan data,
   but it reads the synced cache so it's correct today.
2. **`src/app/api/billing/checkout/route.ts:18`** — `if (salon.plan === 'pro')`
   the "already subscribed" guard. In a file I edited; left intact intentionally
   (reads the synced cache; harmless). Could become a subscription/status check later.
3. **`src/app/operator/page.tsx:41`** — `rows.filter((r) => r.plan === 'pro').length`
   the operator console "on pro" metric card.

Benign **display reads** of `salon.plan` (NOT comparisons — just surface the cached
string, fine to leave): `api/auth/me:35`, `api/auth/login:64`,
`api/salon/settings:26,102`, `api/salons:20`, `operator/page.tsx:33`,
`operator/[salonId]/page.tsx:113`, `components/operator/DirectoryList.tsx:84`.

## Files changed

- `prisma/schema.prisma` — Plan/Subscription/BillingPayment + SubscriptionStatus + 2 Salon relations
- `src/lib/entitlements.ts` (new) · `src/lib/billing.ts` (new; one type-fix vs source)
- `prisma/seed.subscriptions.ts` (new)
- `src/app/api/billing/checkout/route.ts` — applyPlanChange
- `src/app/api/billing/webhook/route.ts` — applyPlanChange + recordPayment / setStatus
- `src/app/api/customers/route.ts` — isAtLimit (removed FREE_PLAN_LIMITS)
- `context/SUBSCRIPTIONS-context.md` (this tracker) · `context/billing.ts` (same type-fix)

## Status: ALL 10 STEPS COMPLETE. tsc 0 errors, eslint clean. DB additive (no data lost).
