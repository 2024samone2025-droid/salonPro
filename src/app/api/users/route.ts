import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { hashPin } from '@/lib/auth'

const VALID_ROLES = ['admin', 'receptionist', 'stylist']
const PIN_RE = /^\d{4,6}$/

function sanitize(user: {
  id: string
  name: string
  role: string
  active: boolean
  staffId: string | null
  createdAt: Date
  staff?: { id: string; name: string } | null
}) {
  return {
    id: user.id,
    name: user.name,
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
    include: { staff: { select: { id: true, name: true } } },
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
  const pin = String(body.pin || '')
  const role = String(body.role || 'receptionist')
  const staffId = body.staffId ? String(body.staffId) : null

  if (name.length < 2 || name.length > 40) {
    return NextResponse.json({ error: 'Name must be 2–40 characters' }, { status: 400 })
  }
  if (!PIN_RE.test(pin)) {
    return NextResponse.json({ error: 'PIN must be 4–6 digits' }, { status: 400 })
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Login matches names case-insensitively per salon — enforce uniqueness the same way
  const existing = await db.user.findMany({ where: { salonId: auth.salonId }, select: { name: true } })
  if (existing.some((u) => u.name.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: 'A user with that name already exists' }, { status: 409 })
  }

  if (staffId) {
    const staff = await db.staff.findFirst({ where: { id: staffId, salonId: auth.salonId } })
    if (!staff) return NextResponse.json({ error: 'Staff member not found' }, { status: 400 })
  }

  const user = await db.user.create({
    data: {
      name,
      pin: hashPin(pin),
      role,
      staffId,
      active: body.active !== undefined ? Boolean(body.active) : true,
      tourCompleted: false,
      salonId: auth.salonId,
    },
    include: { staff: { select: { id: true, name: true } } },
  })
  return NextResponse.json(sanitize(user), { status: 201 })
}
