import { getSession, ROLE_PERMISSIONS, type UserRole, type Permissions, type SessionUser } from './auth'
import { verifySessionToken } from './auth'
import { db } from './db'
import { SALON_SUBDOMAIN_HEADER } from './subdomain'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

interface AuthResult {
  authorized: boolean
  user: SessionUser | null
  permissions: Permissions | null
  salonId: string
  error?: NextResponse
}

// Two DISTINCT failures, deliberately not collapsed:
// - notFound: no salon for the resolved subdomain (or no tenant context at all).
// - unauthorized: a valid tenant, but no/invalid session OR the subject is not a
//   member of it. Identical to "no session" so a user logged in elsewhere can't
//   probe which subdomains exist.
const notFound = (): AuthResult => ({
  authorized: false,
  user: null,
  permissions: null,
  salonId: '',
  error: NextResponse.json({ error: 'Not found' }, { status: 404 }),
})

const unauthorized = (): AuthResult => ({
  authorized: false,
  user: null,
  permissions: null,
  salonId: '',
  error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
})

// A valid tenant whose status is SUSPENDED. Distinct from notFound/unauthorized
// on purpose: this is the authenticated-app surface, where the salon's own staff
// are entitled to know access is paused (and be routed toward billing). 403, not
// the public 404 — the public booking surface masks suspension separately.
const suspended = (): AuthResult => ({
  authorized: false,
  user: null,
  permissions: null,
  salonId: '',
  error: NextResponse.json({ error: 'Salon suspended' }, { status: 403 }),
})

/**
 * Read the session subject from the cookie only (cookie-only auth — the Bearer/
 * localStorage channel has been retired).
 */
export function getSessionFromRequest(req: NextRequest): SessionUser | null {
  const token = req.cookies.get('salonpro_session')?.value
  return token ? verifySessionToken(token) : null
}

// The tenant subdomain is forwarded by middleware on the request headers. Read it
// from the passed request, or fall back to next/headers for server components /
// route handlers that don't have the request object.
async function getResolvedSubdomain(req?: NextRequest): Promise<string | null> {
  if (req) return req.headers.get(SALON_SUBDOMAIN_HEADER)
  return (await headers()).get(SALON_SUBDOMAIN_HEADER)
}

/**
 * Authorize a request against the salon resolved from its Host.
 *
 * The operating salon is ALWAYS the host's salon — never the token's. We look it
 * up, then verify the cookie's subject is an active member of it. Role and name
 * come from the fresh DB row (authoritative; no stale-token role).
 */
export async function requireAuth(req?: NextRequest, requiredPermission?: keyof Permissions): Promise<AuthResult> {
  // 1. Resolve the tenant from the Host (set by middleware).
  const subdomain = await getResolvedSubdomain(req)
  if (!subdomain) return notFound()

  const salon = await db.salon.findUnique({ where: { subdomain }, select: { id: true, status: true } })
  if (!salon) return notFound()

  // 1b. Status gate: a SUSPENDED salon cannot transact at all. Checked before the
  //     subject is identified — the lifecycle gate is a property of the tenant, not
  //     of who is asking. Without this the status column is inert.
  if (salon.status === 'SUSPENDED') return suspended()

  // 2. Identify the subject from the session cookie.
  const subject = req ? getSessionFromRequest(req) : await getSession()
  if (!subject) return unauthorized()

  // 3. Verify membership against the resolved salon. Non-members (staff or owner)
  //    are treated exactly like "no session" — no existence leak.
  let user: SessionUser
  let permissions: Permissions | null

  if (subject.kind === 'owner') {
    // Owners get admin rights directly via the OwnerSalon link — no User row.
    const link = await db.ownerSalon.findUnique({
      where: { ownerId_salonId: { ownerId: subject.id, salonId: salon.id } },
      select: { owner: { select: { name: true, email: true } } },
    })
    if (!link) return unauthorized()
    user = { kind: 'owner', id: subject.id, name: link.owner.name, role: 'admin', staffId: null, email: link.owner.email }
    permissions = ROLE_PERMISSIONS.admin
  } else {
    const member = await db.user.findFirst({
      where: { id: subject.id, salonId: salon.id, active: true },
      select: { id: true, name: true, role: true, staffId: true },
    })
    if (!member) return unauthorized()
    const role = member.role as UserRole
    user = { kind: 'staff', id: member.id, name: member.name, role, staffId: member.staffId }
    permissions = ROLE_PERMISSIONS[role] || null
  }

  if (requiredPermission && permissions && !permissions[requiredPermission]) {
    return {
      authorized: false,
      user,
      permissions,
      salonId: salon.id,
      error: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }),
    }
  }

  return { authorized: true, user, permissions, salonId: salon.id }
}

/**
 * Check if a user can modify a specific appointment (e.g., stylist can only modify their own)
 */
export function canModifyAppointment(
  user: SessionUser,
  appointmentStaffId: string
): boolean {
  // Admin and receptionist can modify any appointment
  if (user.role === 'admin' || user.role === 'receptionist') return true
  // Stylist can only modify their own appointments
  if (user.role === 'stylist' && user.staffId === appointmentStaffId) return true
  return false
}
