import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import {
  parseUserSettings,
  validateUserSettingsPatch,
  type UserSettings,
} from '@/lib/user-settings'

// Personal settings for the current subject. Branches on auth.user.kind:
// staff → User row, owner → Owner row (owners have no User row). displayName
// maps to the real `name` column; everything else lives in the settings blob.

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized || !auth.user) return auth.error

  const row =
    auth.user.kind === 'owner'
      ? await db.owner.findUnique({ where: { id: auth.user.id }, select: { name: true, settings: true } })
      : await db.user.findUnique({ where: { id: auth.user.id }, select: { name: true, settings: true } })

  if (!row) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  return NextResponse.json({
    displayName: row.name,
    settings: parseUserSettings(row.settings),
  })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized || !auth.user) return auth.error

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  const data: { name?: string; settings?: Prisma.InputJsonValue } = {}

  if (body.displayName !== undefined) {
    const name = String(body.displayName).trim()
    if (name.length < 2 || name.length > 60) {
      return NextResponse.json({ error: 'Display name must be 2–60 characters' }, { status: 400 })
    }
    data.name = name
  }

  if (body.settings !== undefined) {
    const validationError = validateUserSettingsPatch(body.settings)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }
    // Read-modify-write so a partial patch can't wipe sibling settings.
    const existing =
      auth.user.kind === 'owner'
        ? await db.owner.findUnique({ where: { id: auth.user.id }, select: { settings: true } })
        : await db.user.findUnique({ where: { id: auth.user.id }, select: { settings: true } })
    if (!existing) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    const current = parseUserSettings(existing.settings)
    const patch = body.settings as Partial<UserSettings>
    const merged: UserSettings = {
      profile: { ...current.profile, ...(patch.profile ?? {}) },
      appPreferences: { ...current.appPreferences, ...(patch.appPreferences ?? {}) },
    }
    data.settings = merged as unknown as Prisma.InputJsonValue
  }

  if (data.name === undefined && data.settings === undefined) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const updated =
    auth.user.kind === 'owner'
      ? await db.owner.update({ where: { id: auth.user.id }, data, select: { name: true, settings: true } })
      : await db.user.update({ where: { id: auth.user.id }, data, select: { name: true, settings: true } })

  return NextResponse.json({
    displayName: updated.name,
    settings: parseUserSettings(updated.settings),
  })
}
