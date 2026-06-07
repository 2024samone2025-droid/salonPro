import { db } from '@/lib/db'
import { hashPin, createSessionToken, ROLE_PERMISSIONS, type UserRole } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { salonName, subdomain, adminName, adminPin } = await req.json()

    if (!salonName || !subdomain || !adminName || !adminPin) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 })
    }

    // Validate subdomain format
    const cleanSubdomain = subdomain.toLowerCase().trim()
    if (!cleanSubdomain.match(/^[a-z0-9-]+$/)) {
      return NextResponse.json({ error: 'Subdomain must be lowercase letters, numbers, or hyphens' }, { status: 400 })
    }

    // Check if subdomain exists
    const existingSalon = await db.salon.findUnique({ where: { subdomain: cleanSubdomain } })
    if (existingSalon) {
      return NextResponse.json({ error: 'Subdomain already taken' }, { status: 409 })
    }

    // Create salon and admin in transaction
    const result = await db.$transaction(async (tx) => {
      const salon = await tx.salon.create({
        data: { name: salonName, subdomain: cleanSubdomain, plan: 'free' },
      })

      const admin = await tx.user.create({
        data: {
          name: adminName,
          pin: hashPin(adminPin),
          role: 'admin',
          active: true,
          salonId: salon.id,
        },
      })

      return { salon, admin }
    })

    // Create session for auto-login
    const sessionUser = {
      id: result.admin.id,
      name: result.admin.name,
      role: result.admin.role as 'admin' | 'receptionist' | 'stylist',
      staffId: null,
      salonId: result.salon.id,
    }

    const token = createSessionToken(sessionUser)

    const response = NextResponse.json({
      user: sessionUser,
      permissions: ROLE_PERMISSIONS.admin,
      token,
      salon: { id: result.salon.id, name: result.salon.name, subdomain: result.salon.subdomain, plan: result.salon.plan },
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
    console.error('Salon creation error:', error)
    return NextResponse.json({ error: 'Failed to create salon' }, { status: 500 })
  }
}

// Check if subdomain is available
export async function GET(req: NextRequest) {
  const subdomain = req.nextUrl.searchParams.get('subdomain')
  if (!subdomain) {
    return NextResponse.json({ error: 'Subdomain required' }, { status: 400 })
  }

  const existing = await db.salon.findUnique({ where: { subdomain } })
  return NextResponse.json({ available: !existing })
}