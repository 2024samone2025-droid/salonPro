import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { isAtLimit } from '@/lib/entitlements'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.error

  const q = req.nextUrl.searchParams.get('q')
  const where: Record<string, unknown> = { salonId: auth.salonId }
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { phone: { contains: q } },
    ]
  }
  const customers = await db.customer.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      appointments: {
        select: {
          id: true,
          status: true,
          date: true,
          startTime: true,
          endTime: true,
          service: { select: { name: true, price: true } },
          staff: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
      },
    },
  })
  return NextResponse.json(customers)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.error

  if (auth.user?.role === 'stylist') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  // Enforce the plan's customer limit via the entitlements layer (no plan-string
  // checks here; the limit lives on the Plan row).
  const salonId = auth.salonId // Now non-null after successful auth
  const count = await db.customer.count({ where: { salonId } })
  if (await isAtLimit(salonId, 'maxCustomers', count)) {
    return Response.json({ error: 'Upgrade to add more customers' }, { status: 403 })
  }

  const body = await req.json()
  const customer = await db.customer.create({
    data: {
      name: body.name,
      phone: body.phone,
      notes: body.notes || '',
      salonId,
    },
  })
  return NextResponse.json(customer, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.error

  if (auth.user?.role === 'stylist') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await req.json()
  const { id, ...data } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const customer = await db.customer.update({
    where: { id },
    data: { ...data, salonId: auth.salonId },
  })
  return NextResponse.json(customer)
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req, 'canDeleteRecords')
  if (!auth.authorized) return auth.error

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await db.customer.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
