import { cookies } from 'next/headers'
import { db } from './db'
import crypto from 'crypto'

// Session cookie name
const SESSION_COOKIE = 'salonpro_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

// Fail loudly if the signing secret is missing — never fall back to a hardcoded
// value, which would let anyone forge sessions. Required in every environment.
function requireAuthSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error('AUTH_SECRET environment variable is required (set it in .env)')
  }
  return secret
}
const AUTH_SECRET = requireAuthSecret()

// Role-based permissions live in ./permissions (client-safe); re-export for server callers
import { ROLE_PERMISSIONS, type Permissions, type UserRole } from './permissions'

export { ROLE_PERMISSIONS }
export type { Permissions, UserRole }

// The session subject decoded from the cookie. salonId is intentionally NOT
// here — the operating salon is always derived from the request Host (see
// requireAuth), never the token, so it can't drift. `kind` discriminates the
// auth surface; only 'staff' exists in Phase 1 ('owner' is added in Phase 2).
export interface SessionUser {
  kind: 'staff'
  id: string
  name: string
  role: UserRole
  staffId: string | null
}

// Hash PIN using Node.js crypto (synchronous, reliable)
export function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex')
}

// Verify a PIN against a hash
export function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash
}

// Create a staff session token using HMAC (synchronous, reliable). Accepts a
// loose shape (any extra fields like a legacy salonId are ignored) so callers
// that still build richer objects don't need to change.
export function createSessionToken(user: { id: string; name: string; role: UserRole; staffId: string | null }): string {
  const payload = JSON.stringify({
    kind: 'staff',
    id: user.id,
    name: user.name,
    role: user.role,
    staffId: user.staffId,
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

    // `kind` defaults to 'staff' so pre-Phase-1 tokens (no kind) still decode.
    return {
      kind: 'staff',
      id: data.id,
      name: data.name,
      role: data.role as UserRole,
      staffId: data.staffId || null,
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
