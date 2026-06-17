import { db } from './db'
import type { SessionUser } from './auth'

/**
 * Activity log — append-only "who did what, when" feed for owner transparency.
 *
 * Written best-effort from inside mutation routes. The write is awaited (serverless
 * can't reliably fire-and-forget after the response) but wrapped in try/catch, so a
 * logging failure NEVER blocks or rolls back the real action — it just emits a
 * console.error. Do NOT call this inside the action's db.$transaction.
 *
 * The actor is a denormalized snapshot (type + id + name + role at write-time): the
 * actor may be a staff User OR an Owner (no User row), and the trail must survive
 * renames/deletes. The `summary` is a human-readable sentence built at the call site,
 * so the feed renders with no joins and stays correct after a target is deleted.
 */

// Canonical action keys → display labels. Add new keys here when widening scope
// (logins, customer/service CRUD are deferred — same mechanism).
export const ACTIVITY_ACTIONS = {
  'appointment.created': 'Appointment created',
  'appointment.status_changed': 'Appointment status changed',
  'appointment.updated': 'Appointment updated',
  'appointment.reassigned': 'Appointment provider changed',
  'appointment.deleted': 'Appointment deleted',
  'payment.recorded': 'Payment recorded',
  'payment.updated': 'Payment updated',
  'user.added': 'Team member added',
  'user.updated': 'Team member updated',
  'staff.added': 'Staff added',
  'staff.updated': 'Staff updated',
  'staff.removed': 'Staff removed',
  'day_off.added': 'Closure / day off added',
  'day_off.removed': 'Closure / day off removed',
} as const

export type ActivityAction = keyof typeof ACTIVITY_ACTIONS

export type ActivityTargetType = 'appointment' | 'payment' | 'user' | 'staff' | 'day_off'

interface LogActivityInput {
  action: ActivityAction
  summary: string
  targetType?: ActivityTargetType
  targetId?: string
  metadata?: Record<string, unknown>
}

// The minimal slice of requireAuth's result we need: the resolved salon + the actor.
interface ActivityActor {
  salonId: string
  user: SessionUser | null
}

/**
 * Record one activity event. Best-effort: a failure is logged and swallowed so the
 * caller's mutation is never affected. Returns nothing.
 */
export async function logActivity(actor: ActivityActor, input: LogActivityInput): Promise<void> {
  const { user, salonId } = actor
  if (!user || !salonId) return

  // Owners have no User row; surface them as actorRole 'owner' (their session role
  // is 'admin', which we keep for permission checks but not for display here).
  const actorRole = user.kind === 'owner' ? 'owner' : user.role

  try {
    await db.activityLog.create({
      data: {
        salonId,
        actorType: user.kind,
        actorId: user.id,
        actorName: user.name,
        actorRole,
        action: input.action,
        summary: input.summary,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        metadata: input.metadata === undefined ? undefined : (input.metadata as object),
      },
    })
  } catch (err) {
    // Never let an audit-log failure break a real business action.
    console.error('logActivity failed:', input.action, err)
  }
}
