import { db } from '@/lib/db'
import { verifyPin, createSessionToken, ROLE_PERMISSIONS, type UserRole } from '@/lib/auth'
import { parseSalonSettings } from '@/lib/salon-settings'
import { SALON_SUBDOMAIN_HEADER } from '@/lib/subdomain'
import { NextRequest, NextResponse } from 'next/server'

// Staff login, scoped to the salon resolved from the Host (the middleware sets
// x-salon-subdomain; in dev it honours ?salon= as a fallback). No 'demo'
// default — the Host is the only authority for which salon we authenticate against.
export async function POST(req: NextRequest) {
  try {
    const subdomain = req.headers.get(SALON_SUBDOMAIN_HEADER)
    if (!subdomain) {
      return NextResponse.json({ error: 'No salon context' }, { status: 404 })
    }

    const salon = await db.salon.findUnique({ where: { subdomain } })
    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 })
    }

    const { name, pin } = await req.json()
    if (!name || !pin) {
      return NextResponse.json({ error: 'Name and PIN are required' }, { status: 400 })
    }

    const allUsers = await db.user.findMany({ where: { salonId: salon.id, active: true } })
    const user = allUsers.find((u) => u.name.toLowerCase() === name.toLowerCase())
    if (!user || !verifyPin(pin, user.pin)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = createSessionToken({
      id: user.id,
      name: user.name,
      role: user.role as UserRole,
      staffId: user.staffId,
    })

    const permissions = ROLE_PERMISSIONS[user.role as UserRole] || null

    const response = NextResponse.json({
      user: {
        kind: 'staff',
        id: user.id,
        name: user.name,
        role: user.role,
        staffId: user.staffId,
        salonId: salon.id,
      },
      permissions,
      salon: {
        id: salon.id,
        name: salon.name,
        subdomain: salon.subdomain,
        plan: salon.plan,
        settings: parseSalonSettings(salon.settings),
      },
      message: 'Login successful',
    })

    // Host-only cookie (no Domain) — naturally isolated per subdomain.
    response.cookies.set('salonpro_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
