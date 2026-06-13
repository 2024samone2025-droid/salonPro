import { db } from '@/lib/db'
import { hashPin, createSessionToken, ROLE_PERMISSIONS, type UserRole } from '@/lib/auth'
import { validateSubdomain } from '@/lib/constants'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { salonName, subdomain, adminName, adminPin } = await req.json()

    if (!salonName || !subdomain || !adminName || !adminPin) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 })
    }

    // Validate subdomain format / length / reserved names (shared rules)
    const cleanSubdomain = subdomain.trim().toLowerCase()
    const check = validateSubdomain(cleanSubdomain)
    if (!check.valid) {
      return NextResponse.json({ error: check.error }, { status: 400 })
    }

    // Fast pre-check for a friendly message in the common case. Not authoritative:
    // the unique constraint (caught below as P2002) is what actually prevents a
    // race between two near-simultaneous signups claiming the same subdomain.
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
          tourCompleted: false,
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
    // Race backstop: the unique constraint on Salon.subdomain rejects the loser
    // of two simultaneous signups. Surface it as a clean 409, not a 500.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      (error.meta?.target as string[] | undefined)?.includes('subdomain')
    ) {
      return NextResponse.json({ error: 'Subdomain already taken' }, { status: 409 })
    }
    console.error('Salon creation error:', error)
    return NextResponse.json({ error: 'Failed to create salon' }, { status: 500 })
  }
}

// Check if subdomain is available (powers the signup live-availability UX).
export async function GET(req: NextRequest) {
  const subdomain = req.nextUrl.searchParams.get('subdomain')
  if (!subdomain) {
    return NextResponse.json({ error: 'Subdomain required' }, { status: 400 })
  }

  // Apply the same rules server-side so the endpoint can't be probed past them.
  const value = subdomain.trim().toLowerCase()
  const check = validateSubdomain(value)
  if (!check.valid) {
    return NextResponse.json({ available: false, reason: check.error })
  }

  const existing = await db.salon.findUnique({ where: { subdomain: value } })
  return NextResponse.json({
    available: !existing,
    reason: existing ? 'Subdomain already taken' : undefined,
  })
}