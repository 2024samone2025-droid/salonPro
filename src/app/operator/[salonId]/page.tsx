import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireOperator } from '@/lib/operator-guard'
import { db } from '@/lib/db'
import { maskEmail, maskName } from '@/lib/operator-mask'
import { formatMoney } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import OwnerContact from '@/components/operator/OwnerContact'
import StatusActions from '@/components/operator/StatusActions'
import BillingActions from '@/components/operator/BillingActions'
import PaymentHistory from '@/components/operator/PaymentHistory'

export const dynamic = 'force-dynamic'

function daysAgoISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

export default async function OperatorTenantDetailPage({
  params,
}: {
  params: Promise<{ salonId: string }>
}) {
  await requireOperator()
  const { salonId } = await params

  const salon = await db.salon.findUnique({
    where: { id: salonId },
    select: {
      id: true,
      name: true,
      subdomain: true,
      plan: true,
      status: true,
      createdAt: true,
    },
  })
  if (!salon) notFound()

  const since = daysAgoISO(30)
  const today = daysAgoISO(0)

  // Cross-tenant reads, scoped here to this one salonId by us, not by requireAuth.
  const [staffCount, clientCount, appts30d, ownerLink, auditRows, subscription, payments, proPlan] =
    await Promise.all([
      db.staff.count({ where: { salonId } }),
      db.customer.count({ where: { salonId } }),
      db.appointment.count({ where: { salonId, date: { gte: since, lte: today } } }),
      db.ownerSalon.findFirst({
        where: { salonId },
        orderBy: { createdAt: 'asc' },
        select: { owner: { select: { name: true, email: true } } },
      }),
      db.operatorAuditLog.findMany({
        where: { targetSalonId: salonId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      db.subscription.findUnique({
        where: { salonId },
        include: { plan: true, pendingPlan: true },
      }),
      db.billingPayment.findMany({
        where: { salonId },
        orderBy: { paidAt: 'desc' },
        take: 20, // payment + its reversal are two rows
      }),
      db.plan.findUnique({ where: { id: 'pro' }, select: { price: true } }),
    ])

  const expectedAmount = proPlan?.price ?? 15000

  return (
    <div className="space-y-6">
      <Link href="/operator" className="text-sm text-muted-foreground hover:text-foreground">
        ← All tenants
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{salon.name}</h1>
            {salon.status === 'SUSPENDED' ? (
              <Badge variant="destructive">Suspended</Badge>
            ) : (
              <Badge variant="outline">Active</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {salon.subdomain} · created {salon.createdAt.toLocaleDateString()}
          </p>
        </div>
        <StatusActions salonId={salon.id} status={salon.status} />
      </div>

      {/* Counts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Metric label="Staff" value={staffCount} />
        <Metric label="Clients" value={clientCount} />
        <Metric label="Appointments (30d)" value={appts30d} />
      </div>

      {/* Owner & contact */}
      <Section title="Owner & contact">
        <OwnerContact
          salonId={salon.id}
          hasOwner={Boolean(ownerLink)}
          nameMasked={maskName(ownerLink?.owner.name)}
          emailMasked={maskEmail(ownerLink?.owner.email)}
        />
      </Section>

      {/* Billing — managed manually by the operator */}
      <Section title="Billing">
        {subscription ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Plan">
                <span className="font-medium">{subscription.plan.name}</span>
                {subscription.plan.price > 0 && (
                  <span className="text-muted-foreground">
                    {' '}· {formatMoney(subscription.plan.price, subscription.plan.currency)}/
                    {subscription.plan.interval === 'annual' ? 'yr' : 'mo'}
                  </span>
                )}
              </Field>
              <Field label="Status">
                <SubStatusBadge status={subscription.status} />
              </Field>
              <Field label="Period">
                {subscription.periodEnd ? (
                  <span>
                    until{' '}
                    <span className="font-medium">
                      {subscription.periodEnd.toLocaleDateString()}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">No expiry</span>
                )}
              </Field>
            </div>

            {subscription.pendingPlan && subscription.periodEnd && (
              <p className="text-xs text-muted-foreground">
                Auto-downgrades to{' '}
                <span className="font-medium">{subscription.pendingPlan.name}</span> on{' '}
                {subscription.periodEnd.toLocaleDateString()} unless renewed.
              </p>
            )}

            <BillingActions
              salonId={salon.id}
              currentPlan={subscription.plan.id}
              currentStatus={subscription.status}
              expectedAmount={expectedAmount}
            />

            {/* Payment history (append-only ledger; rows can be reversed, not deleted) */}
            <div>
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">Recent payments</h3>
              <PaymentHistory
                salonId={salon.id}
                payments={payments.map((p) => ({
                  id: p.id,
                  amount: p.amount,
                  currency: p.currency,
                  method: p.method,
                  reference: p.reference,
                  paidAt: p.paidAt.toISOString(),
                  kind: p.kind,
                  reversesId: p.reversesId,
                  voidReason: p.voidReason,
                }))}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No subscription on record for this salon.
          </p>
        )}
      </Section>

      {/* Recent operator actions */}
      <Section title="Recent operator actions">
        {auditRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No operator actions recorded for this salon yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {auditRows.map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-4 py-2 text-sm">
                <div className="min-w-0">
                  <span className="font-medium">{row.action}</span>
                  {row.reason && <span className="text-muted-foreground"> — {row.reason}</span>}
                  <div className="text-xs text-muted-foreground">{row.operatorEmail}</div>
                </div>
                <time className="shrink-0 text-xs text-muted-foreground" dateTime={row.createdAt.toISOString()}>
                  {row.createdAt.toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  )
}

function SubStatusBadge({ status }: { status: string }) {
  // CANCELED reads as a problem; everything else is neutral (billing never gates
  // access here — Salon.status does — so no green/red access signalling).
  const variant = status === 'CANCELED' ? 'destructive' : 'outline'
  return <Badge variant={variant}>{status}</Badge>
}
