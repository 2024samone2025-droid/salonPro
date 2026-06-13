import { db } from '@/lib/db'
import { ROOT_OWNER_COOKIE, verifyRootOwnerToken, createExchangeToken } from '@/lib/auth'
import { buildExchangeUrl } from '@/lib/handoff'
import { NextRequest, NextResponse } from 'next/server'

// The picker click: prove identity via the root-owner cookie, confirm the chosen
// salon is linked, mint a single-use exchange token, and return the subdomain
// URL the client should navigate to.
export async function POST(req: NextRequest) {
  const token = req.cookies.get(ROOT_OWNER_COOKIE)?.value
  const session = token ? verifyRootOwnerToken(token) : null
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { salonId } = await req.json()
  if (!salonId) {
    return NextResponse.json({ error: 'salonId is required' }, { status: 400 })
  }

  const link = await db.ownerSalon.findUnique({
    where: { ownerId_salonId: { ownerId: session.id, salonId } },
    select: { salon: { select: { subdomain: true } } },
  })
  if (!link) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Single-use nonce row (consumed atomically by the exchange endpoint) + signed
  // token carrying its id.
  const nonce = await db.oneTimeToken.create({
    data: { ownerId: session.id, salonId, expiresAt: new Date(Date.now() + 60 * 1000) },
    select: { id: true },
  })
  const exchange = createExchangeToken({ jti: nonce.id, ownerId: session.id, salonId })

  const redirect = buildExchangeUrl(req, link.salon.subdomain, exchange)

  return NextResponse.json({ redirect })
}
