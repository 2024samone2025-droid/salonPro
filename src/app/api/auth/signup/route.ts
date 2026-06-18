import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { requireAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'canManageStaff')
  if (!auth.authorized) return auth.error

  try {
    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
    }
    const normalized = String(email).trim().toLowerCase()
    if (!EMAIL_RE.test(normalized)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }
    if (String(password).length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 })
    }

    const salonId = auth.salonId as string
    const existing = await db.user.findFirst({
      where: { email: normalized, salonId },
    })

    if (existing) {
      return NextResponse.json({ error: 'A user with that email already exists' }, { status: 409 })
    }

    const user = await db.user.create({
      data: {
        name,
        email: normalized,
        passwordHash: await hashPassword(password),
        role: 'receptionist',
        active: true,
        tourCompleted: false,
        salonId,
      },
    })

    return NextResponse.json({
      id: user.id,
      name: user.name,
      role: user.role,
      message: 'Account created successfully',
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 })
  }
}
