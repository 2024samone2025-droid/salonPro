import { db } from '@/lib/db'
import { ROOT_STAFF_COOKIE, verifyRootStaffToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// Restore the staff salon picker from the root-staff cookie (e.g. on page reload),
// so a logged-in staff member doesn't have to re-enter credentials within the
// window. Parallel to /api/owner/me. Re-reads salons from the cookie's verified
// memberships (only ones still active).
export async function GET(req: NextRequest) {
  const token = req.cookies.get(ROOT_STAFF_COOKIE)?.value
  const session = token ? verifyRootStaffToken(token) : null
  if (!session) {
    return NextResponse.json({ salons: [] }, { status: 401 })
  }

  const salonIds = session.access.map((a) => a.salonId)
  const salons = await db.salon.findMany({
    where: { id: { in: salonIds } },
    select: { id: true, name: true, subdomain: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ salons })
}
