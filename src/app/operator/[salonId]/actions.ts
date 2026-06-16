'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireOperator } from '@/lib/operator-guard'
import { recordOperatorAudit, writeOperatorAuditTx } from '@/lib/operator-audit'

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
  })

  revalidatePath(`/operator/${salonId}`)
  revalidatePath('/operator')
  return { ok: true }
}
