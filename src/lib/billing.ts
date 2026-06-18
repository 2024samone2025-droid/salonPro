import { db } from '@/lib/db'
import type { Prisma, SubscriptionStatus } from '@prisma/client'

// ============================================================================
//  THE SEAM — shared subscription functions
//  Your admin panel calls these NOW. A payment-gateway webhook calls the SAME
//  functions LATER, unchanged. Put NO business logic in route handlers — they
//  only call these. Everything here is written to be idempotent (safe to re-run).
// ============================================================================

// A Prisma client OR a transaction client — so callers can create the row inside
// the same transaction that creates the salon.
type DbClient = Prisma.TransactionClient | typeof db

/**
 * Every salon MUST have exactly one Subscription — the entitlements layer treats
 * "no subscription" as locked out (limit 0). So one is created the moment a salon
 * is created (default: free / ACTIVE). Idempotent: if a subscription already
 * exists for the salon, this is a no-op. Accepts a tx client so it can run inside
 * the salon-creation transaction.
 */
export function createDefaultSubscription(client: DbClient, salonId: string, planId = 'free') {
  return client.subscription.upsert({
    where: { salonId },
    update: {}, // already has one -> leave it untouched
    create: { salonId, planId, status: 'ACTIVE' },
  })
}

type RecordPaymentInput = {
  amount: number
  method: string // "MTN MoMo" | "Airtel" | "card" | "bank"
  reference: string // transaction id (typed manually now, from gateway later)
  paidAt?: Date
  currency?: string
  subscriptionId?: string
}

/**
 * Append a payment row. Idempotent: re-running with the same (salonId, reference)
 * is a no-op thanks to the @@unique([salonId, reference]) constraint — so a
 * double-typed ref or a webhook firing twice never double-records.
 */
export async function recordPayment(salonId: string, input: RecordPaymentInput) {
  // Link the payment to the salon's subscription when the caller didn't pass an
  // id, so BillingPayment.subscriptionId isn't left null.
  const subscriptionId =
    input.subscriptionId ??
    (await db.subscription.findUnique({ where: { salonId }, select: { id: true } }))?.id

  return db.billingPayment.upsert({
    where: { salonId_reference: { salonId, reference: input.reference } },
    update: {}, // already recorded -> do nothing
    create: {
      salonId,
      subscriptionId,
      amount: input.amount,
      currency: input.currency ?? 'RWF',
      method: input.method,
      reference: input.reference,
      paidAt: input.paidAt ?? new Date(),
    },
  })
}

/**
 * Move a salon onto a plan immediately (the UPGRADE path; also used to apply a
 * scheduled downgrade once it's due). Idempotent: setting planId to the same
 * value twice changes nothing. Keeps the legacy Salon.plan string in sync.
 */
export async function applyPlanChange(salonId: string, newPlanId: string, client: DbClient = db) {
  const plan = await client.plan.findUnique({ where: { id: newPlanId } })
  if (!plan) throw new Error(`applyPlanChange: unknown plan "${newPlanId}"`)

  // --- OVERFLOW HOOK (§6/§7) -------------------------------------------------
  // If newPlan's numeric limits are below current usage (e.g. 8 staff -> a plan
  // capping at 5), resolve it HERE: block the change or soft-lock the excess.
  // NEVER delete data. Left as an explicit extension point for now.
  // --------------------------------------------------------------------------

  return client.subscription.update({
    where: { salonId },
    data: {
      // All-relation form: Prisma forbids mixing scalar FKs (planId/pendingPlanId)
      // with a nested relation write (salon.update) in one call. Behaviour is
      // identical — set the plan, clear any pending change, sync the cache.
      plan: { connect: { id: newPlanId } },
      pendingPlan: { disconnect: true },
      salon: { update: { plan: newPlanId } }, // keep denormalized cache in sync
    },
  })
}


/** Add one billing interval to a date (monthly = +1 month, annual = +1 year). */
function addInterval(from: Date, interval: string): Date {
  const d = new Date(from)
  if (interval === 'annual') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  return d
}

/**
 * The operator's "salon paid me" action, as ONE atomic step. Logs the payment,
 * puts the salon on the paid plan (default pro), extends the paid period by the
 * plan's interval — stacked from max(now, current periodEnd) so renewals add
 * time — sets status ACTIVE, and schedules the auto-downgrade to free at period
 * end (applied lazily by applyDuePlanChange). Runs inside the caller's tx so the
 * operator audit row commits with it.
 */
export async function recordManualPayment(
  client: DbClient,
  salonId: string,
  input: RecordPaymentInput & { planId?: string },
) {
  const planId = input.planId ?? 'pro'
  const plan = await client.plan.findUnique({ where: { id: planId } })
  if (!plan) throw new Error(`recordManualPayment: unknown plan "${planId}"`)

  const sub = await client.subscription.findUnique({
    where: { salonId },
    select: { id: true, periodEnd: true },
  })
  if (!sub) throw new Error(`recordManualPayment: no subscription for salon "${salonId}"`)

  const now = input.paidAt ?? new Date()
  const base = sub.periodEnd && sub.periodEnd > now ? sub.periodEnd : now
  const newPeriodEnd = addInterval(base, plan.interval)

  // 1. Log the payment (idempotent on (salonId, reference)). Stamp the period this
  //    payment moved (before/after) so a later reversal can roll it back exactly.
  await client.billingPayment.upsert({
    where: { salonId_reference: { salonId, reference: input.reference } },
    update: {},
    create: {
      salonId,
      subscriptionId: sub.id,
      amount: input.amount,
      currency: input.currency ?? 'RWF',
      method: input.method,
      reference: input.reference,
      paidAt: now,
      kind: 'PAYMENT',
      periodEndBefore: sub.periodEnd ?? null,
      periodEndAfter: newPeriodEnd,
    },
  })

  // 2. Plan + pending-downgrade + period + status + cache, in one update.
  await client.subscription.update({
    where: { salonId },
    data: {
      plan: { connect: { id: planId } },
      // A paid plan auto-downgrades to free at period end; paying for free itself
      // (shouldn't happen) just clears any pending change.
      pendingPlan: planId === 'free' ? { disconnect: true } : { connect: { id: 'free' } },
      periodEnd: newPeriodEnd,
      status: 'ACTIVE',
      salon: { update: { plan: planId } },
    },
  })

  return { newPeriodEnd, planId }
}

/**
 * Reverse a recorded payment — the append-only correction path. It NEVER edits or
 * deletes the original row; it APPENDS a REVERSAL (negative amount, pointing back
 * via reversesId) and, when safe, rolls the paid period back to what it was before
 * that payment.
 *
 * Period rollback rule (no silent miscompute): restore the original's
 * periodEndBefore ONLY if the subscription's current periodEnd still equals that
 * payment's periodEndAfter — i.e. nothing later moved it. If a newer payment
 * superseded it (period stacked), record the reversal but leave the period alone
 * and return periodAdjusted=false, so the caller can tell the operator to check it
 * by hand rather than guessing the math.
 *
 * After a rollback, if the restored period is now over (or cleared) and a free
 * downgrade is pending, apply it immediately in-tx so the salon reflects reality at
 * once (no waiting for the lazy applyDuePlanChange on its next request).
 *
 * A payment can only be reversed once (guarded); the reversal's derived reference
 * keeps the @@unique([salonId, reference]) idempotency guard intact.
 */
export async function reverseManualPayment(
  client: DbClient,
  salonId: string,
  paymentId: string,
  reason: string,
): Promise<{ reversalId: string; periodAdjusted: boolean }> {
  const original = await client.billingPayment.findUnique({ where: { id: paymentId } })
  if (!original || original.salonId !== salonId) {
    throw new Error('reverseManualPayment: payment not found for this salon')
  }
  if (original.kind === 'REVERSAL') {
    throw new Error('reverseManualPayment: cannot reverse a reversal')
  }

  // A payment can only be reversed once.
  const existing = await client.billingPayment.findFirst({
    where: { reversesId: paymentId },
    select: { id: true },
  })
  if (existing) throw new Error('reverseManualPayment: payment already reversed')

  // Append the reversal row (negative amount, derived unique reference).
  const reversal = await client.billingPayment.create({
    data: {
      salonId,
      subscriptionId: original.subscriptionId,
      amount: -original.amount,
      currency: original.currency,
      method: original.method,
      reference: `${original.reference}:reversal`,
      paidAt: new Date(),
      kind: 'REVERSAL',
      reversesId: original.id,
      voidReason: reason,
    },
  })

  // Roll the period back only if this payment is still the one driving the period.
  let periodAdjusted = false
  const sub = await client.subscription.findUnique({
    where: { salonId },
    select: { periodEnd: true, pendingPlanId: true },
  })
  const stillCurrent =
    original.periodEndAfter != null &&
    sub?.periodEnd != null &&
    sub.periodEnd.getTime() === original.periodEndAfter.getTime()

  if (stillCurrent) {
    await client.subscription.update({
      where: { salonId },
      data: { periodEnd: original.periodEndBefore },
    })
    periodAdjusted = true

    // Restored period already over (or cleared) + a downgrade pending -> apply now.
    const restored = original.periodEndBefore
    const due = restored == null || restored.getTime() <= Date.now()
    if (due && sub?.pendingPlanId) {
      await applyPlanChange(salonId, sub.pendingPlanId, client)
    }
  }

  return { reversalId: reversal.id, periodAdjusted }
}

/**
 * Record a downgrade to take effect at period end (customer keeps the higher tier
 * until the time they paid for runs out). Upgrades should NOT use this — they go
 * through applyPlanChange immediately.
 */
export async function scheduleDowngrade(salonId: string, planId: string) {
  return db.subscription.update({
    where: { salonId },
    data: { pendingPlanId: planId },
  })
}

/**
 * Push the paid period out. Idempotent BY DESIGN because it takes an ABSOLUTE
 * target date — never a relative "+1 month". Calling it twice with the same date
 * does nothing the second time (this is the fix for the classic double-extend bug).
 * Also flips status back to ACTIVE.
 */
export async function extendPeriod(salonId: string, newPeriodEnd: Date) {
  return db.subscription.update({
    where: { salonId },
    data: { periodEnd: newPeriodEnd, status: 'ACTIVE' },
  })
}

/**
 * Apply a scheduled downgrade if its period has ended. Safe to call repeatedly
 * (from a cron job, or lazily on the salon's next request).
 */
export async function applyDuePlanChange(salonId: string) {
  const sub = await db.subscription.findUnique({ where: { salonId } })
  if (!sub?.pendingPlanId) return null
  if (sub.periodEnd && sub.periodEnd > new Date()) return null // not due yet
  return applyPlanChange(salonId, sub.pendingPlanId)
}

/**
 * Transition billing status (e.g. ACTIVE -> PAST_DUE when a renewal lapses, then
 * PAST_DUE -> SUSPENDED after your grace window). Access changes flow from this
 * via the entitlements layer — they're never wired directly to "payment failed".
 */
export async function setStatus(salonId: string, status: SubscriptionStatus, client: DbClient = db) {
  return client.subscription.update({ where: { salonId }, data: { status } })
}
