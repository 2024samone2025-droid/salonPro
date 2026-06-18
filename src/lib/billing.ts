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
export async function applyPlanChange(salonId: string, newPlanId: string) {
  const plan = await db.plan.findUnique({ where: { id: newPlanId } })
  if (!plan) throw new Error(`applyPlanChange: unknown plan "${newPlanId}"`)

  // --- OVERFLOW HOOK (§6/§7) -------------------------------------------------
  // If newPlan's numeric limits are below current usage (e.g. 8 staff -> a plan
  // capping at 5), resolve it HERE: block the change or soft-lock the excess.
  // NEVER delete data. Left as an explicit extension point for now.
  // --------------------------------------------------------------------------

  return db.subscription.update({
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
export async function setStatus(salonId: string, status: SubscriptionStatus) {
  return db.subscription.update({ where: { salonId }, data: { status } })
}
