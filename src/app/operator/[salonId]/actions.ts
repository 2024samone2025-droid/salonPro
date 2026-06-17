'use server'

import { revalidatePath } from 'next/cache'
import type { SubscriptionStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { requireOperator } from '@/lib/operator-guard'
import { recordOperatorAudit, writeOperatorAuditTx } from '@/lib/operator-audit'
import { recordManualPayment, reverseManualPayment, applyPlanChange, setStatus } from '@/lib/billing'

// Prisma's default interactive-transaction window is 5s; our serverless Postgres
// (Neon) can add several seconds of latency on a cold compute, which intermittently
// trips P2028 ("transaction already closed") on these short multi-step writes. Give
// them comfortable headroom so a billing action never fails just because the DB was
// cold. maxWait = time to acquire a pooled connection; timeout = total tx budget.
const TX_OPTS = { maxWait: 10000, timeout: 20000 } as const

export interface RevealedContact {
  name: string
  email: string
}

/**
 * Reveal one salon's owner contact. The audit (REVEAL_PII) is best-effort: the
 * operator is about to see the data regardless, so a logging failure must not
 * block the read — but it is still recorded as the receipt. Returns null when
 * the salon has no owner.
 */
export async function revealOwnerContact(salonId: string): Promise<RevealedContact | null> {
  const { operatorEmail } = await requireOperator()

  const link = await db.ownerSalon.findFirst({
    where: { salonId },
    orderBy: { createdAt: 'asc' },
    select: { owner: { select: { name: true, email: true } } },
  })
  if (!link) return null

  await recordOperatorAudit({
    operatorEmail,
    action: 'REVEAL_PII',
    targetSalonId: salonId,
    metadata: { field: 'owner_contact' },
  })

  return { name: link.owner.name, email: link.owner.email }
}

export interface StatusActionResult {
  ok: boolean
  error?: string
}

/**
 * Suspend or reactivate a salon. The status flip and the audit row (carrying the
 * typed reason) land in ONE transaction — if the reason can't be recorded, the
 * status doesn't change; the reason-record is part of the action, not a side
 * effect. A no-op (already in the target state) is rejected so every audit row
 * reflects a real transition. Suspension is a status flip only — never a delete.
 */
export async function setSalonStatus(
  salonId: string,
  target: 'ACTIVE' | 'SUSPENDED',
  reason: string,
): Promise<StatusActionResult> {
  const { operatorEmail } = await requireOperator()

  const trimmed = reason.trim()
  if (!trimmed) return { ok: false, error: 'A reason is required.' }

  const salon = await db.salon.findUnique({ where: { id: salonId }, select: { status: true } })
  if (!salon) return { ok: false, error: 'Salon not found.' }
  if (salon.status === target) {
    return { ok: false, error: `Salon is already ${target.toLowerCase()}.` }
  }

  const action = target === 'SUSPENDED' ? 'SUSPEND' : 'REACTIVATE'

  await db.$transaction(async (tx) => {
    await tx.salon.update({ where: { id: salonId }, data: { status: target } })
    await writeOperatorAuditTx(tx, {
      operatorEmail,
      action,
      targetSalonId: salonId,
      reason: trimmed,
      metadata: { from: salon.status, to: target },
    })
  }, TX_OPTS)

  revalidatePath(`/operator/${salonId}`)
  revalidatePath('/operator')
  return { ok: true }
}

// ── Manual billing actions ───────────────────────────────────────────────────
// Each runs the seam change + its audit row in ONE transaction (writeOperatorAuditTx),
// matching setSalonStatus. Billing never touches access (Salon.status) — these only
// move plan / period / subscription status.

const SUB_STATUSES: SubscriptionStatus[] = ['TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED']

export interface RecordPaymentInput {
  amount: number
  method: string
  reference: string
  paidAt?: string // ISO date (optional; defaults to now)
}

/**
 * The operator records an out-of-band payment. recordManualPayment puts the salon
 * on pro, extends the period, schedules the free downgrade, and logs the payment;
 * the audit row (RECORD_PAYMENT) commits in the same tx. Idempotent on reference.
 */
export async function recordBillingPayment(
  salonId: string,
  input: RecordPaymentInput,
): Promise<StatusActionResult> {
  const { operatorEmail } = await requireOperator()

  const amount = Number(input.amount)
  const method = (input.method || '').trim()
  const reference = (input.reference || '').trim()
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Enter a valid amount.' }
  if (!method) return { ok: false, error: 'Select a payment method.' }
  if (!reference) return { ok: false, error: 'A payment reference is required.' }

  const paidAt = input.paidAt ? new Date(input.paidAt) : undefined
  if (paidAt && Number.isNaN(paidAt.getTime())) return { ok: false, error: 'Invalid payment date.' }

  try {
    await db.$transaction(async (tx) => {
      const { newPeriodEnd, planId } = await recordManualPayment(tx, salonId, {
        amount,
        method,
        reference,
        paidAt,
      })
      await writeOperatorAuditTx(tx, {
        operatorEmail,
        action: 'RECORD_PAYMENT',
        targetSalonId: salonId,
        reason: `${amount} RWF via ${method} (ref ${reference})`,
        metadata: { amount, method, reference, planId, periodEnd: newPeriodEnd.toISOString() },
      })
    }, TX_OPTS)
  } catch (err) {
    console.error('recordBillingPayment failed:', err)
    return { ok: false, error: 'Could not record the payment.' }
  }

  revalidatePath(`/operator/${salonId}`)
  revalidatePath('/operator')
  return { ok: true }
}

/**
 * Administrative plan override (e.g. comp a salon to pro, or force free now) —
 * separate from a payment. applyPlanChange is immediate and clears any pending
 * downgrade. No-op transitions are rejected. Audited CHANGE_PLAN with a reason.
 */
export async function changeSalonPlan(
  salonId: string,
  planId: string,
  reason: string,
): Promise<StatusActionResult> {
  const { operatorEmail } = await requireOperator()

  const trimmed = reason.trim()
  if (!trimmed) return { ok: false, error: 'A reason is required.' }
  if (planId !== 'free' && planId !== 'pro') return { ok: false, error: 'Unknown plan.' }

  const salon = await db.salon.findUnique({ where: { id: salonId }, select: { plan: true } })
  if (!salon) return { ok: false, error: 'Salon not found.' }
  if (salon.plan === planId) return { ok: false, error: `Salon is already on ${planId}.` }

  try {
    await db.$transaction(async (tx) => {
      await applyPlanChange(salonId, planId, tx)
      await writeOperatorAuditTx(tx, {
        operatorEmail,
        action: 'CHANGE_PLAN',
        targetSalonId: salonId,
        reason: trimmed,
        metadata: { from: salon.plan, to: planId },
      })
    }, TX_OPTS)
  } catch (err) {
    console.error('changeSalonPlan failed:', err)
    return { ok: false, error: 'Could not change the plan.' }
  }

  revalidatePath(`/operator/${salonId}`)
  revalidatePath('/operator')
  return { ok: true }
}

/**
 * Set the subscription status as a tracking label (e.g. mark CANCELED on churn).
 * Does NOT touch access — that's Salon.status. No-op transitions are rejected.
 * Audited SET_SUB_STATUS with a reason.
 */
export async function setSubscriptionStatus(
  salonId: string,
  status: SubscriptionStatus,
  reason: string,
): Promise<StatusActionResult> {
  const { operatorEmail } = await requireOperator()

  const trimmed = reason.trim()
  if (!trimmed) return { ok: false, error: 'A reason is required.' }
  if (!SUB_STATUSES.includes(status)) return { ok: false, error: 'Unknown status.' }

  const sub = await db.subscription.findUnique({ where: { salonId }, select: { status: true } })
  if (!sub) return { ok: false, error: 'No subscription for this salon.' }
  if (sub.status === status) return { ok: false, error: `Subscription is already ${status}.` }

  try {
    await db.$transaction(async (tx) => {
      await setStatus(salonId, status, tx)
      await writeOperatorAuditTx(tx, {
        operatorEmail,
        action: 'SET_SUB_STATUS',
        targetSalonId: salonId,
        reason: trimmed,
        metadata: { from: sub.status, to: status },
      })
    }, TX_OPTS)
  } catch (err) {
    console.error('setSubscriptionStatus failed:', err)
    return { ok: false, error: 'Could not update the status.' }
  }

  revalidatePath(`/operator/${salonId}`)
  revalidatePath('/operator')
  return { ok: true }
}

/**
 * Reverse a recorded payment — the append-only correction. reverseManualPayment
 * appends a REVERSAL row and rolls the period back when this payment is still the
 * one driving it; the audit row (REVERSE_PAYMENT) commits in the same tx. When a
 * later payment superseded this one, periodAdjusted=false comes back so the UI can
 * warn the operator to check the period by hand.
 */
export async function reversePayment(
  salonId: string,
  paymentId: string,
  reason: string,
): Promise<StatusActionResult & { periodAdjusted?: boolean }> {
  const { operatorEmail } = await requireOperator()

  const trimmed = reason.trim()
  if (!trimmed) return { ok: false, error: 'A reason is required.' }
  if (!paymentId) return { ok: false, error: 'Missing payment.' }

  try {
    let periodAdjusted = false
    await db.$transaction(async (tx) => {
      const res = await reverseManualPayment(tx, salonId, paymentId, trimmed)
      periodAdjusted = res.periodAdjusted
      await writeOperatorAuditTx(tx, {
        operatorEmail,
        action: 'REVERSE_PAYMENT',
        targetSalonId: salonId,
        reason: trimmed,
        metadata: { paymentId, reversalId: res.reversalId, periodAdjusted: res.periodAdjusted },
      })
    }, TX_OPTS)

    revalidatePath(`/operator/${salonId}`)
    revalidatePath('/operator')
    return { ok: true, periodAdjusted }
  } catch (err) {
    console.error('reversePayment failed:', err)
    const already = err instanceof Error && err.message.includes('already reversed')
    return { ok: false, error: already ? 'This payment was already reversed.' : 'Could not reverse the payment.' }
  }
}
