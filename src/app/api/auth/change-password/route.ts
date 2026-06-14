import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { hashPassword, verifyPassword } from '@/lib/password'
import { NextRequest, NextResponse } from 'next/server'

const MIN_PASSWORD_LENGTH = 8

// Self-service password change for staff (also clears the mustResetPassword
// marker, so the first-login forced-reset flow uses this same endpoint). Scoped
// to the salon resolved from the Host via requireAuth. Owners manage their
// password on the apex account, not per-salon, so they're rejected here.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized || !auth.user) {
    return auth.error ?? NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  if (auth.user.kind !== 'staff') {
    return NextResponse.json(
      { error: 'Owner passwords are managed on your account, not here.' },
      { status: 403 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const currentPassword = String(body.currentPassword || '')
  const newPassword = String(body.newPassword || '')

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 },
    )
  }

  // Re-fetch under the host's salon — never trust the token's salonId.
  const member = await db.user.findFirst({
    where: { id: auth.user.id, salonId: auth.salonId, active: true },
    select: { id: true, passwordHash: true },
  })
  if (!member) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  if (!(await verifyPassword(currentPassword, member.passwordHash))) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
  }
  if (await verifyPassword(newPassword, member.passwordHash)) {
    return NextResponse.json(
      { error: 'New password must be different from your current one' },
      { status: 400 },
    )
  }

  await db.user.update({
    where: { id: member.id },
    data: { passwordHash: await hashPassword(newPassword), mustResetPassword: false },
  })

  return NextResponse.json({ ok: true })
}
