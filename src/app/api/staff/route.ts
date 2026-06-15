import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { logActivity } from '@/lib/activity'
import { validateStaffAvailability } from '@/lib/staff-availability'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.error

  const active = req.nextUrl.searchParams.get('active')
  const where: Record<string, unknown> = { salonId: auth.salonId }
  if (active === 'true') where.active = true
  const staff = await db.staff.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(staff)
}

// No POST: staff are NOT created directly. The only way a roster slot comes into
// existence is the owner-provisioned onboarding flow (api/users), which creates +
// links a Staff slot for stylists inside its transaction. This keeps the rule that
// nobody is on the booking calendar without being a provisioned worker — no "ghost"
// roster entries. See context/ACTIVITY-LOG-context.md / the staff onboarding model.

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, 'canManageStaff')
  if (!auth.authorized) return auth.error

  const body = await req.json()
  const { id, name, phone, role, active, availability } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  // Scope to the caller's salon — never trust the id alone (multi-tenancy).
  const owned = await db.staff.findFirst({ where: { id, salonId: auth.salonId }, select: { id: true } })
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Whitelist editable fields — never spread the raw body (no salonId / column injection).
  const data: Prisma.StaffUpdateInput = {}
  if (name !== undefined) data.name = String(name).trim()
  if (phone !== undefined) data.phone = String(phone).trim()
  if (role !== undefined) data.role = role === 'receptionist' ? 'receptionist' : 'stylist'
  if (active !== undefined) data.active = Boolean(active)
  if (availability !== undefined) {
    if (availability === null) {
      data.availability = Prisma.DbNull // explicit reset → follow salon hours
    } else {
      const availError = validateStaffAvailability(availability)
      if (availError) return NextResponse.json({ error: availError }, { status: 400 })
      data.availability = availability as Prisma.InputJsonValue
    }
  }

  const staff = await db.staff.update({ where: { id }, data })
  await logActivity(auth, {
    action: 'staff.updated',
    targetType: 'staff',
    targetId: staff.id,
    summary: `Updated roster entry for ${staff.name}`,
    metadata: { name: staff.name, role: staff.role, active: staff.active },
  })
  return NextResponse.json(staff)
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req, 'canManageStaff')
  if (!auth.authorized) return auth.error

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const existing = await db.staff.findFirst({ where: { id, salonId: auth.salonId }, select: { name: true, role: true } })
  await db.staff.delete({ where: { id } })

  if (existing) {
    await logActivity(auth, {
      action: 'staff.removed',
      targetType: 'staff',
      targetId: id,
      summary: `Removed ${existing.name} from the roster`,
      metadata: { name: existing.name, role: existing.role },
    })
  }

  return NextResponse.json({ success: true })
}
