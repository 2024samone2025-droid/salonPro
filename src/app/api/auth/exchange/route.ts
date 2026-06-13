import { db } from '@/lib/db'
import { verifyExchangeToken, createOwnerSessionToken } from '@/lib/auth'
import { SALON_SUBDOMAIN_HEADER } from '@/lib/subdomain'
import { NextRequest, NextResponse } from 'next/server'

// Cross-domain handoff landing point, on the SUBDOMAIN host. Swaps a single-use
// exchange token for an owner session cookie, then redirects to /dashboard
// (which strips ?t= from the URL). Any failure falls back to /login on this host.
export async function GET(req: NextRequest) {
  const loginUrl = new URL('/login', req.url)

  const t = req.nextUrl.searchParams.get('t')
  const payload = t ? verifyExchangeToken(t) : null
  if (!payload) return NextResponse.redirect(loginUrl)

  // The token's salon must match the host we're actually on.
  const subdomain = req.headers.get(SALON_SUBDOMAIN_HEADER)
  if (!subdomain) return NextResponse.redirect(loginUrl)
  const salon = await db.salon.findUnique({ where: { subdomain }, select: { id: true } })
  if (!salon || salon.id !== payload.salonId) return NextResponse.redirect(loginUrl)

  // Consume the nonce atomically — single-use, unexpired. A replay (or concurrent
  // double-spend) finds count === 0 and is rejected.
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

  const response = NextResponse.redirect(new URL('/dashboard', req.url))
  response.cookies.set('salonpro_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return response
}
