import { db } from '@/lib/db'
import { hashPin } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { name, pin, role } = await req.json()

    if (!name || !pin || !role) {
      return NextResponse.json({ error: 'Name, PIN, and role are required' }, { status: 400 })
    }

    if (!['admin', 'receptionist', 'stylist'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const existing = await db.user.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    })

    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
    }

    const user = await db.user.create({
      data: {
        name,
        pin: hashPin(pin),
        role: role as 'admin' | 'receptionist' | 'stylist',
        active: true,
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
