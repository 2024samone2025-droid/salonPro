'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import {
  CalendarDays,
  Banknote,
  UserCog,
  Users,
  Activity as ActivityIcon,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import EmptyState from '@/components/salon/EmptyState'
import { useAuth } from '@/lib/auth-context'
import { ROLE_LABELS, type UserRole } from '@/lib/permissions'

interface ActivityRow {
  id: string
  actorType: string
  actorName: string
  actorRole: string
  action: string
  targetType: string | null
  targetId: string | null
  summary: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

// Action prefix → icon. Kept muted (no accent) per the ≤10% accent rule — the feed
// is dense, so colored chips would read as noise.
function iconFor(action: string) {
  if (action.startsWith('appointment.')) return CalendarDays
  if (action.startsWith('payment.')) return Banknote
  if (action.startsWith('user.')) return UserCog
  if (action.startsWith('staff.')) return Users
  return ActivityIcon
}

function roleLabel(role: string): string {
  if (role === 'owner') return 'Owner'
  return ROLE_LABELS[role as UserRole] ?? role
}

// Group rows under a human day heading (Today / Yesterday / explicit date).
function dayHeading(iso: string): string {
  const d = new Date(iso)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEEE, MMM d, yyyy')
}

export default function ActivityView() {
  const { permissions, authFetch } = useAuth()
  const canView = permissions?.canViewActivityLog === true

  const [rows, setRows] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const isInitialMount = useRef(true)

  const fetchPage = useCallback(
    async (cursor: string | null) => {
      const params = new URLSearchParams()
      if (cursor) params.set('cursor', cursor)
      const res = await authFetch(`/api/activity?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load activity')
      return (await res.json()) as { items: ActivityRow[]; nextCursor: string | null }
    },
    [authFetch]
  )

  useEffect(() => {
    if (!canView) return
    let active = true
    ;(async () => {
      try {
        const data = await fetchPage(null)
        if (!active) return
        setRows(data.items)
        setNextCursor(data.nextCursor)
      } catch (err) {
        console.error(err)
        if (active) setError(true)
      } finally {
        if (active) {
          setLoading(false)
          isInitialMount.current = false
        }
      }
    })()
    return () => {
      active = false
    }
  }, [canView, fetchPage])

  const loadMore = async () => {
    if (!nextCursor) return
    setLoadingMore(true)
    try {
      const data = await fetchPage(nextCursor)
      setRows((prev) => [...prev, ...data.items])
      setNextCursor(data.nextCursor)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingMore(false)
    }
  }

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="flex items-center justify-center size-16 rounded-2xl bg-muted mb-4">
          <Lock className="size-8 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-semibold">Access Restricted</h3>
        <p className="text-sm mt-1">The activity log is available to admins only.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  // Group consecutive rows by day for headings.
  const groups: { heading: string; items: ActivityRow[] }[] = []
  for (const row of rows) {
    const heading = dayHeading(row.createdAt)
    const last = groups[groups.length - 1]
    if (last && last.heading === heading) last.items.push(row)
    else groups.push({ heading, items: [row] })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Activity</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Who did what, and when — across your salon.
        </p>
      </div>

      {error && rows.length === 0 ? (
        <EmptyState icon={ActivityIcon} message="Couldn't load activity. Try refreshing." />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ActivityIcon}
          message="No activity yet. Actions like bookings, payments, and team changes will show up here."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.heading} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
                {group.heading}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((row) => {
                  const Icon = iconFor(row.action)
                  return (
                    <div
                      key={row.id}
                      className="flex items-start gap-3 rounded-lg border bg-card p-3"
                    >
                      <div className="flex items-center justify-center size-9 rounded-lg bg-muted shrink-0">
                        <Icon className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground">{row.summary}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {row.actorName} · {roleLabel(row.actorRole)}
                        </p>
                      </div>
                      <time
                        className="text-xs text-muted-foreground shrink-0 whitespace-nowrap"
                        dateTime={row.createdAt}
                        title={format(new Date(row.createdAt), 'PPpp')}
                      >
                        {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
                      </time>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {nextCursor && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
