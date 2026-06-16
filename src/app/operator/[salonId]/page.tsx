import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireOperator } from '@/lib/operator-guard'
import { db } from '@/lib/db'
import { maskEmail, maskName } from '@/lib/operator-mask'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import OwnerContact from '@/components/operator/OwnerContact'
import StatusActions from '@/components/operator/StatusActions'

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
      stripeCustomerId: true,
    },
  })
  if (!salon) notFound()

  const since = daysAgoISO(30)
  const today = daysAgoISO(0)

  // Cross-tenant reads, scoped here to this one salonId by us, not by requireAuth.
  const [staffCount, clientCount, appts30d, ownerLink, auditRows] = await Promise.all([
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
  ])

  const stripeUrl = salon.stripeCustomerId
    ? `https://dashboard.stripe.com/customers/${salon.stripeCustomerId}`
    : null

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

      {/* Billing (stubbed) */}
      <Section title="Billing">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Plan</span>
              <Badge variant="outline" className="capitalize">
                {salon.plan}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Billing is managed in Stripe. This console does not change subscriptions.
            </p>
          </div>
          {stripeUrl ? (
            <a
              href={stripeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-foreground underline underline-offset-4 hover:no-underline"
            >
              Open in Stripe ↗
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">No Stripe customer</span>
          )}
        </div>
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
