'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export interface DirectoryRow {
  id: string
  name: string
  subdomain: string
  plan: string
  status: 'ACTIVE' | 'SUSPENDED'
  ownerEmailMasked: string
}

type StatusFilter = 'all' | 'ACTIVE' | 'SUSPENDED'

// Client-side search + status filter. At ~20 tenants the full (already-masked)
// list is handed over once and filtered in the browser — no query round-trips,
// no analytics engine (§7).
export default function DirectoryList({ rows }: { rows: DirectoryRow[] }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (status !== 'all' && r.status !== status) return false
      if (!needle) return true
      return r.name.toLowerCase().includes(needle) || r.subdomain.toLowerCase().includes(needle)
    })
  }, [rows, q, status])

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search name or subdomain…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex gap-1">
          {(['all', 'ACTIVE', 'SUSPENDED'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                status === s
                  ? 'border-border bg-muted text-foreground'
                  : 'border-transparent text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {s === 'all' ? 'All' : s === 'ACTIVE' ? 'Active' : 'Suspended'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Salon</th>
              <th className="px-4 py-2 font-medium">Owner</th>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/40">
                <td className="px-4 py-2">
                  <Link href={`/operator/${r.id}`} className="block">
                    <div className="font-medium text-foreground">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.subdomain}</div>
                  </Link>
                </td>
                <td className="px-4 py-2 text-muted-foreground">{r.ownerEmailMasked}</td>
                <td className="px-4 py-2">
                  <Badge variant="outline" className="capitalize">
                    {r.plan}
                  </Badge>
                </td>
                <td className="px-4 py-2">
                  {r.status === 'SUSPENDED' ? (
                    <Badge variant="destructive">Suspended</Badge>
                  ) : (
                    <Badge variant="outline">Active</Badge>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No salons match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
