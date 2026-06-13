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
// two auth surfaces. Owners surface as admins with no staff filter so all the
// existing role/staffId-based call sites keep working unchanged.
export type SessionUser =
  | { kind: 'staff'; id: string; name: string; role: UserRole; staffId: string | null }
  | { kind: 'owner'; id: string; name: string; role: 'admin'; staffId: null; email: string }

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

// Create an OWNER session token (same salonpro_session cookie + format as staff,
// just a different subject). Set by the exchange endpoint on the subdomain.
export function createOwnerSessionToken(owner: { id: string; name: string; email: string }): string {
  const payload = JSON.stringify({
    kind: 'owner',
    id: owner.id,
    name: owner.name,
    email: owner.email,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  })
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex')
  return Buffer.from(JSON.stringify({ payload, signature })).toString('base64')
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

    if (data.kind === 'owner') {
      return { kind: 'owner', id: data.id, name: data.name, role: 'admin', staffId: null, email: data.email }
    }

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

/* ──────────────────────────────────────────────────────────────────────────
 * Owner cross-domain login tokens (Phase 2)
 *
 * Two short-lived signed tokens distinct from the session cookie:
 *  - root-owner: proves "this browser authenticated as owner X" at the root
 *    host, so the salon picker can mint exchange tokens without re-auth.
 *  - exchange:   single-use handoff carried in ?t= to <sub>.../api/auth/exchange,
 *    where it is swapped for the owner session cookie.
 * ────────────────────────────────────────────────────────────────────────── */

export const ROOT_OWNER_COOKIE = 'salonpro_owner'
export const ROOT_OWNER_MAX_AGE = 60 * 30 // 30 minutes
const EXCHANGE_MAX_AGE = 60 // 60 seconds

function signToken(obj: Record<string, unknown>): string {
  const payload = JSON.stringify(obj)
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex')
  return Buffer.from(JSON.stringify({ payload, signature })).toString('base64')
}

function readToken(token: string): Record<string, unknown> | null {
  try {
    const { payload, signature } = JSON.parse(Buffer.from(token, 'base64').toString())
    const expected = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex')
    if (signature !== expected) return null
    const data = JSON.parse(payload)
    if (data.exp && Date.now() > data.exp) return null
    return data
  } catch {
    return null
  }
}

export interface RootOwnerSession {
  id: string
  name: string
  email: string
}

export function createRootOwnerToken(owner: RootOwnerSession): string {
  return signToken({
    scope: 'root-owner',
    id: owner.id,
    name: owner.name,
    email: owner.email,
    exp: Date.now() + ROOT_OWNER_MAX_AGE * 1000,
  })
}

export function verifyRootOwnerToken(token: string): RootOwnerSession | null {
  const data = readToken(token)
  if (!data || data.scope !== 'root-owner') return null
  return { id: data.id as string, name: data.name as string, email: data.email as string }
}

export interface ExchangePayload {
  jti: string
  ownerId: string
  salonId: string
}

export function createExchangeToken(p: ExchangePayload): string {
  return signToken({
    scope: 'exchange',
    jti: p.jti,
    ownerId: p.ownerId,
    salonId: p.salonId,
    exp: Date.now() + EXCHANGE_MAX_AGE * 1000,
  })
}

export function verifyExchangeToken(token: string): ExchangePayload | null {
  const data = readToken(token)
  if (!data || data.scope !== 'exchange') return null
  return { jti: data.jti as string, ownerId: data.ownerId as string, salonId: data.salonId as string }
}
