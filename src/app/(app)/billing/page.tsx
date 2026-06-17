'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { formatMoney } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from 'lucide-react'

interface Summary {
  plan: { id: string; name: string; price: number; currency: string; interval: string } | null
  status: string | null
  periodEnd: string | null
  pendingPlan: { id: string; name: string } | null
  payments: {
    id: string
    amount: number
    currency: string
    method: string
    paidAt: string
    kind: 'PAYMENT' | 'REVERSAL'
  }[]
  payInstructions: {
    momo: string | null
    airtel: string | null
    whatsapp: string | null
    amount: number
    currency: string
  }
}

const PRO_FEATURES = [
  'Unlimited customers',
  'Unlimited staff members',
  'Advanced reports',
  'All payment methods (MTN MoMo & Airtel Money)',
  'Priority support',
]

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString()
}

export default function BillingPage() {
  const { salon, authFetch } = useAuth()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    authFetch('/api/billing/summary')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((d: Summary) => active && setSummary(d))
      .catch(() => active && setFailed(true))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [authFetch])

  const isPro = summary?.plan?.id === 'pro'
  const interval = summary?.plan?.interval === 'annual' ? 'year' : 'month'
  const price = summary?.payInstructions.amount ?? 15000
  const inst = summary?.payInstructions

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-semibold">{salon?.name} Billing</h1>
        <p className="text-muted-foreground">Manage your subscription</p>
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground">Loading…</p>
      ) : failed || !summary ? (
        <p className="text-center text-sm text-muted-foreground">
          Couldn’t load your billing details. Please try again.
        </p>
      ) : (
        <div className="space-y-6">
          <Card className={isPro ? 'border-primary' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Pro Plan
                {isPro && <Badge>Active</Badge>}
              </CardTitle>
              <CardDescription>For growing salons that need more</CardDescription>
              <p className="text-2xl font-bold tabular-nums">
                {formatMoney(price, inst?.currency ?? 'RWF')}
                <span className="text-sm font-normal text-muted-foreground">/{interval}</span>
              </p>
            </CardHeader>
            <CardContent>
              <ul className="mb-4 space-y-2">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 text-muted-foreground" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {isPro ? (
                <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                  {summary.periodEnd ? (
                    <p>
                      Active until <span className="font-medium">{fmtDate(summary.periodEnd)}</span>.
                    </p>
                  ) : (
                    <p>Your Pro plan is active.</p>
                  )}
                  {summary.pendingPlan && summary.periodEnd && (
                    <p className="mt-1 text-muted-foreground">
                      Without a renewal, your salon moves to {summary.pendingPlan.name} on{' '}
                      {fmtDate(summary.periodEnd)}
                      {inst?.whatsapp ? ` — message us on ${inst.whatsapp} to renew.` : '.'}
                    </p>
                  )}
                </div>
              ) : (
                <UpgradeInstructions salonName={salon?.name} inst={inst} price={price} />
              )}
            </CardContent>
          </Card>

          {summary.payments.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">Payment history</h2>
              <ul className="divide-y divide-border rounded-md border border-border">
                {summary.payments.map((p) => {
                  const isReversal = p.kind === 'REVERSAL'
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-4 px-3 py-2 text-sm"
                    >
                      <div>
                        <span
                          className={
                            isReversal
                              ? 'font-medium tabular-nums text-muted-foreground'
                              : 'font-medium tabular-nums'
                          }
                        >
                          {formatMoney(p.amount, p.currency)}
                        </span>
                        <span className="text-muted-foreground"> · {p.method}</span>
                        {isReversal && (
                          <Badge variant="outline" className="ml-2 align-middle">
                            Reversed
                          </Badge>
                        )}
                      </div>
                      <time className="text-xs text-muted-foreground" dateTime={p.paidAt}>
                        {fmtDate(p.paidAt)}
                      </time>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// The out-of-band pay instructions — turns the old dead "contact us" button into a
// clear "here's exactly what to send, and how to tell us" path. Degrades gracefully
// if the SalonPro collection numbers aren't configured.
function UpgradeInstructions({
  salonName,
  inst,
  price,
}: {
  salonName?: string
  inst?: Summary['payInstructions']
  price: number
}) {
  const hasNumbers = inst && (inst.momo || inst.airtel)
  const amount = formatMoney(price, inst?.currency ?? 'RWF')

  if (!hasNumbers) {
    return (
      <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        Upgrades are handled by SalonPro — contact us to move to Pro.
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
      <p className="mb-2 font-medium">To upgrade to Pro</p>
      <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
        <li>
          Send <span className="font-medium text-foreground">{amount}</span> to
          {inst?.momo && (
            <>
              {' '}
              MTN MoMo <span className="font-medium text-foreground">{inst.momo}</span>
            </>
          )}
          {inst?.momo && inst?.airtel && ' or'}
          {inst?.airtel && (
            <>
              {' '}
              Airtel Money <span className="font-medium text-foreground">{inst.airtel}</span>
            </>
          )}
          .
        </li>
        <li>
          Use your salon name
          {salonName ? (
            <>
              {' '}
              (<span className="font-medium text-foreground">{salonName}</span>)
            </>
          ) : null}{' '}
          as the payment reference.
        </li>
        {inst?.whatsapp && (
          <li>
            Send your transaction ID to us on WhatsApp{' '}
            <span className="font-medium text-foreground">{inst.whatsapp}</span>.
          </li>
        )}
      </ol>
      <p className="mt-2 text-xs text-muted-foreground">
        We’ll activate Pro as soon as we confirm your payment.
      </p>
    </div>
  )
}
