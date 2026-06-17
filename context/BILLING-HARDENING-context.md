# Manual Billing Hardening — Build Spec & Tracker (SOURCE OF TRUTH)

> **Approved 2026-06-16 (architect session).** Read THIS file at build time — it is
> complete, so you do not need to re-derive the design. No code written yet.
>
> Builds directly on `context/OPERATOR-BILLING-context.md` (the manual-billing engine
> that already exists) and `context/SUBSCRIPTIONS-context.md` (the seam + tables). It
> does NOT replace them — it adds the trust layer on top.

---

## Goal (one paragraph)

The manual upgrade flow works but isn't yet *trustworthy*: the owner sees a dead
"Contact us to upgrade" button with no instructions and no visibility, and the operator
records payments **blind** (free-typed amount/reference, no link to what the owner
actually paid, no way to undo a mistake). This work makes manual billing **serious,
solid, secure, and confidence-inspiring** without adding a payment gateway. We do it by:
(1) giving the owner real pay instructions + live status + their own payment history;
(2) hardening the operator's record action (expected-amount check) and adding a
**reversal** path; (3) keeping the money record an **append-only ledger** — payments are
never edited or deleted, mistakes are corrected by reversing entries. (Chosen approach:
**option B** — instructions + hardened recording, NOT a full owner-initiated request
queue.)

---

## Language (agreed)

- **Upgrade** — moving a salon from **free → pro** (pro is the only paid tier; 15,000
  RWF/month). The legacy `Salon.plan` cache + the `Subscription` row both reflect it.
- **Pay** — the owner sends money **out-of-band** (MoMo / Airtel / cash / bank) to one
  SalonPro collection number. **No payment gateway** — explicitly deferred to scale. We
  are NOT integrating the MoMo API.
- **Verified manually** — the operator confirms the money actually arrived (checks their
  own MoMo/bank record) *before* granting pro, then records it. Today that confirmation
  lives only in the operator's head; this work surfaces it in the app.
- **Serious / solid / secure / confidence** — four concrete properties:
  1. the owner can see what to pay and watch the result land (no dead button);
  2. the operator records against a known expected amount, not a blind type-in;
  3. every money change is **idempotent, audited, and reversible** — an immutable,
     append-only ledger where a wrong record is corrected by a reversing entry;
  4. no path ever lets a tenant grant itself pro (already true — kept true).
- **Append-only ledger** — `BillingPayment` rows are **immutable once written**. A
  mistake is fixed by writing a **REVERSAL** row that points back at the original and
  rolls the paid period back. `SUM(amount)` over the ledger = true net revenue.
- **Reversal** — a new `BillingPayment` row (`kind = REVERSAL`, negative amount) that
  references the payment it cancels and (when safe) restores the prior period-end.

---

## Decisions (LOCKED)

1. **Option B, not a request queue.** No owner-initiated PENDING request / operator
   approval queue. The owner pays out-of-band and pings the operator out-of-band (e.g.
   WhatsApp). Upgrade volume is low enough today that a queue is overkill. (If volume
   grows, the "full loop A" is the documented next step — see Out of scope.)
2. **Append-only ledger (no edit/delete of payments).** Corrections are reversing
   entries, never mutations of the original row. This is the core "serious money" rule.
3. **Reversal rolls the period back deterministically, with a no-silent-miscompute
   guard.** A reversal restores the original payment's `periodEndBefore` **only if** the
   subscription's current `periodEnd` still equals that payment's `periodEndAfter` (i.e.
   nothing later moved it). If a *newer* payment superseded it, we still record the
   reversal but **leave the period untouched and flag "period needs a manual check"** —
   never guess the math. After a successful rollback, if the period is now expired/None
   and a free downgrade is pending, apply it immediately in the same tx (so the UI shows
   the truth at once, not on the salon's next request).
4. **Expected-amount = soft-warn, not hard-block.** The Record-payment form pre-fills the
   exact Pro price; if the operator enters a different amount it asks for a confirm
   (discounts / multi-month / partials are real) but still allows it. One interval is
   added per recorded payment regardless of amount (multi-month-in-one-payment is out of
   scope — they record once per month, period stacks).
5. **Owner `/billing` becomes informative.** Free → real pay instructions; Pro → status +
   period-end + pending-downgrade note + the owner's own payment history. Data comes from
   a new tenant API route scoped by `requireAuth` (never trust a body `salonId`).
6. **Pay numbers live in env, not source.** One SalonPro collection set, same for every
   tenant: `BILLING_MOMO_NUMBER`, `BILLING_AIRTEL_NUMBER`, `BILLING_CONTACT_WHATSAPP`.
   Read server-side and returned by the summary API (so no `NEXT_PUBLIC_` leakage and no
   redeploy-of-code to change them).
7. **Operator gate unchanged.** Google OIDC + allowlist + host check in prod;
   `OPERATOR_DEV_EMAIL` bypass stays hard-gated to non-prod (dead code in prod). Reversal
   is operator-only, `requireOperator()`, audited like every other billing action.
8. **Schema changes via `db push`** (additive only — `migrate dev` is still broken on
   this repo; see SUBSCRIPTIONS-context). New enum + new nullable/defaulted columns + one
   new `OperatorAction` value = safe, no data loss.

---

## Assumptions (flag if wrong before building)

- **Branch:** continue on the current **`feat/operator-billing`** branch (unpushed; this
  is its natural home), committed in chunks. Re-verify `git branch --show-current` before
  every commit — this working dir is contested by parallel agents.
- The owner's *own* payment reference is fine to show the owner (it's their transaction);
  we will NOT show one salon another's data.
- Existing `BillingPayment` rows (pre-this-change) have null `periodEndBefore/After`, so
  they can't be auto-rolled-back — reversing one of them records the reversal and flags
  "manual period check". Acceptable (few/no real payments exist yet).
- `formatMoney()` from `@/lib/utils` is the money formatter on both surfaces.

---

## Schema changes (`prisma/schema.prisma`, then `db push`)

```prisma
enum BillingEntryKind {
  PAYMENT   // money in (default)
  REVERSAL  // cancels a prior PAYMENT; negative amount; points back via reversesId
}

model BillingPayment {
  // ... existing fields unchanged (id, salonId, subscriptionId, amount, currency,
  //     method, reference, paidAt, createdAt, @@unique([salonId, reference]) ) ...

  kind            BillingEntryKind @default(PAYMENT)

  // Reversal linkage (self-relation). Null on normal payments; set on REVERSAL rows.
  reversesId      String?
  reverses        BillingPayment?  @relation("Reversal", fields: [reversesId], references: [id])
  reversedBy      BillingPayment[] @relation("Reversal")

  // Snapshot of the paid period this row moved — lets a reversal roll back exactly.
  periodEndBefore DateTime?
  periodEndAfter  DateTime?

  // Why a payment was reversed (set on the REVERSAL row; original stays untouched).
  voidReason      String?

  @@index([reversesId])
}

enum OperatorAction {
  // ... existing values ...
  REVERSE_PAYMENT  // NEW
}
```

A payment is "reversed" iff a row exists with `reversesId == payment.id`. A row is a
reversal iff `reversesId != null`.

---

## How to build it (ordered, one commit per step)

- [x] **1. Schema** — add `BillingEntryKind` enum, the 5 new `BillingPayment` columns +
      self-relation, and `REVERSE_PAYMENT` to `OperatorAction`. `prisma db push`. Confirm
      additive (no drop / no data-loss prompt); regenerate client. ✅ db in sync, no
      data-loss prompt; client regenerated.

- [x] **2. Seam — record now stamps the period snapshot.** In `recordManualPayment`
      (`src/lib/billing.ts`), persist `kind: 'PAYMENT'`, `periodEndBefore: sub.periodEnd`,
      `periodEndAfter: newPeriodEnd` on the created row. (Idempotent path unchanged.)

- [x] **3. Seam — `reverseManualPayment(client, salonId, paymentId, reason)`.** Atomic:
      load original (must belong to salonId, be `kind = PAYMENT`, and not already
      reversed — else throw a typed error). Create the REVERSAL row: `kind: 'REVERSAL'`,
      `amount: -original.amount`, copy `method`/`currency`, `reference:
      \`${original.reference}:reversal\`` (keeps the @@unique guard happy), `reversesId:
      original.id`, `voidReason: reason`, `paidAt: now`. Then the period guard (decision
      §3): if `sub.periodEnd === original.periodEndAfter` → set `periodEnd =
      original.periodEndBefore`, and if that's now ≤ now/null with a pending free plan,
      `applyPlanChange(salonId, pendingPlanId, client)` in-tx; else don't touch period and
      return `{ periodAdjusted: false }`. Return `{ periodAdjusted: boolean }`.

- [x] **4. Operator action — `reversePayment(salonId, paymentId, reason)`**
      (`src/app/operator/[salonId]/actions.ts`). `requireOperator()` + required reason;
      one `$transaction` { `reverseManualPayment` + `writeOperatorAuditTx` action
      `REVERSE_PAYMENT`, metadata `{ paymentId, reversalId, periodAdjusted }` }.
      `revalidatePath`. Return `{ ok, error?, periodAdjusted? }` so the UI can surface the
      "check the period manually" warning when `periodAdjusted` is false.

- [x] **5. Operator UI — reversal + amount-check.** In `BillingActions.tsx`: pre-fill the
      amount with a new `expectedAmount` prop and **soft-warn + confirm** when it differs
      from expected. In the payment-history list on the detail page
      (`src/app/operator/[salonId]/page.tsx`): pass `expectedAmount` (the Pro plan price —
      add `db.plan.findUnique({ where: { id: 'pro' } })` to the `Promise.all`); render
      REVERSAL rows as negative/"Reversed"; give each un-reversed PAYMENT a **Reverse**
      button → confirm dialog requiring a reason; surface the "period unchanged — check
      manually" note when the action returns `periodAdjusted: false`.

- [x] **6. Tenant summary API — `GET /api/billing/summary`** (`src/app/api/billing/
      summary/route.ts`). `requireAuth(req)`; **scope strictly to `auth.salonId`**. Return
      `{ plan, status, periodEnd, pendingPlan, payments[] }` (payments = the salon's own
      recent rows: amount, currency, method, paidAt, kind) **plus** `payInstructions:
      { momo, airtel, whatsapp, amount }` read from the env vars (server-side). Exclude
      every other tenant's data; do not accept a `salonId` from the request.

- [x] **7. Owner `/billing` page** (`src/app/(app)/billing/page.tsx`). Fetch the summary.
      Free → pay-instructions block (MoMo/Airtel number, exact amount, "put your salon
      name as reference, then send your transaction ID to WhatsApp …"). Pro → "Pro · active
      until <date>", pending-downgrade note, and the payment-history list. Keep the
      checkout 403 untouched (self-upgrade stays disabled). Honor the ≤10% accent rule —
      one primary emphasis max.

- [x] **8. Env + docs.** Add `BILLING_MOMO_NUMBER`, `BILLING_AIRTEL_NUMBER`,
      `BILLING_CONTACT_WHATSAPP` to `.env` (real values) and document them in
      `.env.example` if present. Note them here.

- [x] **9. Verify** — `npm run verify` (typecheck + lint + build into `.next-verify`).
      Manual sanity (in the user's browser, no automation): record a payment (correct +
      mismatched amount → confirm); reverse it → ledger shows the negative row, period
      rolls back, audit `REVERSE_PAYMENT` written; owner `/billing` shows instructions on
      free and status + history on pro. Tick steps off as they land. ✅ `npm run verify`
      clean (tsc + eslint + build); vitest 5/5 pass. **Browser sanity still pending — do
      it locally (no automation per repo rule).**

---

## STATUS: ALL 9 STEPS BUILT. `npm run verify` clean, tests green. Local-only on
`feat/operator-billing` (unpushed). Still TODO before push: (1) set REAL MoMo/Airtel/
WhatsApp values in `.env`; (2) browser sanity pass on operator reverse + owner /billing.

---

## Security invariants (must hold — "secure")

- **Append-only:** no code path `UPDATE`s or `DELETE`s a `BillingPayment`'s financial
  fields. Corrections = new rows only.
- **Tenant isolation:** the summary API returns only `auth.salonId` data; `salonId` is
  never read from the request body/query.
- **Operator-only writes:** record / reverse / change-plan / set-status all pass
  `requireOperator()` and write an audit row in the same transaction as the change.
- **Idempotency preserved:** payments unique on `(salonId, reference)`; reversal uses a
  derived `:reversal` reference; double-reversal is rejected (already-reversed check).
- **No self-grant:** `/api/billing/checkout` stays a 403; `/billing` has no write path.

---

## Out of scope (do NOT build now)

- **Full owner-initiated request → verify → approve queue** (the "option A" loop) — the
  documented next step *if* upgrade volume justifies it. Not now.
- Payment gateway / MoMo API integration · proration / partial refunds · dunning /
  reminder emails (no email infra) · multi-month-in-one-payment period math · receipts
  by email · any access-cutting via subscription status (lapse = downgrade-to-free, per
  the existing locked decision) · migration-baseline repair (separate pre-existing
  follow-up).
```
