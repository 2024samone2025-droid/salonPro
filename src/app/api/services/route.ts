import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.error

  const active = req.nextUrl.searchParams.get('active')
  const where: Record<string, unknown> = { salonId: auth.salonId }
  if (active === 'true') where.active = true
  const services = await db.service.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(services)
}

// Validate + normalize the editable fields shared by POST/PUT. Returns either an
// error string or a clean data object (only the keys present in `body`).
// Partial update/create shape — only the editable scalar fields (no relations).
type ServiceFields = Partial<
  Pick<Prisma.ServiceUncheckedCreateInput, 'name' | 'price' | 'duration' | 'active' | 'onlineBookable' | 'category' | 'description'>
>

function buildServiceData(
  body: Record<string, unknown>,
  { requireCore }: { requireCore: boolean }
): { error: string } | { data: ServiceFields } {
  const data: ServiceFields = {}

  if (requireCore || body.name !== undefined) {
    const name = String(body.name ?? '').trim()
    if (!name) return { error: 'Service name is required' }
    data.name = name.slice(0, 80)
  }
  if (requireCore || body.price !== undefined) {
    const price = Number(body.price)
    if (!Number.isFinite(price) || price < 0) return { error: 'Price must be 0 or more' }
    data.price = price
  }
  if (requireCore || body.duration !== undefined) {
    const duration = Number(body.duration)
    if (!Number.isInteger(duration) || duration <= 0) return { error: 'Duration must be a positive number of minutes' }
    data.duration = duration
  }
  if (body.active !== undefined) data.active = Boolean(body.active)
  if (body.onlineBookable !== undefined) data.onlineBookable = Boolean(body.onlineBookable)
  if (body.category !== undefined) data.category = String(body.category).trim().slice(0, 40)
  if (body.description !== undefined) data.description = String(body.description).trim().slice(0, 280)

  return { data }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'canManageServices')
  if (!auth.authorized) return auth.error

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  const built = buildServiceData(body, { requireCore: true })
  if ('error' in built) return NextResponse.json({ error: built.error }, { status: 400 })

  const service = await db.service.create({
    // name/price/duration are guaranteed present when requireCore is true.
    data: { ...built.data, salonId: auth.salonId } as Prisma.ServiceUncheckedCreateInput,
  })
  return NextResponse.json(service, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, 'canManageServices')
  if (!auth.authorized) return auth.error

  const body = await req.json().catch(() => null)
  if (!body || !body.id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  // Scope to the caller's salon — never trust the id alone (multi-tenancy).
  const owned = await db.service.findFirst({ where: { id: body.id, salonId: auth.salonId }, select: { id: true } })
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const built = buildServiceData(body, { requireCore: false })
  if ('error' in built) return NextResponse.json({ error: built.error }, { status: 400 })

  const service = await db.service.update({ where: { id: body.id }, data: built.data })
  return NextResponse.json(service)
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req, 'canManageServices')
  if (!auth.authorized) return auth.error

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  // Scope to the caller's salon — never delete by id alone.
  const owned = await db.service.findFirst({ where: { id, salonId: auth.salonId }, select: { id: true } })
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.service.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
