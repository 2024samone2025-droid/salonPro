import { db } from '@/lib/db'
import {
  verifyExchangeToken,
  createOwnerSessionToken,
  verifyStaffExchangeToken,
  createSessionToken,
  type UserRole,
} from '@/lib/auth'
import { SALON_SUBDOMAIN_HEADER } from '@/lib/subdomain'
import { NextRequest, NextResponse } from 'next/server'

// Cross-domain handoff landing point, on the SUBDOMAIN host. Swaps a single-use
// exchange token for a session cookie, then redirects to /dashboard (which strips
// ?t= from the URL). Handles BOTH subjects: a staff-exchange token (apex staff
// login) and an owner exchange token (owner login). Any failure falls back to
// /login on this host.
//
// IMPORTANT: redirects are built against the request Host header, NOT req.url.
// In the dev server (and behind proxies) req.url reports the bound address
// (the apex, e.g. localhost:3000) rather than the subdomain we were actually
// reached on — so `new URL('/dashboard', req.url)` would bounce the browser to
// the apex, where the freshly-set subdomain cookie isn't visible, looping back
// to /login. This mirrors how lib/handoff.ts builds the inbound URL.
function originFromHost(req: NextRequest): string {
  const proto =
    req.headers.get('x-forwarded-proto')?.split(',')[0].trim() ||
    req.nextUrl.protocol.replace(/:$/, '') ||
    'http'
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0].trim()
  return `${proto}://${host}`
}

function setSessionAndRedirect(origin: string, sessionToken: string): NextResponse {
  const response = NextResponse.redirect(new URL('/dashboard', origin))
  response.cookies.set('salonpro_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return response
}

export async function GET(req: NextRequest) {
  const origin = originFromHost(req)
  const loginUrl = new URL('/login', origin)

  const t = req.nextUrl.searchParams.get('t')
  if (!t) return NextResponse.redirect(loginUrl)

  // The token's salon must match the host we're actually on.
  const subdomain = req.headers.get(SALON_SUBDOMAIN_HEADER)
  if (!subdomain) return NextResponse.redirect(loginUrl)
  const salon = await db.salon.findUnique({ where: { subdomain }, select: { id: true } })
  if (!salon) return NextResponse.redirect(loginUrl)

  // ── Staff handoff (apex staff login) ───────────────────────────────────────
  const staff = verifyStaffExchangeToken(t)
  if (staff) {
    if (salon.id !== staff.salonId) return NextResponse.redirect(loginUrl)

    // Consume the nonce atomically — single-use, unexpired. A replay finds
    // count === 0 and is rejected.
    const consumed = await db.oneTimeToken.updateMany({
      where: { id: staff.jti, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() },
    })
    if (consumed.count === 0) return NextResponse.redirect(loginUrl)

    // Re-verify the user is still an active member of this salon, then mint the
    // per-subdomain staff session.
    const user = await db.user.findFirst({
      where: { id: staff.userId, salonId: salon.id, active: true },
      select: { id: true, name: true, role: true, staffId: true },
    })
    if (!user) return NextResponse.redirect(loginUrl)

    const sessionToken = createSessionToken({
      id: user.id,
      name: user.name,
      role: user.role as UserRole,
      staffId: user.staffId,
    })
    return setSessionAndRedirect(origin, sessionToken)
  }

  // ── Owner handoff (owner login) ────────────────────────────────────────────
  const payload = verifyExchangeToken(t)
  if (!payload) return NextResponse.redirect(loginUrl)
  if (salon.id !== payload.salonId) return NextResponse.redirect(loginUrl)

  const consumed = await db.oneTimeToken.updateMany({
    where: { id: payload.jti, consumedAt: null, expiresAt: { gt: new Date() } },
    data: { consumedAt: new Date() },
  })
  if (consumed.count === 0) return NextResponse.redirect(loginUrl)

  // Re-verify the link still exists, then mint the per-subdomain owner session.
  const link = await db.ownerSalon.findUnique({
    where: { ownerId_salonId: { ownerId: payload.ownerId, salonId: payload.salonId } },
    select: { owner: { select: { id: true, name: true, email: true } } },
  })
  if (!link) return NextResponse.redirect(loginUrl)

  const sessionToken = createOwnerSessionToken({
    id: link.owner.id,
    name: link.owner.name,
    email: link.owner.email,
  })
  return setSessionAndRedirect(origin, sessionToken)
}
