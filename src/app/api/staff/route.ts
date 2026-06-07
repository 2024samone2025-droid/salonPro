import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'

const FREE_PLAN_LIMITS = {
  maxCustomers: 100,
  maxStaff: 5,
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.error

  const active = req.nextUrl.searchParams.get('active')
  const where: Record<string, unknown> = { salonId: auth.salonId }
  if (active === 'true') where.active = true
  const staff = await db.staff.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(staff)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'canManageStaff')
  if (!auth.authorized) return auth.error

  const salonId = auth.salonId
  const salon = await db.salon.findUnique({ where: { id: salonId } })
  if (salon?.plan === 'free') {
    const staffCount = await db.staff.count({ where: { salonId } })
    if (staffCount >= FREE_PLAN_LIMITS.maxStaff) {
      return NextResponse.json({ error: `Free plan limited to ${FREE_PLAN_LIMITS.maxStaff} staff members. Upgrade to Pro.` }, { status: 403 })
    }
  }

  const body = await req.json()
  const staff = await db.staff.create({
    data: {
      name: body.name,
      phone: body.phone || '',
      role: body.role || 'stylist',
      active: body.active !== undefined ? body.active : true,
      salonId,
    },
  })
  return NextResponse.json(staff, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, 'canManageStaff')
  if (!auth.authorized) return auth.error

  const body = await req.json()
  const { id, ...data } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const staff = await db.staff.update({ where: { id }, data: { ...data, salonId: auth.salonId } })
  return NextResponse.json(staff)
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req, 'canManageStaff')
  if (!auth.authorized) return auth.error

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await db.staff.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
