import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/password'
import { createRootStaffToken, ROOT_STAFF_COOKIE, ROOT_STAFF_MAX_AGE, type StaffAccess } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// Staff login at the ROOT host (apex). The apex has no salon context, so we
// verify the email + password against every salon this email belongs to and keep
// only the ones where the password actually matches (staff may have different
// passwords per salon). We set a short-lived root-staff cookie carrying those
// verified memberships and return the matching salons so the client can redirect
// (one salon) or show a picker (several). The salon handoff itself is done via
// /api/staff/select → /api/auth/exchange.
//
// This is the staff parallel of /api/owner/login. The apex form tries owner login
// first and falls back here, so a non-owner email lands on staff auth.
// NOTE: rate-limiting / lockout is a deferred follow-up (shared with owner login).
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const normalized = String(email).trim().toLowerCase()

    // The same email may be a staff User at more than one salon.
    const candidates = await db.user.findMany({
      where: { email: normalized, active: true },
      select: {
        id: true,
        passwordHash: true,
        salon: { select: { id: true, name: true, subdomain: true } },
      },
    })

    // Keep only salons where THIS password verifies.
    const access: StaffAccess[] = []
    const salons: { id: string; name: string; subdomain: string }[] = []
    for (const c of candidates) {
      if (await verifyPassword(password, c.passwordHash)) {
        access.push({ userId: c.id, salonId: c.salon.id })
        salons.push(c.salon)
      }
    }

    // Generic failure — never reveal whether the email exists anywhere.
    if (access.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const response = NextResponse.json({ salons })

    // Host-only root-staff cookie (proves the verified memberships for select).
    response.cookies.set(ROOT_STAFF_COOKIE, createRootStaffToken({ email: normalized, access }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ROOT_STAFF_MAX_AGE,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Staff apex login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
