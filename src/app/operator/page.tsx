import { requireOperator } from '@/lib/operator-guard'
import { db } from '@/lib/db'
import { maskEmail } from '@/lib/operator-mask'
import { Card, CardContent } from '@/components/ui/card'
import DirectoryList, { type DirectoryRow } from '@/components/operator/DirectoryList'

// Cross-tenant read — the one app intentionally allowed to query without a
// salonId filter. Gated by requireOperator(). Always dynamic (per-request auth).
export const dynamic = 'force-dynamic'

export default async function OperatorDirectoryPage() {
  await requireOperator()

  const salons = await db.salon.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      subdomain: true,
      plan: true,
      status: true,
      createdAt: true,
      // One owner email for the row. Masked below — raw PII never leaves the
      // server for the directory; reveal is a detail-page action only.
      owners: { select: { owner: { select: { email: true } } }, take: 1 },
    },
  })

  const rows: DirectoryRow[] = salons.map((s) => ({
    id: s.id,
    name: s.name,
    subdomain: s.subdomain,
    plan: s.plan,
    status: s.status,
    ownerEmailMasked: maskEmail(s.owners[0]?.owner.email) || '—',
  }))

  const total = rows.length
  const active = rows.filter((r) => r.status === 'ACTIVE').length
  const suspended = rows.filter((r) => r.status === 'SUSPENDED').length
  const pro = rows.filter((r) => r.plan === 'pro').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Tenants</h1>
        <p className="text-sm text-muted-foreground">
          {total} salon{total === 1 ? '' : 's'} on the platform
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="Total" value={total} />
        <Metric label="Active" value={active} />
        <Metric label="Suspended" value={suspended} />
        <Metric label="On pro" value={pro} />
      </div>

      <DirectoryList rows={rows} />
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
