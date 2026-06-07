import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// Mock webhook handler for demo/testing (no real Stripe)
export async function POST(req: Request) {
  try {
    // For demo mode, check query param to simulate subscription events
    const url = new URL(req.url)
    const salonId = url.searchParams.get('salonId')
    const action = url.searchParams.get('action')

    if (salonId && action === 'activate') {
      await db.salon.update({
        where: { id: salonId },
        data: { plan: 'pro' }
      })
      return NextResponse.json({ received: true })
    }

    if (salonId && action === 'cancel') {
      await db.salon.update({
        where: { id: salonId },
        data: { plan: 'free', stripeSubscriptionId: null }
      })
      return NextResponse.json({ received: true })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handling failed' }, { status: 400 })
  }
}