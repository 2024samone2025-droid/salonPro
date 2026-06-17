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

- [ ] 1. Branch `feat/subscriptions` off main + this tracker file
- [ ] 2. Schema: paste Plan/Subscription/BillingPayment/SubscriptionStatus + 2 Salon relations
- [ ] 3. Migrate: `prisma migrate dev --name add_subscriptions` (report verbatim on any prompt)
- [ ] 4. Place logic files: entitlements.ts + billing.ts → src/lib/
- [ ] 5. Seed: prisma/seed.subscriptions.ts + run `npx tsx` (free+pro plans, backfill subs)
- [ ] 6. Seam — checkout route → `applyPlanChange(salonId, 'pro')`
- [ ] 7. Seam — webhook route → activate: applyPlanChange + recordPayment; cancel: setStatus CANCELED
- [ ] 8. Entitlements — customers route → `isAtLimit(salonId, 'maxCustomers', count)`
- [ ] 9. Verify: `tsc --noEmit`; grep remaining plan checks
- [ ] 10. Report: migration result, files changed, remaining scattered plan checks

## Explicitly NOT in scope (do not implement)

Payment gateway integration · proration · dunning/retries · downgrade overflow
handling (the `applyPlanChange` overflow hook stays a comment) · any plan beyond
free/pro · Stripe signature verification · UI redesign.

## Migration result

_(filled in at step 3)_

## Remaining scattered plan checks (step 9 — report only, do NOT change)

_(filled in at step 9)_

## Files changed

_(running list, filled per commit)_
