import { verifySessionToken, getSession, ROLE_PERMISSIONS, type UserRole } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    let user = await getSession()

    // Fallback: check Authorization header if cookie didn't work
    if (!user) {
      const authHeader = req.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7)
        user = verifySessionToken(token)
      }
    }

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
