import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  const where: Record<string, unknown> = {}
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
  const body = await req.json()
  const customer = await db.customer.create({
    data: {
      name: body.name,
      phone: body.phone,
      notes: body.notes || '',
    },
  })
  return NextResponse.json(customer, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id, ...data } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const customer = await db.customer.update({
    where: { id },
    data,
  })
  return NextResponse.json(customer)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await db.customer.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
