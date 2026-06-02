import { getSession, verifySessionToken, ROLE_PERMISSIONS, type UserRole, type Permissions, type SessionUser } from './auth'
import { NextRequest, NextResponse } from 'next/server'

interface AuthResult {
  authorized: boolean
  user: SessionUser | null
  permissions: Permissions | null
  error?: NextResponse
}

/**
 * Get session from request - checks cookie first, then Authorization header
 */
export function getSessionFromRequest(req: NextRequest): SessionUser | null {
  // 1. Try cookie first
  const cookieToken = req.cookies.get('salonpro_session')?.value
  if (cookieToken) {
    const user = verifySessionToken(cookieToken)
    if (user) return user
  }

  // 2. Try Authorization header as fallback (for iframe/sandbox environments where cookies may not work)
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const user = verifySessionToken(token)
    if (user) return user
  }

  return null
}

/**
 * Check if the current request is authenticated and optionally check permissions.
 * If req is provided, checks cookie + Authorization header. Otherwise falls back to
 * the async cookies() API from next/headers.
 */
export async function requireAuth(req?: NextRequest, requiredPermission?: keyof Permissions): Promise<AuthResult> {
  let user: SessionUser | null = null

  if (req) {
    user = getSessionFromRequest(req)
  } else {
    // Try cookies() API first, then check if we can access headers
    user = await getSession()
  }

  if (!user) {
    return {
      authorized: false,
      user: null,
      permissions: null,
      error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    }
  }

  const permissions = ROLE_PERMISSIONS[user.role as UserRole] || null

  if (requiredPermission && permissions) {
    const hasPermission = permissions[requiredPermission]
    if (!hasPermission) {
      return {
        authorized: false,
        user,
        permissions,
        error: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }),
      }
    }
  }

  return {
    authorized: true,
    user,
    permissions,
  }
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
