import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  // Anyone authenticated can view staff list
  const auth = await requireAuth()
  if (!auth.authorized) return auth.error

  const active = req.nextUrl.searchParams.get('active')
  const where: Record<string, unknown> = {}
  if (active === 'true') where.active = true
  const staff = await db.staff.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(staff)
}

export async function POST(req: NextRequest) {
  // Only admin can add staff
  const auth = await requireAuth('canManageStaff')
  if (!auth.authorized) return auth.error

  const body = await req.json()
  const staff = await db.staff.create({
    data: {
      name: body.name,
      phone: body.phone || '',
      role: body.role || 'stylist',
      active: body.active !== undefined ? body.active : true,
    },
  })
  return NextResponse.json(staff, { status: 201 })
}

export async function PUT(req: NextRequest) {
  // Only admin can edit staff
  const auth = await requireAuth('canManageStaff')
  if (!auth.authorized) return auth.error

  const body = await req.json()
  const { id, ...data } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const staff = await db.staff.update({ where: { id }, data })
  return NextResponse.json(staff)
}

export async function DELETE(req: NextRequest) {
  // Only admin can delete staff
  const auth = await requireAuth('canManageStaff')
  if (!auth.authorized) return auth.error

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await db.staff.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
