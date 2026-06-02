import { getSession, ROLE_PERMISSIONS, type UserRole } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ user: null, permissions: null }, { status: 401 })
    }

    const permissions = ROLE_PERMISSIONS[user.role as UserRole] || null

    return NextResponse.json({
      user,
      permissions,
    })
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json({ user: null, permissions: null }, { status: 500 })
  }
}
