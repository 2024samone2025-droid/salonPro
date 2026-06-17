import { NextResponse } from 'next/server'
import { applyPlanChange, recordPayment, setStatus } from '@/lib/billing'

// Mock webhook handler for demo/testing (no real Stripe). Same shape as before —
// driven by ?salonId=&action= query params — but now routed through the shared
// billing seam so a real subscription row is created/updated. A real gateway
// later calls the SAME seam functions; only the parsing/verification above them
// changes. No Stripe signature logic here (deliberately out of scope).
export async function POST(req: Request) {
  try {
    const url = new URL(req.url)
    const salonId = url.searchParams.get('salonId')
    const action = url.searchParams.get('action')

    if (salonId && action === 'activate') {
      // Move to pro (creates/updates the Subscription, syncs Salon.plan)...
      await applyPlanChange(salonId, 'pro')
      // ...and log the payment. Mock payment details come from the query, with
      // a STABLE default reference so recordPayment's idempotency guard
      // (@@unique([salonId, reference])) no-ops a re-fired webhook.
      await recordPayment(salonId, {
        amount: Number(url.searchParams.get('amount')) || 15000, // mirrors the pro plan price
        method: url.searchParams.get('method') || 'manual',
        reference: url.searchParams.get('reference') || `mock-${salonId}-activate`,
      })
      return NextResponse.json({ received: true })
    }

    if (salonId && action === 'cancel') {
      // Status drives access via the entitlements layer; CANCELED => no access.
      // Plan string is left as-is (the cache); we don't delete anything.
      await setStatus(salonId, 'CANCELED')
      return NextResponse.json({ received: true })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handling failed' }, { status: 400 })
  }
}
