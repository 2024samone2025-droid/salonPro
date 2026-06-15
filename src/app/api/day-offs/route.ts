import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { logActivity } from '@/lib/activity'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isAdmin(role: string | undefined) {
  return role === 'admin'
}

// List the salon's closures / days off, newest date first, with the stylist name
// joined for display (null = salon-wide).
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.error

  const rows = await db.dayOff.findMany({
    where: { salonId: auth.salonId },
    orderBy: { date: 'desc' },
    select: {
      id: true,
      date: true,
      reason: true,
      staffId: true,
      staff: { select: { name: true } },
    },
  })

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      date: r.date,
      reason: r.reason,
      staffId: r.staffId,
      staffName: r.staff?.name ?? null, // null = salon-wide
    }))
  )
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.error
  if (!isAdmin(auth.user?.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  const date = String(body.date || '').trim()
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: 'A valid date (YYYY-MM-DD) is required' }, { status: 400 })
  }
  const reason = String(body.reason || '').trim().slice(0, 120)

  // staffId optional; when present it MUST belong to this salon (never trust the body).
  let staffId: string | null = null
  let staffName: string | null = null
  if (body.staffId) {
    const staff = await db.staff.findFirst({
      where: { id: String(body.staffId), salonId: auth.salonId },
      select: { id: true, name: true },
    })
    if (!staff) return NextResponse.json({ error: 'Stylist not found' }, { status: 400 })
    staffId = staff.id
    staffName = staff.name
  }

  // Prevent a duplicate for the same date + scope (a DB unique constraint can't
  // catch the salon-wide case, since Postgres treats NULL staffId as distinct).
  const dup = await db.dayOff.findFirst({
    where: { salonId: auth.salonId, date, staffId },
    select: { id: true },
  })
  if (dup) {
    return NextResponse.json(
      { error: staffName ? `${staffName} is already off on ${date}` : `The salon is already closed on ${date}` },
      { status: 409 }
    )
  }

  const created = await db.dayOff.create({
    data: { date, reason, salonId: auth.salonId, staffId },
  })

  await logActivity(auth, {
    action: 'day_off.added',
    targetType: 'day_off',
    targetId: created.id,
    summary: staffName
      ? `Marked ${staffName} off on ${date}`
      : `Marked the salon closed on ${date}`,
    metadata: { date, reason, staffId, scope: staffId ? 'staff' : 'salon' },
  })

  return NextResponse.json(
    { id: created.id, date, reason, staffId, staffName },
    { status: 201 }
  )
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.error
  if (!isAdmin(auth.user?.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  // Scope to the caller's salon — never delete by id alone.
  const existing = await db.dayOff.findFirst({
    where: { id, salonId: auth.salonId },
    select: { id: true, date: true, staff: { select: { name: true } } },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.dayOff.delete({ where: { id: existing.id } })

  await logActivity(auth, {
    action: 'day_off.removed',
    targetType: 'day_off',
    targetId: existing.id,
    summary: existing.staff?.name
      ? `Removed ${existing.staff.name}'s day off on ${existing.date}`
      : `Removed the salon closure on ${existing.date}`,
    metadata: { date: existing.date },
  })

  return NextResponse.json({ success: true })
}
