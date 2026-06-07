import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, canModifyAppointment } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.error

  const params = req.nextUrl.searchParams
  const where: Record<string, unknown> = { salonId: auth.salonId }
  if (params.get('date')) where.date = params.get('date')
  if (params.get('staffId')) where.staffId = params.get('staffId')
  if (params.get('status')) where.status = params.get('status')

  // Stylists can only see their own appointments
  if (auth.user && auth.user.role === 'stylist' && auth.user.staffId) {
    where.staffId = auth.user.staffId
  }

  const from = params.get('from')
  const to = params.get('to')
  if (from || to) {
    const dateFilter: Record<string, string> = {}
    if (from) dateFilter.gte = from
    if (to) dateFilter.lte = to
    where.date = dateFilter
  }
  const appointments = await db.appointment.findMany({
    where,
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    include: {
      customer: true,
      staff: true,
      service: true,
      payment: true,
    },
  })
  return NextResponse.json(appointments)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'canCreateAppointment')
  if (!auth.authorized) return auth.error

  try {
    const body = await req.json()

    if (!body.date || !body.startTime || !body.endTime || !body.customerId || !body.staffId || !body.serviceId) {
      return NextResponse.json(
        { error: 'Missing required fields: date, startTime, endTime, customerId, staffId, serviceId' },
        { status: 400 }
      )
    }

    const salonId = auth.salonId as string // Validated by requireAuth
    const appointment = await db.appointment.create({
      data: {
        date: body.date,
        startTime: body.startTime,
        endTime: body.endTime,
        status: body.status || 'booked',
        notes: body.notes || '',
        customerId: body.customerId,
        staffId: body.staffId,
        serviceId: body.serviceId,
        salonId,
      },
    })

    await db.payment.create({
      data: {
        appointmentId: appointment.id,
        status: 'unpaid',
        method: 'cash',
        amount: 0,
        salonId,
      },
    })

    const fullAppointment = await db.appointment.findUnique({
      where: { id: appointment.id },
      include: {
        customer: true,
        staff: true,
        service: true,
        payment: true,
      },
    })

    return NextResponse.json(fullAppointment, { status: 201 })
  } catch (error) {
    console.error('POST /api/appointments error:', error)
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.error

  try {
    const body = await req.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    if (auth.user && auth.user.role === 'stylist') {
      const existing = await db.appointment.findUnique({ where: { id } })
      if (!existing || !canModifyAppointment(auth.user, existing.staffId)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
      const allowedData: Record<string, unknown> = {}
      if (data.status !== undefined) allowedData.status = data.status
      if (data.notes !== undefined) allowedData.notes = data.notes
      const appointment = await db.appointment.update({
        where: { id },
        data: allowedData,
        include: {
          customer: true,
          staff: true,
          service: true,
          payment: true,
        },
      })
      return NextResponse.json(appointment)
    }

    const appointment = await db.appointment.update({
      where: { id },
      data: { ...data, salonId: auth.salonId },
      include: {
        customer: true,
        staff: true,
        service: true,
        payment: true,
      },
    })
    return NextResponse.json(appointment)
  } catch (error) {
    console.error('PUT /api/appointments error:', error)
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req, 'canDeleteRecords')
  if (!auth.authorized) return auth.error

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await db.appointment.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
