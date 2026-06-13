import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'

// Self-service: any authenticated user marks their OWN tour as completed.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.error

  try {
    await db.user.update({
      where: { id: auth.user!.id, salonId: auth.user!.salonId },
      data: { tourCompleted: true },
    })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Tour-complete error:', error)
    return NextResponse.json({ error: 'Failed to update tour status' }, { status: 500 })
  }
}
