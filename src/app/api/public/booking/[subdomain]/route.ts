import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { parseSalonSettings } from '@/lib/salon-settings'
import { parseStaffAvailability } from '@/lib/staff-availability'

const NON_BLOCKING_STATUSES = ['cancelled', 'no_show']

function toMin(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// Minutes → 'HH:mm', clamped to a single day so buffer-widened bounds stay valid.
function toClock(total: number) {
  const clamped = Math.min(24 * 60 - 1, Math.max(0, total))
  return `${Math.floor(clamped / 60)
    .toString()
    .padStart(2, '0')}:${(clamped % 60).toString().padStart(2, '0')}`
}

function badSubdomain(subdomain: string) {
  return !subdomain || !/^[a-z0-9-]+$/.test(subdomain)
}

async function resolveSalon(subdomain: string) {
  if (badSubdomain(subdomain)) return null
  const salon = await db.salon.findUnique({ where: { subdomain } })
  // Status-first masking: a SUSPENDED salon reads to the public as simply
  // not-found. Resolving to null here means every caller (GET, POST) returns the
  // generic 404 below — BEFORE publicBookingEnabled or any other branch — so the
  // public surface never leaks that a salon exists-but-is-suspended.
  if (!salon || salon.status === 'SUSPENDED') return null
  return salon
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
  const settings = parseSalonSettings(salon.settings)
  if (!settings.publicBookingEnabled) {
    return NextResponse.json({ error: 'Salon not found' }, { status: 404 })
  }

  const [services, staff] = await Promise.all([
    db.service.findMany({
      where: { salonId: salon.id, active: true, onlineBookable: true },
      select: { id: true, name: true, price: true, duration: true, description: true, category: true },
      orderBy: { name: 'asc' },
    }),
    db.staff.findMany({
      where: { salonId: salon.id, active: true, role: 'stylist' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return NextResponse.json({
    salon: { name: salon.name, subdomain: salon.subdomain, logoUrl: settings.profile.logoUrl },
    currency: settings.currency,
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
  const settings = parseSalonSettings(salon.settings)
  if (!settings.publicBookingEnabled) {
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
      db.service.findFirst({ where: { id: serviceId, salonId: salon.id, active: true, onlineBookable: true } }),
      db.staff.findFirst({ where: { id: staffId, salonId: salon.id, active: true } }),
    ])
    if (!service) {
      return NextResponse.json({ error: 'Selected service is not available' }, { status: 400 })
    }
    if (!staff) {
      return NextResponse.json({ error: 'Selected stylist is not available' }, { status: 400 })
    }

    // Day off: salon-wide (staffId null) or this stylist → reject the booking.
    const dayOff = await db.dayOff.findFirst({
      where: { salonId: salon.id, date, OR: [{ staffId: null }, { staffId }] },
      select: { staffId: true },
    })
    if (dayOff) {
      return NextResponse.json(
        {
          error: dayOff.staffId
            ? 'That stylist is off on that day'
            : 'The salon is closed on that day',
        },
        { status: 400 }
      )
    }

    const [h, m] = startTime.split(':').map(Number)
    const endMinutes = h * 60 + m + service.duration
    const endTime = `${Math.floor(endMinutes / 60)
      .toString()
      .padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`

    const rules = settings.bookingRules
    const slotStart = new Date(`${date}T${startTime}:00`)

    // Lead time (subsumes the "already passed" check when lead time is 0).
    const leadCutoffMs = Date.now() + rules.minLeadTimeHours * 60 * 60 * 1000
    if (slotStart.getTime() < leadCutoffMs) {
      const msg =
        rules.minLeadTimeHours > 0
          ? `Bookings must be made at least ${rules.minLeadTimeHours} hour(s) in advance`
          : 'That time has already passed'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    // Advance window.
    const maxDate = new Date()
    maxDate.setHours(0, 0, 0, 0)
    maxDate.setDate(maxDate.getDate() + rules.maxAdvanceDays)
    if (new Date(date + 'T00:00:00').getTime() > maxDate.getTime()) {
      return NextResponse.json(
        { error: `Bookings can only be made up to ${rules.maxAdvanceDays} day(s) ahead` },
        { status: 400 }
      )
    }

    // Respect the salon's business hours for the requested weekday
    const dayHours = settings.businessHours[String(slotStart.getDay())]
    if (!dayHours || dayHours.closed) {
      return NextResponse.json({ error: 'The salon is closed on that day' }, { status: 400 })
    }
    if (toMin(startTime) < toMin(dayHours.open) || endMinutes > toMin(dayHours.close)) {
      return NextResponse.json({ error: 'That time is outside opening hours' }, { status: 400 })
    }

    // Respect the stylist's own availability (null = follows salon hours).
    const staffAvail = parseStaffAvailability(staff.availability)
    if (staffAvail) {
      const sd = staffAvail[String(slotStart.getDay())]
      if (sd.closed || toMin(startTime) < toMin(sd.open) || endMinutes > toMin(sd.close)) {
        return NextResponse.json(
          { error: 'That stylist is not available at that time' },
          { status: 400 }
        )
      }
    }

    // Buffers protect each EXISTING appointment's reserved zone [start-before, end+after].
    // Rearranged for a column comparison, the candidate conflicts with an existing row iff
    //   existing.start < candidateEnd + before  AND  existing.end > candidateStart - after
    const startMin = toMin(startTime)
    const windowEnd = toClock(endMinutes + rules.bufferBeforeMinutes)
    const windowStart = toClock(startMin - rules.bufferAfterMinutes)
    const conflict = await db.appointment.findFirst({
      where: {
        salonId: salon.id,
        staffId,
        date,
        status: { notIn: NON_BLOCKING_STATUSES },
        startTime: { lt: windowEnd },
        endTime: { gt: windowStart },
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
