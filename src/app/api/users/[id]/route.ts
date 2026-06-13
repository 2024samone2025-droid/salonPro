import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { hashPassword } from '@/lib/password'

const VALID_ROLES = ['admin', 'receptionist', 'stylist']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.error
  if (auth.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  const target = await db.user.findFirst({ where: { id, salonId: auth.salonId } })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const data: Record<string, unknown> = {}

  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (name.length < 2 || name.length > 40) {
      return NextResponse.json({ error: 'Name must be 2–40 characters' }, { status: 400 })
    }
    data.name = name
  }

  if (body.email !== undefined) {
    const email = String(body.email).trim().toLowerCase()
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }
    if (email !== target.email) {
      const existing = await db.user.findFirst({
        where: { salonId: auth.salonId, email, NOT: { id } },
        select: { id: true },
      })
      if (existing) {
        return NextResponse.json({ error: 'A user with that email already exists' }, { status: 409 })
      }
    }
    data.email = email
  }

  if (body.role !== undefined) {
    if (!VALID_ROLES.includes(body.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    data.role = body.role
  }

  if (body.active !== undefined) {
    data.active = Boolean(body.active)
  }

  if (body.staffId !== undefined) {
    if (body.staffId === null || body.staffId === '') {
      data.staffId = null
    } else {
      const staff = await db.staff.findFirst({
        where: { id: String(body.staffId), salonId: auth.salonId },
      })
      if (!staff) return NextResponse.json({ error: 'Staff member not found' }, { status: 400 })
      data.staffId = staff.id
    }
  }

  if (body.password !== undefined && body.password !== '') {
    const password = String(body.password)
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 })
    }
    data.passwordHash = await hashPassword(password)
  }

  // Last-admin protection: the salon must always keep at least one active admin
  const losesAdmin =
    target.role === 'admin' &&
    target.active &&
    ((data.role !== undefined && data.role !== 'admin') || data.active === false)
  if (losesAdmin) {
    const otherActiveAdmins = await db.user.count({
      where: { salonId: auth.salonId, role: 'admin', active: true, NOT: { id } },
    })
    if (otherActiveAdmins === 0) {
      return NextResponse.json(
        { error: 'Cannot remove the last active admin of this salon' },
        { status: 400 }
      )
    }
  }

  const updated = await db.user.update({
    where: { id },
    data,
    include: { staff: { select: { id: true, name: true } } },
  })

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    active: updated.active,
    staffId: updated.staffId,
    staff: updated.staff,
    createdAt: updated.createdAt,
  })
}
