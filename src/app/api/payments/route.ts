import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const where: Record<string, unknown> = {}
  if (params.get('status')) where.status = params.get('status')
  if (params.get('method')) where.method = params.get('method')
  const payments = await db.payment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      appointment: {
        include: {
          customer: true,
          service: true,
        },
      },
    },
  })
  return NextResponse.json(payments)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const payment = await db.payment.create({
    data: {
      status: body.status || 'unpaid',
      method: body.method || 'cash',
      amount: body.amount || 0,
      appointmentId: body.appointmentId,
    },
    include: {
      appointment: true,
    },
  })
  return NextResponse.json(payment, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id, ...data } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const payment = await db.payment.update({
    where: { id },
    data,
    include: {
      appointment: true,
    },
  })
  return NextResponse.json(payment)
}
