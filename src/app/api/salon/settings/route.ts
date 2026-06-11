import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import {
  parseSalonSettings,
  validateSettingsPatch,
  type SalonSettings,
} from '@/lib/salon-settings'

const SUBDOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.error
  if (auth.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const salon = await db.salon.findUnique({ where: { id: auth.salonId } })
  if (!salon) return NextResponse.json({ error: 'Salon not found' }, { status: 404 })

  return NextResponse.json({
    name: salon.name,
    subdomain: salon.subdomain,
    plan: salon.plan,
    settings: parseSalonSettings(salon.settings),
  })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.error
  if (auth.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  const salon = await db.salon.findUnique({ where: { id: auth.salonId } })
  if (!salon) return NextResponse.json({ error: 'Salon not found' }, { status: 404 })

  const data: { name?: string; subdomain?: string; settings?: Prisma.InputJsonValue } = {}

  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (name.length < 2 || name.length > 60) {
      return NextResponse.json({ error: 'Salon name must be 2–60 characters' }, { status: 400 })
    }
    data.name = name
  }

  if (body.subdomain !== undefined && body.subdomain !== salon.subdomain) {
    const subdomain = String(body.subdomain).trim().toLowerCase()
    if (!SUBDOMAIN_RE.test(subdomain)) {
      return NextResponse.json(
        { error: 'Subdomain must be 3–30 characters: lowercase letters, numbers, hyphens' },
        { status: 400 }
      )
    }
    const taken = await db.salon.findUnique({ where: { subdomain } })
    if (taken) {
      return NextResponse.json({ error: 'That subdomain is already taken' }, { status: 409 })
    }
    data.subdomain = subdomain
  }

  if (body.settings !== undefined) {
    const current = parseSalonSettings(salon.settings)
    const merged: SalonSettings = {
      ...current,
      ...body.settings,
      businessHours: body.settings.businessHours ?? current.businessHours,
    }
    const validationError = validateSettingsPatch(merged)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }
    data.settings = merged as unknown as Prisma.InputJsonValue
  }

  const updated = await db.salon.update({ where: { id: auth.salonId }, data })

  return NextResponse.json({
    name: updated.name,
    subdomain: updated.subdomain,
    plan: updated.plan,
    settings: parseSalonSettings(updated.settings),
  })
}
