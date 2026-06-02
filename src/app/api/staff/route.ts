import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
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
  const body = await req.json()
  const { id, ...data } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const staff = await db.staff.update({ where: { id }, data })
  return NextResponse.json(staff)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await db.staff.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
