'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import StatCard from '@/components/salon/StatCard'
import StatusBadge from '@/components/salon/StatusBadge'
import EmptyState from '@/components/salon/EmptyState'
import ErrorState from '@/components/salon/ErrorState'
import {
  CalendarDays,
  Banknote,
  Clock,
  Plus,
  UserPlus,
  BarChart3,
  ArrowRight,
  ChartPie,
  Users,
} from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useAuth, useMoney } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import { STATUS_CONFIG, type AppointmentStatus } from '@/lib/constants'

interface DashboardData {
  todayAppointments: Array<{
    id: string
    date: string
    startTime: string
    endTime: string
    status: string
    customer: { name: string }
    staff: { name: string }
    service: { name: string; price: number; duration: number }
    payment?: { status: string; amount: number } | null
  }>
  todayRevenue: number
  pendingPayments: number
  pendingAmount: number
  pendingPaymentsList: Array<{
    id: string
    amount: number
    appointment: {
      customer: { name: string }
      service: { name: string; price: number }
    }
  }>
  statusBreakdown: Record<string, number>
  staffWorkload: Array<{
    id: string
    name: string
    role: string
    appointmentCount: number
    totalMinutes: number
  }>
  totalAppointmentsToday: number
}

export default function DashboardView() {
  const formatRWF = useMoney()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { user, permissions, authFetch } = useAuth()
  const isStylist = user?.role === 'stylist'
  const canManagePayments = permissions?.canManagePayments ?? false
  const isInitialMount = useRef(true)

  const fetchDashboard = useCallback((showLoading = true) => {
    if (showLoading && !isInitialMount.current) setLoading(true)
    isInitialMount.current = false
    setError(null)

    const controller = new AbortController()
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 10_000)

    authFetch('/api/dashboard', { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('request-failed')
        return r.json()
      })
      .then((d) => {
        clearTimeout(timer)
        setData(d)
        setLoading(false)
        setError(null)
      })
      .catch((err) => {
        clearTimeout(timer)
        // A bare abort (navigation / unmount) is expected — stay quiet.
        if (err.name === 'AbortError' && !timedOut) return
        console.error('Dashboard fetch error:', err)
        setError(
          timedOut
            ? "This is taking longer than usual. Check your connection and try again."
            : "We couldn't load your dashboard. Please try again."
        )
        setData(null)
        setLoading(false)
      })

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [authFetch])

  useEffect(() => {
    const cleanup = fetchDashboard(true)
    return () => {
      if (typeof cleanup === 'function') cleanup()
    }
  }, [fetchDashboard])

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-4 w-60" />
          </div>
          <Skeleton className="h-9 w-72 hidden sm:block" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    )
  }

  if (!data) return (
    <ErrorState
      message={error || "We couldn't load your dashboard. Please try again."}
      onRetry={() => fetchDashboard()}
    />
  )

  const today = format(new Date(), 'EEEE, MMMM d, yyyy')

  const breakdownSummary = Object.entries(data.statusBreakdown)
    .filter(([, count]) => count > 0)
    .slice(0, 3)
    .map(([status, count]) => {
      const label = STATUS_CONFIG[status as AppointmentStatus]?.label || status
      return `${count} ${label.toLowerCase()}`
    })
    .join(' · ')

  const workload = data.staffWorkload.filter((s) =>
    isStylist ? s.id === user?.staffId : s.role === 'stylist'
  )
  const hasBreakdown = Object.values(data.statusBreakdown).some((c) => c > 0)

  return (
    <div className="space-y-5">
      {/* Header: title + date left, actions right */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-medium tracking-tight">
            {isStylist ? 'My dashboard' : 'Dashboard'}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {today}
          </p>
        </div>
        {!isStylist && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => router.push('/appointments')}>
              <Plus className="size-3.5" />
              New appointment
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push('/customers')}>
              <UserPlus className="size-3.5" />
              Add customer
            </Button>
            {permissions && permissions.reports !== 'none' && (
              <Button variant="ghost" size="sm" onClick={() => router.push('/reports')}>
                <BarChart3 className="size-3.5" />
                Reports
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          icon={CalendarDays}
          label={isStylist ? 'My appointments' : 'Appointments'}
          value={data.totalAppointmentsToday}
          context={breakdownSummary || 'Nothing scheduled yet'}
          tone="accent"
          onClick={() => router.push('/appointments')}
        />
        {!isStylist && (
          <StatCard
            icon={Banknote}
            label="Revenue today"
            value={formatRWF(data.todayRevenue)}
            tone="success"
            onClick={() => router.push('/reports')}
          />
        )}
        {canManagePayments && (
          <StatCard
            icon={Clock}
            label="Outstanding"
            value={formatRWF(data.pendingAmount)}
            context={`${data.pendingPayments} pending payment${data.pendingPayments !== 1 ? 's' : ''}`}
            tone="warning"
            onClick={() => router.push('/appointments')}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-3">
        {/* Today's schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] font-medium">
              {isStylist ? 'My schedule today' : "Today's schedule"}
            </CardTitle>
            <CardDescription className="text-xs">
              {data.todayAppointments.length} appointment{data.todayAppointments.length !== 1 ? 's' : ''} scheduled
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.todayAppointments.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                message="No appointments today"
                actionLabel="+ Book one now"
                onAction={() => router.push('/appointments')}
                className="border-0 bg-transparent p-4"
              />
            ) : (
              <ScrollArea className="max-h-96">
                <div>
                  {data.todayAppointments.map((apt, i) => (
                    <div
                      key={apt.id}
                      className={cn(
                        'flex items-center gap-2.5 py-2.5',
                        i < data.todayAppointments.length - 1 &&
                          'border-b-hairline border-border/80'
                      )}
                    >
                      <span className="min-w-[88px] text-xs text-muted-foreground tabular-nums">
                        {apt.startTime} – {apt.endTime}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-foreground">{apt.customer.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {apt.service.name} · {apt.staff.name}
                        </p>
                      </div>
                      <StatusBadge status={apt.status} className="shrink-0" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Right column: workload + status breakdown */}
        <div className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-[15px] font-medium">
                {isStylist ? 'My workload' : 'Staff workload'}
              </CardTitle>
              <CardDescription className="text-xs">Share of an 8-hour day booked</CardDescription>
            </CardHeader>
            <CardContent>
              {workload.length === 0 ? (
                <EmptyState
                  icon={Users}
                  message="No staff data yet"
                  className="border-0 bg-transparent p-4"
                />
              ) : (
                <div className="space-y-3">
                  {workload.map((s) => {
                    const totalMinutes = s.totalMinutes || s.appointmentCount * 45
                    const totalHours = Math.floor(totalMinutes / 60)
                    const totalMins = totalMinutes % 60
                    const percentage = Math.min((totalMinutes / 480) * 100, 100)
                    return (
                      <div key={s.id}>
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-[13px] text-foreground">{s.name}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {totalHours > 0 ? `${totalHours}h` : ''}{totalMins > 0 ? ` ${totalMins}m` : totalHours === 0 ? '0m' : ''} · {Math.round(percentage)}%
                          </span>
                        </div>
                        <Progress value={percentage} className="h-1.5" />
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[15px] font-medium">Status breakdown</CardTitle>
              <CardDescription className="text-xs">Today&apos;s appointments by status</CardDescription>
            </CardHeader>
            <CardContent>
              {!hasBreakdown ? (
                <EmptyState
                  icon={ChartPie}
                  message="No status data yet"
                  actionLabel="+ Book first appointment"
                  onAction={() => router.push('/appointments')}
                  className="border-0 bg-transparent p-4"
                />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(data.statusBreakdown)
                    .filter(([, count]) => count > 0)
                    .map(([status, count]) => {
                      const config = STATUS_CONFIG[status as AppointmentStatus]
                      return (
                        <span
                          key={status}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs',
                            config?.badgeClass ?? 'bg-muted text-muted-foreground'
                          )}
                        >
                          {config?.label || status}
                          <span className="font-medium tabular-nums">{count}</span>
                        </span>
                      )
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pending payments — admin/receptionist only */}
      {canManagePayments && data.pendingPaymentsList && data.pendingPaymentsList.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[15px] font-medium">Pending payments</CardTitle>
                <CardDescription className="text-xs">Outstanding balances</CardDescription>
              </div>
              <Button
                variant="plain"
                size="sm"
                className="text-accent hover:text-accent/80"
                onClick={() => router.push('/appointments')}
              >
                View all <ArrowRight className="size-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-72">
              <div className="space-y-2">
                {data.pendingPaymentsList.slice(0, 10).map((p) => {
                  const remaining = p.appointment.service.price - p.amount
                  const paidPercent = p.appointment.service.price > 0
                    ? (p.amount / p.appointment.service.price) * 100
                    : 0
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-sm border-hairline border-border bg-surface p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-[13px] text-foreground">{p.appointment.customer.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.appointment.service.name}</p>
                        {p.amount > 0 && (
                          <div className="mt-1.5 max-w-44">
                            <Progress value={paidPercent} className="h-1" />
                          </div>
                        )}
                      </div>
                      <div className="ml-3 shrink-0 text-right">
                        <p className="text-[13px] font-medium text-foreground tabular-nums">{formatRWF(remaining)}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">of {formatRWF(p.appointment.service.price)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
