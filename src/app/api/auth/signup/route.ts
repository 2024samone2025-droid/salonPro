import { db } from '@/lib/db'
import { hashPin } from '@/lib/auth'
import { requireAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'canManageStaff')
  if (!auth.authorized) return auth.error

  try {
    const { name, pin } = await req.json()

    if (!name || !pin) {
      return NextResponse.json({ error: 'Name and PIN are required' }, { status: 400 })
    }

    const salonId = auth.salonId as string
    const existing = await db.user.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, salonId },
    })

    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
    }

    const user = await db.user.create({
      data: {
        name,
        pin: hashPin(pin),
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
