import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

const NON_BLOCKING_STATUSES = ['cancelled', 'no_show']

function badSubdomain(subdomain: string) {
  return !subdomain || !/^[a-z0-9-]+$/.test(subdomain)
}

async function resolveSalon(subdomain: string) {
  if (badSubdomain(subdomain)) return null
  return db.salon.findUnique({ where: { subdomain } })
}

// Public salon profile: name + active services + active stylists.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params
  const salon = await resolveSalon(subdomain)
  if (!salon) {
    return NextResponse.json({ error: 'Salon not found' }, { status: 404 })
  }

  const [services, staff] = await Promise.all([
    db.service.findMany({
      where: { salonId: salon.id, active: true },
      select: { id: true, name: true, price: true, duration: true },
      orderBy: { name: 'asc' },
    }),
    db.staff.findMany({
      where: { salonId: salon.id, active: true, role: 'stylist' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return NextResponse.json({
    salon: { name: salon.name, subdomain: salon.subdomain },
    services,
    staff,
  })
}

// Public self-booking: creates (or reuses) a customer by phone, then books.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params
  const salon = await resolveSalon(subdomain)
  if (!salon) {
    return NextResponse.json({ error: 'Salon not found' }, { status: 404 })
  }

  try {
    const body = await req.json()
    const name = (body.name || '').trim()
    const phone = (body.phone || '').trim()
    const { date, startTime, staffId, serviceId } = body

    if (!name || !phone || !date || !startTime || !staffId || !serviceId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, phone, date, startTime, staffId, serviceId' },
        { status: 400 }
      )
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime)) {
      return NextResponse.json({ error: 'Invalid date or time format' }, { status: 400 })
    }

    const [service, staff] = await Promise.all([
      db.service.findFirst({ where: { id: serviceId, salonId: salon.id, active: true } }),
      db.staff.findFirst({ where: { id: staffId, salonId: salon.id, active: true } }),
    ])
    if (!service) {
      return NextResponse.json({ error: 'Selected service is not available' }, { status: 400 })
    }
    if (!staff) {
      return NextResponse.json({ error: 'Selected stylist is not available' }, { status: 400 })
    }

    const [h, m] = startTime.split(':').map(Number)
    const endMinutes = h * 60 + m + service.duration
    const endTime = `${Math.floor(endMinutes / 60)
      .toString()
      .padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`

    const slotStart = new Date(`${date}T${startTime}:00`)
    if (slotStart.getTime() < Date.now()) {
      return NextResponse.json({ error: 'That time has already passed' }, { status: 400 })
    }

    const conflict = await db.appointment.findFirst({
      where: {
        salonId: salon.id,
        staffId,
        date,
        status: { notIn: NON_BLOCKING_STATUSES },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    })
    if (conflict) {
      return NextResponse.json(
        { error: 'slot_taken', message: 'Sorry, that time slot was just taken. Please pick another.' },
        { status: 409 }
      )
    }

    let customer = await db.customer.findFirst({
      where: { salonId: salon.id, phone },
    })
    if (!customer) {
      customer = await db.customer.create({
        data: { name, phone, salonId: salon.id, notes: '' },
      })
    }

    const appointment = await db.appointment.create({
      data: {
        date,
        startTime,
        endTime,
        status: 'booked',
        notes: 'Booked online',
        customerId: customer.id,
        staffId,
        serviceId,
        salonId: salon.id,
      },
    })

    await db.payment.create({
      data: {
        appointmentId: appointment.id,
        status: 'unpaid',
        method: 'cash',
        amount: 0,
        salonId: salon.id,
      },
    })

    return NextResponse.json(
      {
        success: true,
        appointment: {
          date,
          startTime,
          endTime,
          serviceName: service.name,
          staffName: staff.name,
          price: service.price,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/public/booking error:', error)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}
