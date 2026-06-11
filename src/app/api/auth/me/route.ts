import { verifySessionToken, getSession, ROLE_PERMISSIONS, type UserRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { parseSalonSettings } from '@/lib/salon-settings'

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
      return NextResponse.json({ user: null, permissions: null, salon: null }, { status: 401 })
    }

    // Fetch salon info
    const salon = await db.salon.findUnique({ where: { id: user.salonId } })

    const permissions = ROLE_PERMISSIONS[user.role as UserRole] || null

    return NextResponse.json({
      user,
      permissions,
      salon: salon
        ? {
            id: salon.id,
            name: salon.name,
            subdomain: salon.subdomain,
            plan: salon.plan,
            settings: parseSalonSettings(salon.settings),
          }
        : null,
    })
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json({ user: null, permissions: null, salon: null }, { status: 500 })
  }
}
