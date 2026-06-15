import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { hashPassword } from '@/lib/password'

const VALID_ROLES = ['admin', 'receptionist', 'stylist']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

function sanitize(user: {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  staffId: string | null
  createdAt: Date
  staff?: { id: string; name: string } | null
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    staffId: user.staffId,
    staff: user.staff ?? null,
    createdAt: user.createdAt,
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.error
  if (auth.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const users = await db.user.findMany({
    where: { salonId: auth.salonId },
    include: {
      staff: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(users.map(sanitize))
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.error
  if (auth.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const role = String(body.role || 'receptionist')
  const staffId = body.staffId ? String(body.staffId) : null

  if (name.length < 2 || name.length > 40) {
    return NextResponse.json({ error: 'Name must be 2–40 characters' }, { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 })
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Email is the login identifier, unique per salon.
  const existing = await db.user.findFirst({ where: { salonId: auth.salonId, email }, select: { id: true } })
  if (existing) {
    return NextResponse.json({ error: 'A user with that email already exists' }, { status: 409 })
  }

  if (staffId) {
    const staff = await db.staff.findFirst({ where: { id: staffId, salonId: auth.salonId } })
    if (!staff) return NextResponse.json({ error: 'Staff member not found' }, { status: 400 })
  }

  // Hash before the transaction so the tx stays short.
  const passwordHash = await hashPassword(password)
  const active = body.active !== undefined ? Boolean(body.active) : true

  // A stylist must be tied to a roster slot to be bookable and to see their own
  // appointments. If the owner didn't link an existing one, auto-create it here so
  // every stylist account is bookable the moment it's provisioned — no anonymous
  // roster entries and no separate "add staff" step.
  const user = await db.$transaction(async (tx) => {
    let linkedStaffId = staffId
    if (role === 'stylist' && !linkedStaffId) {
      const slot = await tx.staff.create({
        data: { salonId: auth.salonId, name, phone: '', role: 'stylist', active },
        select: { id: true },
      })
      linkedStaffId = slot.id
    }
    return tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        // Admin sets a temporary password here; the staff member must choose their
        // own on first login (cleared by /api/auth/change-password).
        mustResetPassword: true,
        role,
        staffId: linkedStaffId,
        active,
        tourCompleted: false,
        salonId: auth.salonId,
      },
      include: { staff: { select: { id: true, name: true } } },
    })
  })
  return NextResponse.json(sanitize(user), { status: 201 })
}
