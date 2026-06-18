import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/password'
import { createRootOwnerToken, ROOT_OWNER_COOKIE, ROOT_OWNER_MAX_AGE } from '@/lib/auth'
import { rootCookieDomain } from '@/lib/subdomain'
import { NextRequest, NextResponse } from 'next/server'

// Owner login at the ROOT host. Verifies email + password, sets the short-lived
// root-owner cookie, and returns the owner's linked salons so the client can
// redirect (one salon) or show a picker (several). The salon handoff itself is
// done via /api/owner/select → /api/auth/exchange.
// NOTE: rate-limiting / lockout is a deferred follow-up.
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const normalized = String(email).trim().toLowerCase()
    const owner = await db.owner.findUnique({ where: { email: normalized } })

    // Generic failure — never reveal whether the email exists.
    if (!owner || !(await verifyPassword(password, owner.passwordHash))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const links = await db.ownerSalon.findMany({
      where: { ownerId: owner.id },
      select: { salon: { select: { id: true, name: true, subdomain: true } } },
      orderBy: { createdAt: 'asc' },
    })

    const response = NextResponse.json({
      owner: { id: owner.id, name: owner.name, email: owner.email },
      salons: links.map((l) => l.salon),
    })

    // Root-owner cookie (proves identity for the picker / select step). Scoped to
    // the registrable apex so a logout on a tenant subdomain can clear it (see
    // rootCookieDomain) — undefined domain on localhost = host-only, as before.
    const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0].trim()
    response.cookies.set(
      ROOT_OWNER_COOKIE,
      createRootOwnerToken({ id: owner.id, name: owner.name, email: owner.email }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: ROOT_OWNER_MAX_AGE,
        path: '/',
        domain: rootCookieDomain(host),
      }
    )

    return response
  } catch (error) {
    console.error('Owner login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
