import { db } from '@/lib/db'
import { ROOT_OWNER_COOKIE, verifyRootOwnerToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// Restore the owner picker from the root-owner cookie (e.g. on page reload),
// so a logged-in owner doesn't have to re-enter credentials within the window.
export async function GET(req: NextRequest) {
  const token = req.cookies.get(ROOT_OWNER_COOKIE)?.value
  const session = token ? verifyRootOwnerToken(token) : null
  if (!session) {
    return NextResponse.json({ owner: null, salons: [] }, { status: 401 })
  }

  const links = await db.ownerSalon.findMany({
    where: { ownerId: session.id },
    select: { salon: { select: { id: true, name: true, subdomain: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({
    owner: { id: session.id, name: session.name, email: session.email },
    salons: links.map((l) => l.salon),
  })
}
