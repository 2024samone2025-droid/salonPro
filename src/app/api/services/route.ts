import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  // Anyone authenticated can view services
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.error

  const active = req.nextUrl.searchParams.get('active')
  const where: Record<string, unknown> = {}
  if (active === 'true') where.active = true
  const services = await db.service.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(services)
}

export async function POST(req: NextRequest) {
  // Only admin can add services
  const auth = await requireAuth(req, 'canManageServices')
  if (!auth.authorized) return auth.error

  const body = await req.json()
  const service = await db.service.create({
    data: {
      name: body.name,
      price: body.price,
      duration: body.duration,
      active: body.active !== undefined ? body.active : true,
    },
  })
  return NextResponse.json(service, { status: 201 })
}

export async function PUT(req: NextRequest) {
  // Only admin can edit services
  const auth = await requireAuth(req, 'canManageServices')
  if (!auth.authorized) return auth.error

  const body = await req.json()
  const { id, ...data } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const service = await db.service.update({ where: { id }, data })
  return NextResponse.json(service)
}

export async function DELETE(req: NextRequest) {
  // Only admin can delete services
  const auth = await requireAuth(req, 'canManageServices')
  if (!auth.authorized) return auth.error

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await db.service.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
