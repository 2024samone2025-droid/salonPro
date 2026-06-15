import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { logActivity } from '@/lib/activity'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.error

  const params = req.nextUrl.searchParams
  const where: Record<string, unknown> = { salonId: auth.salonId }
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
  const auth = await requireAuth(req, 'canManagePayments')
  if (!auth.authorized) return auth.error

  const salonId = auth.salonId as string
  const body = await req.json()
  const payment = await db.payment.create({
    data: {
      status: body.status || 'unpaid',
      method: body.method || 'cash',
      amount: body.amount || 0,
      appointmentId: body.appointmentId,
      salonId,
    },
    include: {
      appointment: { include: { customer: true } },
    },
  })
  await logActivity(auth, {
    action: 'payment.recorded',
    targetType: 'payment',
    targetId: payment.id,
    summary: `Recorded a ${payment.status} payment of ${payment.amount} (${payment.method}) for ${payment.appointment.customer.name}`,
    metadata: { amount: payment.amount, method: payment.method, status: payment.status },
  })
  return NextResponse.json(payment, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, 'canManagePayments')
  if (!auth.authorized) return auth.error

  const salonId = auth.salonId as string
  const body = await req.json()
  const { id, ...data } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const payment = await db.payment.update({
    where: { id },
    data: { ...data, salonId },
    include: {
      appointment: { include: { customer: true } },
    },
  })
  await logActivity(auth, {
    action: 'payment.updated',
    targetType: 'payment',
    targetId: payment.id,
    summary: `Updated payment for ${payment.appointment.customer.name} to ${payment.status} — ${payment.amount} (${payment.method})`,
    metadata: { amount: payment.amount, method: payment.method, status: payment.status },
  })
  return NextResponse.json(payment)
}
