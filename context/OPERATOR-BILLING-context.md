# Operator Manual Billing — Build Spec & Tracker (SOURCE OF TRUTH)

> **Approved 2026-06-16 (architect session). Build TOMORROW, committed in chunks.**
> Read THIS file at build time — it is complete, so you do not need to re-derive the
> design. No code has been written yet. Branch not created yet.
>
> Related context: `context/SUBSCRIPTIONS-context.md` (the subscription tables + seam this
> builds on) and `context/operator-console.md` (the operator console; its §billing "stub"
> guidance is now SUPERSEDED by this file — real subscription data exists now).

---

## Goal (one paragraph)

Turn the operator console's dead "managed in Stripe" billing stub into a real **manual
subscription manager**. The operator records out-of-band payments (MoMo/Airtel/cash/bank),
which automatically extend the paid period and put the salon on **pro** with a scheduled
downgrade to **free** at period end. When a pro period lapses with no new payment, the salon
**auto-downgrades to free** (still usable on free limits) — evaluated lazily in `requireAuth`
(no cron exists). Non-payment NEVER suspends; SUSPEND stays a separate abuse-only action.
Every billing action is logged to the operator audit trail. No payment gateway — deferred to scale.

---

## Language (agreed)

- **Manual billing** — operator records payments + sets plan/period by hand; no gateway, no automation until scale.
- **Lapse** — a pro period ending with no new payment → **auto-downgrade to free**; salon stays ACTIVE on free limits.
- **Access cutoff** — ONLY `Salon.status = SUSPENDED` cuts access (enforced in requireAuth 403 + public booking 404). Billing never cuts access. `Subscription.status` is a tracking label, NOT an access gate.
- **The seam** — the shared functions in `src/lib/billing.ts`. The operator UI calls ONLY these; no billing logic in route handlers / server actions beyond calling the seam.

---

## Decisions (LOCKED)

1. **Lapse = auto-downgrade to free** (not suspend). Recording a pro payment sets the salon to
   pro with `pendingPlanId = 'free'`; when the period ends, the pending change applies → free.
   Free is fully usable (free limits, e.g. 100 customers). Suspend is unrelated to billing.
2. **Lazy downgrade in `requireAuth`** — after resolving the salon, call
   `applyDuePlanChange(salonId)` **best-effort** (try/catch, no-op unless the period actually
   ended). No cron; self-heals on the salon's next authed request. (Edge case accepted: a salon
   that only takes public bookings and never authenticates stays pro longer.)
3. **Operator v1 actions:** (a) Record payment — auto-extends period + ensures pro + schedules
   free downgrade + logs payment; (b) Change plan — free↔pro immediate; (c) Set subscription
   status — label only; (d) Payment history — read.
4. **Billing panel = real summary** — plan + price, status badge, period-end, pending-downgrade
   indicator, payment history, action buttons. **Remove the Stripe text + (dead) link entirely.**
5. **Period auto-computed** from the plan's `interval` (monthly → +1 month; annual → +1 year),
   stacked from `max(now, current periodEnd)` so renewals add time rather than reset it.
   `extendPeriod` takes an ABSOLUTE date (idempotent by design).
6. **Seam goes tx-aware** — billing fns gain an optional Prisma client param (mirroring the
   already-tx-aware `createDefaultSubscription`) so each operator action writes its audit row in
   the SAME transaction as the change (matches the suspend/reactivate `writeOperatorAuditTx`
   pattern). State changes are atomic with their audit receipt.
7. **New audit actions** added to the `OperatorAction` enum: `RECORD_PAYMENT`, `CHANGE_PLAN`,
   `SET_SUB_STATUS`. Applied via `db push` (additive enum values; safe — note `migrate dev` is
   broken on this repo, see SUBSCRIPTIONS-context). The spec already anticipated `CHANGE_PLAN`.

---

## Assumptions (flag if wrong before building)

- **Branch base:** stack on `fix/subscription-invariant` (it has `createDefaultSubscription` +
  `recordPayment` subscriptionId linkage this depends on). Rebase to `main` once PR #37 merges.
  If #37 is already merged tomorrow, branch off `main`.
- Build is committed **in chunks tomorrow** (one commit per step below), not today.
- The seam functions get an OPTIONAL `client: Prisma.TransactionClient | typeof db = db` param —
  backward-compatible, existing callers unaffected.
- Leave the unused `Salon.stripeCustomerId` / `stripeSubscriptionId` columns in place (dropping =
  data-loss prompt; harmless). Just stop referencing them in the UI.

---

## OPEN QUESTION (decide before/at build) — tenant-side mock upgrade

The tenant-facing `/billing` page + `POST /api/billing/checkout` still let a salon self-upgrade
to **pro for FREE** via a mock button (`applyPlanChange(salon.id, 'pro')`, no payment). This
**contradicts manual billing** — a tenant could grant themselves pro. Options:
- (A) Out of scope here → handle in a separate follow-up.
- (B) In this branch, disable the self-upgrade: change the button to "Contact us to upgrade"
  (or similar) and make `checkout` return 4xx, since upgrades are operator-only now.

**Recommendation: (B)** — leaving a free self-upgrade live while building manual billing is
incoherent. But it touches tenant UI, so confirm. **Not yet decided.**

---

## Build steps — ✅ ALL DONE (branch `feat/operator-billing`, off `fix/subscription-invariant`)

> tsc 0 / eslint clean. Open question resolved as (B): tenant self-upgrade disabled.
> Decision (B) chosen for the tenant-side. `BILLING_WEBHOOK_SECRET` note unrelated here.

- [x] 1. **Branch** off `fix/subscription-invariant` (or `main` if #37 merged). This tracker already exists.
- [x] 2. **Schema:** add `RECORD_PAYMENT`, `CHANGE_PLAN`, `SET_SUB_STATUS` to `OperatorAction`; `db push`.
- [x] 3. **Seam (`src/lib/billing.ts`):** add optional tx-client param to the billing fns used by
      operator actions; add the compound "record manual payment" logic (atomic: log payment +
      ensure pro + extend by plan interval + schedule free downgrade + status ACTIVE).
- [x] 4. **Lazy downgrade:** in `src/lib/auth-guard.ts` `requireAuth`, after the salon is resolved,
      `applyDuePlanChange(salon.id)` wrapped best-effort (try/catch; never blocks auth).
- [x] 5. **Operator server actions** (`src/app/operator/[salonId]/actions.ts`):
      `recordBillingPayment`, `changeSalonPlan`, `setSubscriptionStatus` — each `requireOperator()`
      + transactional audit (RECORD_PAYMENT / CHANGE_PLAN / SET_SUB_STATUS).
- [x] 6. **Billing panel** (`src/app/operator/[salonId]/page.tsx`): replace the Stripe stub with the
      real summary (plan+price, status, period-end, pending-downgrade) + payment history list.
- [x] 7. **Billing actions client component** (`src/components/operator/BillingActions.tsx`, mirrors
      `StatusActions.tsx`): shadcn dialogs/forms for record-payment / change-plan / set-status; wire
      into the detail page. Use existing shadcn ui components — do not hand-roll.
- [x] 8. **(Open Q) Tenant-side:** if decided (B), disable the mock self-upgrade (`/billing` button +
      `api/billing/checkout`).
- [x] 9. **Verify:** `tsc --noEmit` + eslint clean. Sanity: a recorded payment → pro + period +
      pendingPlanId=free; a lapsed period → free on the salon's next authed request; audit rows written.

---

## What the operator actually DOES (the recurring workflow — for the UI to support)

1. Salon owner pays out-of-band (MoMo/Airtel/cash/bank).
2. Operator → salon detail → Billing panel → **Record payment** (amount, method, reference, optional
   date). System: logs `BillingPayment`, ensures plan=pro, extends `periodEnd` by interval, sets
   `pendingPlanId='free'`, status=ACTIVE, audited RECORD_PAYMENT.
3. Renewal next month → Record payment again → period stacks (+1 month from current end).
4. No payment by period end → on the salon's next authed request, `applyDuePlanChange` applies the
   pending free downgrade → plan=free, still ACTIVE, free limits. Operator does nothing.
5. **Change plan** = administrative override (comp a salon to pro, or force free now) — separate from payment.
6. **Set status** = label for the operator's own tracking (e.g. mark CANCELED on churn).
7. **Suspend** (existing, separate) = abuse/policy only — never for non-payment.

---

## OUT OF SCOPE (do NOT build)

Payment gateway / Stripe (deferred to scale) · proration / partial-period refunds · dunning /
reminder emails (no email infra) · access-cutting via subscription status (decided: lapse =
downgrade-to-free, not suspend) · any "restricted" access-level behaviour · multi-currency beyond
RWF · analytics/MRR. Migration-history baseline repair is still a separate pre-existing follow-up.
