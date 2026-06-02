'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CalendarDays,
  Banknote,
  AlertCircle,
  Clock,
  Plus,
  Users,
  BarChart3,
  ArrowRight,
  UserCheck,
  TrendingUp,
} from 'lucide-react'
import { format } from 'date-fns'
import { useSalonStore } from '@/lib/salon-store'
import { useAuth } from '@/lib/auth-context'

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

function formatRWF(amount: number) {
  return new Intl.NumberFormat('en-RW').format(amount) + ' RWF'
}

const statusConfig: Record<string, { label: string; bgClass: string; dotClass: string }> = {
  booked: { label: 'Booked', bgClass: 'bg-sky-50 text-sky-700 hover:bg-sky-50 dark:bg-sky-950 dark:text-sky-300 dark:hover:bg-sky-950', dotClass: 'bg-sky-500' },
  confirmed: { label: 'Confirmed', bgClass: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-950', dotClass: 'bg-emerald-500' },
  in_progress: { label: 'In Progress', bgClass: 'bg-amber-50 text-amber-700 hover:bg-amber-50 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-950', dotClass: 'bg-amber-500' },
  completed: { label: 'Completed', bgClass: 'bg-zinc-100 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800', dotClass: 'bg-zinc-400' },
  no_show: { label: 'No Show', bgClass: 'bg-red-50 text-red-700 hover:bg-red-50 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-950', dotClass: 'bg-red-500' },
}

export default function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { setActiveTab } = useSalonStore()
  const { user, permissions, authFetch } = useAuth()
  const isStylist = user?.role === 'stylist'
  const canManagePayments = permissions?.canManagePayments ?? false

  const fetchDashboard = useCallback(() => {
    setLoading(true)
    setError(null)
    authFetch('/api/dashboard')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch (${r.status})`)
        return r.json()
      })
      .then((d) => {
        setData(d)
        setError(null)
      })
      .catch((err) => {
        console.error('Dashboard fetch error:', err)
        setError(err.message || 'Failed to load dashboard data')
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [authFetch])

  useEffect(() => {
    let cancelled = false
    authFetch('/api/dashboard')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch (${r.status})`)
        return r.json()
      })
      .then((d) => {
        if (!cancelled) {
          setData(d)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Dashboard fetch error:', err)
          setError(err.message || 'Failed to load dashboard data')
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [authFetch])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!data) return (
    <div className="flex flex-col items-center justify-center py-16">
      <AlertCircle className="size-10 text-muted-foreground/30 mb-3" />
      <p className="text-muted-foreground text-sm mb-3">{error || 'Failed to load dashboard data.'}</p>
      <Button variant="outline" size="sm" onClick={fetchDashboard}>
        Retry
      </Button>
    </div>
  )

  const today = format(new Date(), 'EEEE, MMMM d, yyyy')

  return (
    <div className="space-y-6">
      {/* Date header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {isStylist ? 'My Dashboard' : 'Dashboard'}
          </h2>
          <CardDescription className="flex items-center gap-2 mt-1">
            <CalendarDays className="size-4" />
            {today}
          </CardDescription>
        </div>
      </div>

      {/* Quick Actions - only for admin and receptionist */}
      {!isStylist && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="h-auto py-3 px-4 justify-start gap-3 hover:bg-primary/5 hover:border-primary/20 transition-colors"
            onClick={() => setActiveTab('appointments')}
          >
            <div className="flex items-center justify-center size-8 sm:size-9 rounded-lg bg-primary/10 shrink-0">
              <Plus className="size-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-xs sm:text-sm font-semibold">New Appointment</p>
              <p className="text-xs text-muted-foreground">Quick booking</p>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-3 px-4 justify-start gap-3 hover:bg-primary/5 hover:border-primary/20 transition-colors"
            onClick={() => setActiveTab('customers')}
          >
            <div className="flex items-center justify-center size-8 sm:size-9 rounded-lg bg-primary/10 shrink-0">
              <Users className="size-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-xs sm:text-sm font-semibold">Add Customer</p>
              <p className="text-xs text-muted-foreground">New client</p>
            </div>
          </Button>
          {permissions && permissions.reports !== 'none' && (
            <Button
              variant="outline"
              className="h-auto py-3 px-4 justify-start gap-3 hover:bg-primary/5 hover:border-primary/20 transition-colors col-span-2 sm:col-span-1"
              onClick={() => setActiveTab('reports')}
            >
              <div className="flex items-center justify-center size-8 sm:size-9 rounded-lg bg-primary/10 shrink-0">
                <BarChart3 className="size-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-xs sm:text-sm font-semibold">View Reports</p>
                <p className="text-xs text-muted-foreground">Analytics</p>
              </div>
            </Button>
          )}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card
          className="cursor-pointer hover:shadow-md transition-all group"
          onClick={() => setActiveTab('appointments')}
        >
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 shrink-0 group-hover:bg-primary/15 transition-colors">
                <CalendarDays className="size-4 text-primary" />
              </div>
              <CardDescription className="text-[11px] sm:text-xs leading-tight">{isStylist ? 'My Appointments' : "Today's Appointments"}</CardDescription>
            </div>
            <span className="text-2xl sm:text-3xl font-bold tracking-tight">{data.totalAppointmentsToday}</span>
          </CardContent>
        </Card>

        {!isStylist && (
          <Card
            className="cursor-pointer hover:shadow-md transition-all group"
            onClick={() => setActiveTab('reports')}
          >
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-500/10 shrink-0 group-hover:bg-emerald-500/15 transition-colors">
                  <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <CardDescription className="text-[11px] sm:text-xs leading-tight">Today&apos;s Revenue</CardDescription>
              </div>
              <span className="text-base sm:text-xl font-bold tracking-tight">{formatRWF(data.todayRevenue)}</span>
            </CardContent>
          </Card>
        )}

        {canManagePayments && (
          <>
            <Card
              className="cursor-pointer hover:shadow-md transition-all group"
              onClick={() => setActiveTab('appointments')}
            >
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-amber-500/10 shrink-0 group-hover:bg-amber-500/15 transition-colors">
                    <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <CardDescription className="text-[11px] sm:text-xs leading-tight">Pending Payments</CardDescription>
                </div>
                <span className="text-2xl sm:text-3xl font-bold tracking-tight">{data.pendingPayments}</span>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-all group"
              onClick={() => setActiveTab('appointments')}
            >
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-red-500/10 shrink-0 group-hover:bg-red-500/15 transition-colors">
                    <Clock className="size-4 text-red-600 dark:text-red-400" />
                  </div>
                  <CardDescription className="text-[11px] sm:text-xs leading-tight">Outstanding</CardDescription>
                </div>
                <span className="text-base sm:text-xl font-bold tracking-tight">{formatRWF(data.pendingAmount)}</span>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Status Breakdown</CardTitle>
            <CardDescription>Appointment status distribution for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {Object.entries(data.statusBreakdown).map(([status, count]) => {
                const config = statusConfig[status]
                return (
                  <Badge
                    key={status}
                    variant="secondary"
                    className={`${config?.bgClass || 'bg-zinc-100 text-zinc-600'} border-0 text-xs sm:text-sm px-2.5 sm:px-3 py-1 sm:py-1.5 gap-1.5 font-medium`}
                  >
                    <span className={`size-1.5 sm:size-2 rounded-full ${config?.dotClass || 'bg-zinc-400'}`} />
                    {config?.label || status}: {count}
                  </Badge>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Staff Workload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">{isStylist ? 'My Workload' : 'Staff Workload Today'}</CardTitle>
            <CardDescription>Percentage of 8-hour workday allocated</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.staffWorkload
                .filter((s) => isStylist ? s.id === user?.staffId : s.role === 'stylist')
                .map((s) => {
                  const totalMinutes = s.totalMinutes || s.appointmentCount * 45
                  const totalHours = Math.floor(totalMinutes / 60)
                  const totalMins = totalMinutes % 60
                  const maxMinutes = 480 // 8 hours
                  const percentage = Math.min((totalMinutes / maxMinutes) * 100, 100)
                  return (
                    <div key={s.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center size-7 rounded-full bg-muted">
                            <UserCheck className="size-3.5 text-muted-foreground" />
                          </div>
                          <span className="text-sm font-medium">{s.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {totalHours}h {totalMins}m &middot; {s.appointmentCount} appt{s.appointmentCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress
                          value={percentage}
                          className={`h-2 flex-1 ${
                            percentage > 75
                              ? '[&>[data-slot=progress-indicator]]:bg-amber-500'
                              : percentage > 50
                              ? '[&>[data-slot=progress-indicator]]:bg-primary'
                              : '[&>[data-slot=progress-indicator]]:bg-muted-foreground/30'
                          }`}
                        />
                        <span className="text-xs font-medium text-muted-foreground w-10 text-right">
                          {Math.round(percentage)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              {data.staffWorkload.filter((s) => isStylist ? s.id === user?.staffId : s.role === 'stylist').length === 0 && (
                <p className="text-sm text-muted-foreground">No staff data available.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payments List - only for admin/receptionist */}
      {canManagePayments && data.pendingPaymentsList && data.pendingPaymentsList.length > 0 && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Pending Payments</CardTitle>
                  <CardDescription>Outstanding balances requiring attention</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-primary/80"
                  onClick={() => setActiveTab('appointments')}
                >
                  View All <ArrowRight className="size-3 ml-1" />
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
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.appointment.customer.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{p.appointment.service.name}</p>
                          {p.amount > 0 && (
                            <div className="mt-1.5">
                              <Progress value={paidPercent} className="h-1.5 [&>[data-slot=progress-indicator]]:bg-amber-400" />
                            </div>
                          )}
                        </div>
                        <div className="text-right ml-2 sm:ml-4 shrink-0">
                          <p className="text-sm font-semibold text-foreground">{formatRWF(remaining)}</p>
                          <p className="text-xs text-muted-foreground">of {formatRWF(p.appointment.service.price)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}

      {/* Today's Appointments */}
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">{isStylist ? 'My Appointments Today' : "Today's Appointments"}</CardTitle>
          <CardDescription>{data.todayAppointments.length} appointment{data.todayAppointments.length !== 1 ? 's' : ''} scheduled</CardDescription>
        </CardHeader>
        <CardContent>
          {data.todayAppointments.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDays className="size-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">No appointments today.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-2">
                {data.todayAppointments.map((apt) => {
                  const config = statusConfig[apt.status]
                  return (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="text-[11px] sm:text-sm font-mono text-muted-foreground w-20 sm:w-24 shrink-0">
                          {apt.startTime} - {apt.endTime}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{apt.customer.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {apt.service.name} &middot; {apt.staff.name}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`${config?.bgClass || ''} border-0 shrink-0 ml-2 text-xs`}
                      >
                        <span className={`size-1.5 rounded-full ${config?.dotClass || 'bg-zinc-400'}`} />
                        {config?.label || apt.status}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
