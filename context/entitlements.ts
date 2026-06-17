import { db } from '@/lib/db'
import type { Plan, Subscription } from '@prisma/client'

// ============================================================================
//  ENTITLEMENTS LAYER
//  The ONE place the rest of the app asks "what is this salon allowed to do?".
//  No `if (salon.plan === 'pro')` anywhere else — call can() / getLimit() instead.
// ============================================================================

export type AccessLevel = 'full' | 'restricted' | 'none'

export type NumericLimit = 'maxStaff' | 'maxCustomers' | 'maxLocations' | 'maxSms'

type SubWithPlan = Subscription & { plan: Plan }

async function loadSub(salonId: string): Promise<SubWithPlan | null> {
  return db.subscription.findUnique({
    where: { salonId },
    include: { plan: true },
  })
}

/**
 * Numeric limit for a salon. A null value on the plan means UNLIMITED, returned
 * as Infinity so callers can write `count < getLimit(...)` without special-casing.
 * No subscription at all => 0 (locked out).
 */
export async function getLimit(salonId: string, limit: NumericLimit): Promise<number> {
  const sub = await loadSub(salonId)
  if (!sub) return 0
  const value = sub.plan[limit]
  return value == null ? Infinity : value
}

/** True if the salon's current plan has this boolean feature switched on. */
export async function can(salonId: string, feature: string): Promise<boolean> {
  const sub = await loadSub(salonId)
  if (!sub || accessOf(sub.status) === 'none') return false
  const features = (sub.plan.features ?? {}) as Record<string, boolean>
  return features[feature] === true
}

/**
 * "Owes money" and "has access" are separate facts, joined deliberately here.
 * past_due keeps FULL access (grace) — never cut a salon off the morning after a
 * missed payment. Only suspended/canceled restrict.
 */
export function accessOf(status: Subscription['status']): AccessLevel {
  switch (status) {
    case 'TRIALING':
    case 'ACTIVE':
    case 'PAST_DUE':
      return 'full'
    case 'SUSPENDED':
      return 'restricted'
    case 'CANCELED':
    default:
      return 'none'
  }
}

export async function getAccess(salonId: string): Promise<AccessLevel> {
  const sub = await loadSub(salonId)
  return sub ? accessOf(sub.status) : 'none'
}

/** Convenience: has the salon hit a numeric limit? Pass the current usage count. */
export async function isAtLimit(salonId: string, limit: NumericLimit, currentCount: number): Promise<boolean> {
  return currentCount >= (await getLimit(salonId, limit))
}
