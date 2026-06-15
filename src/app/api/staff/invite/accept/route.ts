import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { SALON_SUBDOMAIN_HEADER } from '@/lib/subdomain'
import { hashInviteToken, normalizePhone, constantTimeEqual } from '@/lib/invite'
import { hashPassword } from '@/lib/password'
import { createSessionToken, type UserRole } from '@/lib/auth'

const MIN_PASSWORD_LENGTH = 12
const MAX_ATTEMPTS = 5
const LOCK_MS = 15 * 60 * 1000
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

// One generic failure for every "can't use this invite" case — no field-level
// disclosure, no enumeration.
const invalid = () =>
  NextResponse.json({ error: 'This invite is invalid or has expired.' }, { status: 400 })

export async function POST(req: NextRequest) {
  // Resolve the tenant from the Host, exactly like login.
  const subdomain = req.headers.get(SALON_SUBDOMAIN_HEADER)
  if (!subdomain) return invalid()
  const salon = await db.salon.findUnique({ where: { subdomain }, select: { id: true } })
  if (!salon) return invalid()

  const body = await req.json().catch(() => null)
  if (!body) return invalid()
  const token = String(body.token || '')
  const name = String(body.name || '').trim()
  const phone = normalizePhone(body.phone)
  const password = String(body.password || '')
  if (!token) return invalid()

  const invite = await db.staffInvite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: {
      user: { select: { id: true, name: true, phone: true, salonId: true, role: true, staffId: true } },
    },
  })
  const now = Date.now()
  if (
    !invite ||
    invite.consumedAt !== null ||
    invite.expiresAt.getTime() <= now ||
    (invite.lockedUntil && invite.lockedUntil.getTime() > now)
  ) {
    return invalid()
  }

  // Defense in depth: the invite's salon must match the host's salon.
  if (invite.salonId !== salon.id || invite.user.salonId !== salon.id) {
    return invalid()
  }

  // Constant-time identity confirmation (name case-insensitive, phone E.164).
  // RATE LIMITING IS ENFORCED HERE: each mismatch atomically increments attempts;
  // the 5th locks the token for 15m. Durable + serverless-safe.
  const nameOk = constantTimeEqual(name.toLowerCase(), (invite.user.name || '').trim().toLowerCase())
  const phoneOk = !!phone && constantTimeEqual(phone, invite.user.phone || '')
  if (!nameOk || !phoneOk) {
    // Atomic increment so concurrent mismatches can't drop counts. lockedUntil is
    // decided from the pre-read value — only the count itself must be atomic.
    await db.staffInvite.update({
      where: { id: invite.id },
      data: {
        attempts: { increment: 1 },
        lockedUntil:
          invite.attempts + 1 >= MAX_ATTEMPTS ? new Date(now + LOCK_MS) : invite.lockedUntil,
      },
    })
    return NextResponse.json(
      { error: "Those details don't match. Please check and try again." },
      { status: 400 },
    )
  }

  // Length-first password policy (no arbitrary composition rules).
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 },
    )
  }

  // Hash BEFORE touching the invite — if hashing throws, the token must NOT be
  // burned. (Prevents permanent lockout.)
  const passwordHash = await hashPassword(password)

  // Consume + activate ATOMICALLY in a single interactive transaction. If the
  // consume races/replays (count 0), throw so the whole tx rolls back and the
  // invite stays usable — no half-applied state where the token is burned but no
  // password was set. Supported here: native Prisma engine over Postgres (not the
  // HTTP neon() driver).
  try {
    await db.$transaction(async (tx) => {
      const consumed = await tx.staffInvite.updateMany({
        where: { id: invite.id, consumedAt: null },
        data: { consumedAt: new Date() },
      })
      if (consumed.count === 0) throw new Error('CONSUMED') // raced / replayed
      await tx.user.update({
        where: { id: invite.user.id },
        data: { passwordHash, active: true }, // BOTH set together
      })
      // Activate the linked roster record (created inactive at invite time) so the
      // stylist/receptionist becomes bookable only once they've onboarded.
      if (invite.user.staffId) {
        await tx.staff.update({
          where: { id: invite.user.staffId },
          data: { active: true },
        })
      }
    })
  } catch (e) {
    if (e instanceof Error && e.message === 'CONSUMED') return invalid()
    throw e // genuine DB error → 500, invite NOT consumed (tx rolled back)
  }

  // Mint the host-scoped session — staff is already on the correct tenant host,
  // so NO cross-domain handoff. Reuses createSessionToken + salonpro_session
  // (no parent-domain cookie). role/staffId are unchanged by accept, so the
  // pre-read values are authoritative.
  const sessionToken = createSessionToken({
    id: invite.user.id,
    name: invite.user.name,
    role: invite.user.role as UserRole,
    staffId: invite.user.staffId,
  })

  console.info('[staff-invite] accepted', {
    salonId: salon.id,
    userId: invite.user.id,
    at: new Date().toISOString(),
  })

  const res = NextResponse.json({ ok: true })
  res.cookies.set('salonpro_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
  return res
}
