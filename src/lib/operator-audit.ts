import { db } from './db'
import { Prisma, type OperatorAction } from '@prisma/client'

/**
 * Operator audit log — append-only "which staff member did what to which tenant,
 * and why" trail for the operator console. The cross-tenant counterpart to
 * lib/activity.ts (which is per-salon, for owner transparency). This is the only
 * receipt that platform-staff access to customer data was legitimate, so it is
 * never updated or deleted.
 *
 * Two write paths, by consequence:
 *  - recordOperatorAudit(): best-effort, non-throwing. For reads (REVEAL_PII,
 *    VIEW_TENANT) where the audit is a receipt but its failure must not break the
 *    read the operator already performed.
 *  - writeOperatorAuditTx(): runs INSIDE the caller's transaction and throws on
 *    failure, so a state change (SUSPEND/REACTIVATE) rolls back if its reason
 *    can't be recorded. The reason-record is part of the action, not a side effect.
 */

export interface OperatorAuditInput {
  operatorEmail: string
  action: OperatorAction
  targetSalonId: string
  reason?: string | null
  metadata?: Record<string, unknown>
}

function toData(input: OperatorAuditInput): Prisma.OperatorAuditLogCreateInput {
  return {
    operatorEmail: input.operatorEmail,
    action: input.action,
    targetSalonId: input.targetSalonId,
    reason: input.reason ?? null,
    metadata: input.metadata === undefined ? undefined : (input.metadata as object),
  }
}

/**
 * Best-effort write for non-destructive actions (REVEAL_PII, VIEW_TENANT). A
 * failure is logged and swallowed so the read the operator performed is never
 * affected. Do NOT use for state changes — use writeOperatorAuditTx instead.
 */
export async function recordOperatorAudit(input: OperatorAuditInput): Promise<void> {
  try {
    await db.operatorAuditLog.create({ data: toData(input) })
  } catch (err) {
    console.error('recordOperatorAudit failed:', input.action, err)
  }
}

/**
 * Transactional write for state changes (SUSPEND, REACTIVATE). Creates the audit
 * row on the caller's transaction client and throws on failure, so the enclosing
 * db.$transaction (the status flip) aborts when the reason can't be recorded. A
 * reason is required at the type level here.
 */
export function writeOperatorAuditTx(
  tx: Prisma.TransactionClient,
  input: OperatorAuditInput & { reason: string }
) {
  return tx.operatorAuditLog.create({ data: toData(input) })
}
