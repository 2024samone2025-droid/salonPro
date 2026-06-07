import { db } from '@/lib/db'
import { verifyPin, createSessionToken, ROLE_PERMISSIONS, type UserRole } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { name, pin } = await req.json()

    // Get salon subdomain from middleware header or query param (dev mode)
    const subdomain = req.headers.get('x-salon-subdomain') || req.nextUrl.searchParams.get('salon') || 'demo'

    // Look up salon by subdomain
    const salon = await db.salon.findUnique({ where: { subdomain } })
    if (!salon) {
      return NextResponse.json({ error: 'Salon not found - access via valid subdomain' }, { status: 404 })
    }

    if (!name || !pin) {
      return NextResponse.json({ error: 'Name and PIN are required' }, { status: 400 })
    }

    const allUsers = await db.user.findMany({ where: { salonId: salon.id, active: true } })
    const user = allUsers.find((u) => u.name.toLowerCase() === name.toLowerCase())

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const isValid = verifyPin(pin, user.pin)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const sessionUser = {
      id: user.id,
      name: user.name,
      role: user.role as 'admin' | 'receptionist' | 'stylist',
      staffId: user.staffId,
      salonId: user.salonId,
    }

    const token = createSessionToken(sessionUser)

    const permissions = ROLE_PERMISSIONS[user.role as UserRole] || null

    const response = NextResponse.json({
      user: sessionUser,
      permissions,
      token,
      salon: { id: salon.id, name: salon.name, subdomain: salon.subdomain, plan: salon.plan },
      message: 'Login successful',
    })

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
