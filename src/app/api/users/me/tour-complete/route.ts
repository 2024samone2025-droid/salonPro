import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'

// Self-service: any authenticated user marks their OWN tour as completed.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.error

  // Owners have no User row (and no first-run tour) — nothing to mark.
  if (auth.user!.kind === 'owner') {
    return new NextResponse(null, { status: 204 })
  }

  try {
    await db.user.update({
      // salonId comes from the resolved host (auth.salonId), not the token.
      where: { id: auth.user!.id, salonId: auth.salonId },
      data: { tourCompleted: true },
    })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Tour-complete error:', error)
    return NextResponse.json({ error: 'Failed to update tour status' }, { status: 500 })
  }
}
