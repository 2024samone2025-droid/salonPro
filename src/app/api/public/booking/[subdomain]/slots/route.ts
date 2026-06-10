import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { parseSalonSettings } from '@/lib/salon-settings'

const NON_BLOCKING_STATUSES = ['cancelled', 'no_show']

function toTime(total: number) {
  return `${Math.floor(total / 60)
    .toString()
    .padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`
}

function toMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// Returns the list of bookable start times for a staff member on a date,
// given the selected service's duration.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return NextResponse.json({ error: 'Salon not found' }, { status: 404 })
  }

  const sp = req.nextUrl.searchParams
  const date = sp.get('date')
  const staffId = sp.get('staffId')
  const serviceId = sp.get('serviceId')

  if (!date || !staffId || !serviceId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Missing date, staffId or serviceId' }, { status: 400 })
  }

  const salon = await db.salon.findUnique({ where: { subdomain } })
  if (!salon) {
    return NextResponse.json({ error: 'Salon not found' }, { status: 404 })
  }

  const settings = parseSalonSettings(salon.settings)
  if (!settings.publicBookingEnabled) {
    return NextResponse.json({ error: 'Online booking is disabled' }, { status: 404 })
  }

  // Business hours for the requested weekday (0 = Sunday)
  const weekday = new Date(date + 'T00:00:00').getDay()
  const dayHours = settings.businessHours[String(weekday)]
  if (!dayHours || dayHours.closed) {
    return NextResponse.json({ slots: [] })
  }
  const openMinutes = toMinutes(dayHours.open)
  const closeMinutes = toMinutes(dayHours.close)
  const slotStep = settings.slotIntervalMinutes

  const service = await db.service.findFirst({
    where: { id: serviceId, salonId: salon.id, active: true },
    select: { duration: true },
  })
  const staff = await db.staff.findFirst({
    where: { id: staffId, salonId: salon.id, active: true },
    select: { id: true },
  })
  if (!service || !staff) {
    return NextResponse.json({ slots: [] })
  }

  const existing = await db.appointment.findMany({
    where: {
      salonId: salon.id,
      staffId,
      date,
      status: { notIn: NON_BLOCKING_STATUSES },
    },
    select: { startTime: true, endTime: true },
  })
  const busy = existing.map((a) => ({ start: toMinutes(a.startTime), end: toMinutes(a.endTime) }))

  const duration = service.duration
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const slots: string[] = []
  for (let start = openMinutes; start + duration <= closeMinutes; start += slotStep) {
    const end = start + duration
    if (date === todayStr && start <= nowMinutes) continue
    const overlaps = busy.some((b) => start < b.end && end > b.start)
    if (!overlaps) slots.push(toTime(start))
  }

  return NextResponse.json({ slots })
}
