import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { SALON_SUBDOMAIN_HEADER } from '@/lib/subdomain'
import { generateInviteToken, hashInviteToken, buildAcceptUrl, normalizePhone } from '@/lib/invite'

const VALID_ROLES = ['admin', 'receptionist', 'stylist'] as const
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INVITE_TTL_MS = 72 * 60 * 60 * 1000 // 72h

// ── Create an invite (admin/owner only, tenant host) ───────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'canManageStaff')
  if (!auth.authorized) return auth.error

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const role = String(body.role || 'receptionist')
  const phone = normalizePhone(body.phone)

  if (name.length < 2 || name.length > 40) {
    return NextResponse.json({ error: 'Name must be 2–40 characters' }, { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }
  if (!phone) {
    return NextResponse.json({ error: 'A valid phone number is required' }, { status: 400 })
  }
  if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }
  // Only an admin may grant the admin role. (Owners pass requireAuth as admins.)
  if (role === 'admin' && auth.user?.role !== 'admin') {
    return NextResponse.json({ error: 'You cannot grant that role' }, { status: 403 })
  }

  // Uniqueness scoped to THIS salon only — the same person may exist elsewhere.
  const existing = await db.user.findFirst({
    where: { salonId: auth.salonId, email },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ error: 'A user with that email already exists' }, { status: 409 })
  }

  const rawToken = generateInviteToken()

  // Inactive, password-less User + its single invite, created together. salonId
  // comes from the HOST (auth.salonId), never the body. passwordHash '' is a
  // sentinel: verifyPassword('', '') === false, so no login is possible until accept.
  const user = await db.user.create({
    data: {
      salonId: auth.salonId,
      name,
      email,
      phone,
      role,
      passwordHash: '',
      active: false,
      tourCompleted: false,
      invite: {
        create: {
          salonId: auth.salonId,
          tokenHash: hashInviteToken(rawToken),
          expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        },
      },
    },
    select: { id: true },
  })

  const subdomain = req.headers.get(SALON_SUBDOMAIN_HEADER) as string
  const acceptUrl = buildAcceptUrl(req, subdomain, rawToken)

  // Audit — never the raw token.
  console.info('[staff-invite] created', {
    actorId: auth.user?.id,
    salonId: auth.salonId,
    userId: user.id,
    at: new Date().toISOString(),
  })

  return NextResponse.json({ acceptUrl }, { status: 201 })
}

// ── Check invite validity (public, tenant host) — no enumeration ───────────
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || ''
  if (!token) return NextResponse.json({ valid: false })

  const invite = await db.staffInvite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    select: { expiresAt: true, consumedAt: true, lockedUntil: true },
  })
  const now = Date.now()
  const valid =
    !!invite &&
    invite.consumedAt === null &&
    invite.expiresAt.getTime() > now &&
    (!invite.lockedUntil || invite.lockedUntil.getTime() <= now)

  // Only the boolean — no name/phone/email/role/salon leak.
  return NextResponse.json({ valid })
}
