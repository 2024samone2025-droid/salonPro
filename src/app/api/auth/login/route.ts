import { db } from '@/lib/db'
import { createSessionToken, ROLE_PERMISSIONS, type UserRole } from '@/lib/auth'
import { verifyPassword } from '@/lib/password'
import { parseSalonSettings } from '@/lib/salon-settings'
import { parseUserSettings } from '@/lib/user-settings'
import { SALON_SUBDOMAIN_HEADER } from '@/lib/subdomain'
import { NextRequest, NextResponse } from 'next/server'

// Staff login, scoped to the salon resolved from the Host (the middleware sets
// x-salon-subdomain; in dev it honours ?salon= as a fallback). No 'demo'
// default — the Host is the only authority for which salon we authenticate against.
// Email + password (PINs were retired); failure is generic so we never reveal
// whether an email exists in this salon.
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

    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const normalized = String(email).trim().toLowerCase()
    const user = await db.user.findFirst({
      where: { salonId: salon.id, email: normalized, active: true },
    })
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
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
        mustResetPassword: user.mustResetPassword,
        settings: parseUserSettings(user.settings),
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
