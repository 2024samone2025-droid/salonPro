import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { SALON_SUBDOMAIN_HEADER } from '@/lib/subdomain'
import { generateInviteToken, hashInviteToken, buildAcceptUrl } from '@/lib/invite'

const INVITE_TTL_MS = 72 * 60 * 60 * 1000

// Revoke a pending invite (admin/owner only); optionally rotate to a fresh link.
// Either way the old link stops working immediately.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'canManageStaff')
  if (!auth.authorized) return auth.error

  const body = await req.json().catch(() => null)
  if (!body?.userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  const rotate = body.rotate === true

  // Scope the invite to a user in THIS salon.
  const invite = await db.staffInvite.findUnique({
    where: { userId: String(body.userId) },
    select: { id: true, salonId: true },
  })
  if (!invite || invite.salonId !== auth.salonId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!rotate) {
    await db.staffInvite.update({ where: { id: invite.id }, data: { consumedAt: new Date() } })
    console.info('[staff-invite] revoked', {
      actorId: auth.user?.id, salonId: auth.salonId, userId: body.userId, at: new Date().toISOString(),
    })
    return NextResponse.json({ ok: true })
  }

  // Rotate: new token/hash + fresh expiry, attempts/lock reset. The old link's
  // hash no longer matches any row, so it dies immediately.
  const rawToken = generateInviteToken()
  await db.staffInvite.update({
    where: { id: invite.id },
    data: {
      tokenHash: hashInviteToken(rawToken),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      consumedAt: null,
      attempts: 0,
      lockedUntil: null,
    },
  })
  const acceptUrl = buildAcceptUrl(req, req.headers.get(SALON_SUBDOMAIN_HEADER) as string, rawToken)
  console.info('[staff-invite] rotated', {
    actorId: auth.user?.id, salonId: auth.salonId, userId: body.userId, at: new Date().toISOString(),
  })
  return NextResponse.json({ acceptUrl })
}
