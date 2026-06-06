import { db } from '@/lib/db'
import { verifyPin, createSessionToken, ROLE_PERMISSIONS, type UserRole } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { name, pin } = await req.json()

    if (!name || !pin) {
      return NextResponse.json({ error: 'Name and PIN are required' }, { status: 400 })
    }

    // Find user by name (case-insensitive search)
    const allUsers = await db.user.findMany({ where: { active: true } })
    const user = allUsers.find((u) => u.name.toLowerCase() === name.toLowerCase())

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Verify PIN (synchronous)
    const isValid = verifyPin(pin, user.pin)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Create session
    const sessionUser = {
      id: user.id,
      name: user.name,
      role: user.role as 'admin' | 'receptionist' | 'stylist',
      staffId: user.staffId,
    }

    const token = createSessionToken(sessionUser)

    // Get permissions for this role
    const permissions = ROLE_PERMISSIONS[user.role as UserRole] || null

    // Set cookie via response header (primary auth method)
    // Also return token in body for localStorage (fallback for iframe/sandbox environments)
    const response = NextResponse.json({
      user: sessionUser,
      permissions,
      token, // Client stores this in localStorage for Authorization header
      message: 'Login successful',
    })

    response.cookies.set('salonpro_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
