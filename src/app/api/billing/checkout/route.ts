import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)

    const salon = await db.salon.findUnique({
      where: { id: user.salonId }
    })

    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 })
    }

    if (salon.plan === 'pro') {
      return NextResponse.json({ error: 'Already subscribed to Pro plan' }, { status: 400 })
    }

    // Simulate successful upgrade for demo/testing
    await db.salon.update({
      where: { id: salon.id },
      data: { plan: 'pro' }
    })

    // Return mock success - redirects to billing page
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.json({ url: `${appUrl}/billing?success=1` })
  } catch (error) {
    console.error('Upgrade error:', error)
    return NextResponse.json({ error: 'Failed to upgrade plan' }, { status: 500 })
  }
}