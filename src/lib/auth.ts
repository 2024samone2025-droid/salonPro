import { cookies } from 'next/headers'
import { db } from './db'
import crypto from 'crypto'

// Session cookie name
const SESSION_COOKIE = 'salonpro_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days
const AUTH_SECRET = process.env.AUTH_SECRET || 'salonpro-rwanda-secret-key-2025'

// Role-based permissions definition
export type UserRole = 'admin' | 'receptionist' | 'stylist'

export interface Permissions {
  // Module access
  dashboard: 'full' | 'view' | 'own' | 'none'
  appointments: 'full' | 'view' | 'own' | 'none'
  customers: 'full' | 'view' | 'none'
  staff: 'full' | 'view' | 'none'
  services: 'full' | 'view' | 'none'
  reports: 'full' | 'view' | 'none'
  // Special permissions
  canCreateAppointment: boolean
  canUpdateAppointmentStatus: boolean
  canManagePayments: boolean
  canManageStaff: boolean
  canManageServices: boolean
  canDeleteRecords: boolean
  canViewAllAppointments: boolean
}

export const ROLE_PERMISSIONS: Record<UserRole, Permissions> = {
  admin: {
    dashboard: 'full',
    appointments: 'full',
    customers: 'full',
    staff: 'full',
    services: 'full',
    reports: 'full',
    canCreateAppointment: true,
    canUpdateAppointmentStatus: true,
    canManagePayments: true,
    canManageStaff: true,
    canManageServices: true,
    canDeleteRecords: true,
    canViewAllAppointments: true,
  },
  receptionist: {
    dashboard: 'full',
    appointments: 'full',
    customers: 'full',
    staff: 'view',
    services: 'view',
    reports: 'view',
    canCreateAppointment: true,
    canUpdateAppointmentStatus: true,
    canManagePayments: true,
    canManageStaff: false,
    canManageServices: false,
    canDeleteRecords: false,
    canViewAllAppointments: true,
  },
  stylist: {
    dashboard: 'view',
    appointments: 'own',
    customers: 'view',
    staff: 'none',
    services: 'view',
    reports: 'none',
    canCreateAppointment: false,
    canUpdateAppointmentStatus: true,
    canManagePayments: false,
    canManageStaff: false,
    canManageServices: false,
    canDeleteRecords: false,
    canViewAllAppointments: false,
  },
}

export interface SessionUser {
  id: string
  name: string
  role: UserRole
  staffId: string | null
  salonId: string
}

// Hash PIN using Node.js crypto (synchronous, reliable)
export function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex')
}

// Verify a PIN against a hash
export function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash
}

// Create a session token using HMAC (synchronous, reliable)
export function createSessionToken(user: SessionUser): string {
  const payload = JSON.stringify({
    id: user.id,
    name: user.name,
    role: user.role,
    staffId: user.staffId,
    salonId: user.salonId,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  })

  // Create HMAC signature
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex')

  // Encode as base64
  const token = Buffer.from(JSON.stringify({ payload, signature })).toString('base64')
  return token
}

// Verify and decode a session token
export function verifySessionToken(token: string): SessionUser | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString())
    const { payload, signature } = decoded

    // Verify signature
    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex')
    if (signature !== expectedSig) return null

    const data = JSON.parse(payload)

    // Check expiration
    if (data.exp && Date.now() > data.exp) return null

    return {
      id: data.id,
      name: data.name,
      role: data.role as UserRole,
      staffId: data.staffId || null,
      salonId: data.salonId,
    }
  } catch {
    return null
  }
}

// Get the current session from cookies (for API routes)
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}

// Set session cookie
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

// Clear session cookie
export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

// Check if a user has permission for a specific action
export function hasPermission(user: SessionUser, permission: keyof Permissions): boolean {
  const perms = ROLE_PERMISSIONS[user.role]
  if (!perms) return false
  return perms[permission] as boolean
}

// Check if a user can access a module
export function canAccessModule(user: SessionUser, module: keyof Permissions): boolean {
  const perms = ROLE_PERMISSIONS[user.role]
  if (!perms) return false
  const access = perms[module]
  return access !== 'none'
}

// Get filtered staff ID for stylist (only sees their own appointments)
export function getStaffFilter(user: SessionUser): string | null {
  if (user.role === 'stylist' && user.staffId) {
    return user.staffId
  }
  return null // null means no filter, see all
}
