import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import {
  verifySessionToken,
  verifyRootOwnerToken,
  createRootOwnerToken,
  createExchangeToken,
  ROOT_OWNER_COOKIE,
  ROOT_OWNER_MAX_AGE,
} from '@/lib/auth'
import { validateSubdomain } from '@/lib/constants'
import { buildExchangeUrl } from '@/lib/handoff'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

const salonView = (s: { id: string; name: string; subdomain: string; plan: string }) => ({
  id: s.id,
  name: s.name,
  subdomain: s.subdomain,
  plan: s.plan,
})

// Mint a single-use exchange token + nonce and build the (request-relative)
// subdomain handoff URL, so a freshly created/linked salon logs the owner
// straight in (Phase 2 flow).
async function buildOwnerHandoff(req: NextRequest, ownerId: string, salonSubdomain: string, salonId: string): Promise<string> {
  const nonce = await db.oneTimeToken.create({
    data: { ownerId, salonId, expiresAt: new Date(Date.now() + 60 * 1000) },
    select: { id: true },
  })
  const token = createExchangeToken({ jti: nonce.id, ownerId, salonId })
  return buildExchangeUrl(req, salonSubdomain, token)
}

// Map a unique-constraint violation to a friendly 409. Returns null if it isn't one.
function p2002Response(error: unknown): NextResponse | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    const target = error.meta?.target as string[] | undefined
    if (target?.includes('email')) {
      return NextResponse.json({ error: 'That email already has an account. Log in to add another salon.' }, { status: 409 })
    }
    if (target?.includes('subdomain')) {
      return NextResponse.json({ error: 'Subdomain already taken' }, { status: 409 })
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { salonName, subdomain } = body

    if (!salonName || !subdomain) {
      return NextResponse.json({ error: 'Salon name and subdomain are required' }, { status: 400 })
    }

    const cleanSubdomain = String(subdomain).trim().toLowerCase()
    const check = validateSubdomain(cleanSubdomain)
    if (!check.valid) {
      return NextResponse.json({ error: check.error }, { status: 400 })
    }

    // ── HARD STAFF GATE ──────────────────────────────────────────────────────
    // If ANY present cookie decodes to a valid staff session, reject — evaluated
    // BEFORE any owner cookie is read, so a staff cookie paired with a borrowed
    // or forged owner cookie can never let the owner branch win.
    const sessionToken = req.cookies.get('salonpro_session')?.value
    const subject = sessionToken ? verifySessionToken(sessionToken) : null
    if (subject?.kind === 'staff') {
      return NextResponse.json({ error: 'Staff accounts cannot create salons' }, { status: 403 })
    }

    // ── Resolve an authenticated OWNER (owner session, else root-owner cookie) ─
    let ownerId: string | null = null
    if (subject?.kind === 'owner') {
      ownerId = subject.id
    } else {
      const rootToken = req.cookies.get(ROOT_OWNER_COOKIE)?.value
      const rootOwner = rootToken ? verifyRootOwnerToken(rootToken) : null
      if (rootOwner) ownerId = rootOwner.id
    }

    // Friendly pre-check (not authoritative — the unique constraint, caught as
    // P2002 below, is what actually prevents a race).
    const existingSalon = await db.salon.findUnique({ where: { subdomain: cleanSubdomain } })
    if (existingSalon) {
      return NextResponse.json({ error: 'Subdomain already taken' }, { status: 409 })
    }

    // ── Authenticated owner → create Salon + link only ───────────────────────
    if (ownerId) {
      try {
        const salon = await db.$transaction(async (tx) => {
          const s = await tx.salon.create({ data: { name: salonName, subdomain: cleanSubdomain, plan: 'free' } })
          await tx.ownerSalon.create({ data: { ownerId, salonId: s.id } })
          return s
        })
        const redirect = await buildOwnerHandoff(req, ownerId, salon.subdomain, salon.id)
        return NextResponse.json({ salon: salonView(salon), redirect })
      } catch (error) {
        const conflict = p2002Response(error)
        if (conflict) return conflict
        throw error
      }
    }

    // ── Unauthenticated → mint a NEW owner (only path that creates an Owner) ──
    const { ownerName, email, password } = body
    if (!ownerName || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
    }
    const normalizedEmail = String(email).trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    }
    if (String(password).length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Known tradeoff: this 409 is a minor email-enumeration oracle (reveals which
    // emails are registered owners) — accepted for UX clarity. We never attach to
    // an existing owner on an unauthenticated request (no password side-door).
    const existingOwner = await db.owner.findUnique({ where: { email: normalizedEmail } })
    if (existingOwner) {
      return NextResponse.json({ error: 'That email already has an account. Log in to add another salon.' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    try {
      const result = await db.$transaction(async (tx) => {
        const owner = await tx.owner.create({ data: { name: ownerName, email: normalizedEmail, passwordHash } })
        const salon = await tx.salon.create({ data: { name: salonName, subdomain: cleanSubdomain, plan: 'free' } })
        await tx.ownerSalon.create({ data: { ownerId: owner.id, salonId: salon.id } })
        return { owner, salon }
      })

      const redirect = await buildOwnerHandoff(req, result.owner.id, result.salon.subdomain, result.salon.id)
      const response = NextResponse.json({ salon: salonView(result.salon), redirect })

      // Log the new owner in at the root host too, so they can return to switch
      // salons without re-auth within the window.
      response.cookies.set(
        ROOT_OWNER_COOKIE,
        createRootOwnerToken({ id: result.owner.id, name: result.owner.name, email: result.owner.email }),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: ROOT_OWNER_MAX_AGE,
          path: '/',
        }
      )
      return response
    } catch (error) {
      const conflict = p2002Response(error)
      if (conflict) return conflict
      throw error
    }
  } catch (error) {
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
