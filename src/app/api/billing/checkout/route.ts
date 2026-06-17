import { requireAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'

// Self-serve upgrade is DISABLED. Billing is managed manually by SalonPro
// operators (record a payment in the operator console), so a tenant can no
// longer flip itself to pro. Kept as an authenticated 403 with a clear message
// rather than deleted, so the existing client gets a sensible response. When
// automated billing arrives at scale this becomes the real checkout session.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.error

  return NextResponse.json(
    { error: 'Upgrades are handled by SalonPro. Contact us to upgrade to Pro.' },
    { status: 403 },
  )
}
