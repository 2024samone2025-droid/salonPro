import { db } from '@/lib/db'
import { ROOT_STAFF_COOKIE, verifyRootStaffToken, createStaffExchangeToken } from '@/lib/auth'
import { buildExchangeUrl } from '@/lib/handoff'
import { NextRequest, NextResponse } from 'next/server'

// The picker click for staff: prove the password-verified memberships via the
// root-staff cookie, confirm the chosen salon is among them, mint a single-use
// exchange token, and return the subdomain URL to navigate to. Parallel to
// /api/owner/select.
export async function POST(req: NextRequest) {
  const token = req.cookies.get(ROOT_STAFF_COOKIE)?.value
  const session = token ? verifyRootStaffToken(token) : null
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { salonId } = await req.json()
  if (!salonId) {
    return NextResponse.json({ error: 'salonId is required' }, { status: 400 })
  }

  // Only salons whose password was verified at login are in the cookie.
  const grant = session.access.find((a) => a.salonId === salonId)
  if (!grant) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const salon = await db.salon.findUnique({ where: { id: salonId }, select: { subdomain: true } })
  if (!salon) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Single-use nonce (consumed atomically by the exchange endpoint) + signed token.
  const nonce = await db.oneTimeToken.create({
    data: { userId: grant.userId, salonId, expiresAt: new Date(Date.now() + 60 * 1000) },
    select: { id: true },
  })
  const exchange = createStaffExchangeToken({ jti: nonce.id, userId: grant.userId, salonId })

  const redirect = buildExchangeUrl(req, salon.subdomain, exchange)

  return NextResponse.json({ redirect })
}
