import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

/**
 * The salon's OWN billing summary — current plan, status, paid-through date, any
 * pending downgrade, recent payments, and the out-of-band pay instructions. Read
 * only: this surface informs the owner, it never upgrades (self-upgrade stays
 * disabled in /api/billing/checkout).
 *
 * Strictly scoped to the authenticated salon (auth.salonId) — we never read a
 * salonId from the request, so one tenant can't see another's billing.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.error

  const salonId = auth.salonId

  const [subscription, payments, proPlan] = await Promise.all([
    db.subscription.findUnique({
      where: { salonId },
      include: { plan: true, pendingPlan: true },
    }),
    db.billingPayment.findMany({
      where: { salonId },
      orderBy: { paidAt: 'desc' },
      take: 10,
      select: { id: true, amount: true, currency: true, method: true, paidAt: true, kind: true },
    }),
    db.plan.findUnique({ where: { id: 'pro' }, select: { price: true, currency: true } }),
  ])

  return NextResponse.json({
    plan: subscription
      ? {
          id: subscription.plan.id,
          name: subscription.plan.name,
          price: subscription.plan.price,
          currency: subscription.plan.currency,
          interval: subscription.plan.interval,
        }
      : null,
    status: subscription?.status ?? null,
    periodEnd: subscription?.periodEnd?.toISOString() ?? null,
    pendingPlan: subscription?.pendingPlan
      ? { id: subscription.pendingPlan.id, name: subscription.pendingPlan.name }
      : null,
    payments: payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      method: p.method,
      paidAt: p.paidAt.toISOString(),
      kind: p.kind,
    })),
    // One SalonPro collection set for every tenant — server-side env, never bundled.
    payInstructions: {
      momo: process.env.BILLING_MOMO_NUMBER ?? null,
      airtel: process.env.BILLING_AIRTEL_NUMBER ?? null,
      whatsapp: process.env.BILLING_CONTACT_WHATSAPP ?? null,
      amount: proPlan?.price ?? 15000,
      currency: proPlan?.currency ?? 'RWF',
    },
  })
}
