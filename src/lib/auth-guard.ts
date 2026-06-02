import { verifySessionToken, ROLE_PERMISSIONS, type UserRole, type Permissions } from './auth'
import { NextRequest, NextResponse } from 'next/server'

interface AuthResult {
  authorized: boolean
  user: Awaited<ReturnType<typeof getSessionFromRequest>>
  permissions: Permissions | null
  error?: NextResponse
}

/**
 * Get session from request cookies (instead of the cookies() API)
 */
export function getSessionFromRequest(req: NextRequest) {
  const token = req.cookies.get('salonpro_session')?.value
  if (!token) return null
  return verifySessionToken(token)
}

/**
 * Check if the current request is authenticated and optionally check permissions.
 * Uses req.cookies instead of the cookies() API for better stability.
 */
export async function requireAuth(req: NextRequest, requiredPermission?: keyof Permissions): Promise<AuthResult> {
  const user = getSessionFromRequest(req)

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
  user: NonNullable<ReturnType<typeof getSessionFromRequest>>,
  appointmentStaffId: string
): boolean {
  // Admin and receptionist can modify any appointment
  if (user.role === 'admin' || user.role === 'receptionist') return true
  // Stylist can only modify their own appointments
  if (user.role === 'stylist' && user.staffId === appointmentStaffId) return true
  return false
}
