import { getSession, ROLE_PERMISSIONS, type UserRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { parseSalonSettings } from '@/lib/salon-settings'
import { SALON_SUBDOMAIN_HEADER } from '@/lib/subdomain'

// Logged-out / not-a-member both look identical to the client (no existence leak).
const loggedOut = () =>
  NextResponse.json({ user: null, permissions: null, salon: null }, { status: 401 })

// "Who am I, on THIS tenant?" — host-aware (sub-decision B). The cookie alone is
// not enough: we resolve the salon from the Host and confirm the subject is an
// active member of it, so a stale cross-tenant cookie never renders the wrong
// identity inside another salon's shell.
export async function GET() {
  try {
    const subdomain = (await headers()).get(SALON_SUBDOMAIN_HEADER)
    if (!subdomain) return loggedOut() // no tenant context (root host)

    const salon = await db.salon.findUnique({ where: { subdomain } })
    if (!salon) {
      // Unknown subdomain → 404 (the page layout shows the notFound() UX).
      return NextResponse.json({ user: null, permissions: null, salon: null }, { status: 404 })
    }

    const subject = await getSession()
    if (!subject) return loggedOut()

    // Membership against the resolved salon; fresh role + tour flag from the row.
    const member = await db.user.findFirst({
      where: { id: subject.id, salonId: salon.id, active: true },
      select: { id: true, name: true, role: true, staffId: true, tourCompleted: true },
    })
    if (!member) return loggedOut()

    const permissions = ROLE_PERMISSIONS[member.role as UserRole] || null

    return NextResponse.json({
      user: {
        kind: 'staff',
        id: member.id,
        name: member.name,
        role: member.role,
        staffId: member.staffId,
        salonId: salon.id,
        tourCompleted: member.tourCompleted,
      },
      permissions,
      salon: {
        id: salon.id,
        name: salon.name,
        subdomain: salon.subdomain,
        plan: salon.plan,
        settings: parseSalonSettings(salon.settings),
      },
    })
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json({ user: null, permissions: null, salon: null }, { status: 500 })
  }
}
