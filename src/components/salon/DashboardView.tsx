'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CalendarDays,
  DollarSign,
  AlertCircle,
  Clock,
  Plus,
  Users,
  BarChart3,
  ArrowRight,
} from 'lucide-react'
import { format } from 'date-fns'
import { useSalonStore } from '@/lib/salon-store'

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

const statusColors: Record<string, string> = {
  booked: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  in_progress: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800',
  no_show: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  booked: 'Booked',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  no_show: 'No Show',
}

export default function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const { setActiveTab } = useSalonStore()

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!data) return <div className="text-muted-foreground">Failed to load dashboard data.</div>

  const today = format(new Date(), 'EEEE, MMMM d, yyyy')

  return (
    <div className="space-y-6">
      {/* Date header */}
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground flex items-center gap-2">
          <CalendarDays className="size-4" />
          {today}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Button
          variant="outline"
          className="h-auto py-3 px-4 justify-start gap-3 hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
          onClick={() => setActiveTab('appointments')}
        >
          <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-100 shrink-0">
            <Plus className="size-4 text-emerald-700" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">New Appointment</p>
            <p className="text-xs text-muted-foreground">Quick booking</p>
          </div>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 px-4 justify-start gap-3 hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
          onClick={() => setActiveTab('customers')}
        >
          <div className="flex items-center justify-center size-8 rounded-lg bg-teal-100 shrink-0">
            <Users className="size-4 text-teal-700" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">Add Customer</p>
            <p className="text-xs text-muted-foreground">New client</p>
          </div>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 px-4 justify-start gap-3 hover:bg-emerald-50 hover:border-emerald-300 transition-colors col-span-2 sm:col-span-1"
          onClick={() => setActiveTab('reports')}
        >
          <div className="flex items-center justify-center size-8 rounded-lg bg-green-100 shrink-0">
            <BarChart3 className="size-4 text-green-700" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">View Reports</p>
            <p className="text-xs text-muted-foreground">Analytics</p>
          </div>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="cursor-pointer hover:shadow-md transition-all hover:border-emerald-300"
          onClick={() => setActiveTab('appointments')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-100">
                <CalendarDays className="size-5 text-emerald-700" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Today&apos;s Appointments</p>
                <p className="text-2xl font-bold">{data.totalAppointmentsToday}</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-all hover:border-green-300"
          onClick={() => setActiveTab('reports')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-green-100">
                <DollarSign className="size-5 text-green-700" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Today&apos;s Revenue</p>
                <p className="text-2xl font-bold">{formatRWF(data.todayRevenue)}</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-all hover:border-amber-300"
          onClick={() => setActiveTab('appointments')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-amber-100">
                <AlertCircle className="size-5 text-amber-700" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Pending Payments</p>
                <p className="text-2xl font-bold">{data.pendingPayments}</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-all hover:border-red-300"
          onClick={() => setActiveTab('appointments')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-red-100">
                <Clock className="size-5 text-red-700" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Pending Amount</p>
                <p className="text-2xl font-bold">{formatRWF(data.pendingAmount)}</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.statusBreakdown).map(([status, count]) => (
                <Badge key={status} className={`${statusColors[status] || 'bg-gray-100 text-gray-800'} border-0 text-sm px-3 py-1`}>
                  {statusLabels[status] || status}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Staff Workload */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Staff Workload Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.staffWorkload
                .filter((s) => s.role === 'stylist')
                .map((s) => {
                  const totalHours = Math.floor((s.totalMinutes || s.appointmentCount * 45) / 60)
                  const totalMins = (s.totalMinutes || s.appointmentCount * 45) % 60
                  const maxMinutes = 480 // 8 hours
                  const percentage = Math.min(((s.totalMinutes || s.appointmentCount * 45) / maxMinutes) * 100, 100)
                  const barColor = percentage > 75 ? 'bg-amber-500' : percentage > 50 ? 'bg-emerald-500' : 'bg-teal-400'
                  return (
                    <div key={s.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{s.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {totalHours}h {totalMins}m ({s.appointmentCount} appts)
                        </span>
                      </div>
                      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              {data.staffWorkload.filter((s) => s.role === 'stylist').length === 0 && (
                <p className="text-sm text-muted-foreground">No staff data.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payments List */}
      {data.pendingPaymentsList && data.pendingPaymentsList.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Pending Payments</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-emerald-700"
                onClick={() => setActiveTab('appointments')}
              >
                View All <ArrowRight className="size-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.pendingPaymentsList.slice(0, 10).map((p) => {
                const remaining = p.appointment.service.price - p.amount
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{p.appointment.customer.name}</p>
                      <p className="text-xs text-muted-foreground">{p.appointment.service.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-700">{formatRWF(remaining)}</p>
                      <p className="text-xs text-muted-foreground">of {formatRWF(p.appointment.service.price)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Appointments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Today&apos;s Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {data.todayAppointments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No appointments today.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.todayAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-mono text-muted-foreground w-20">
                      {apt.startTime} - {apt.endTime}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{apt.customer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {apt.service.name} • {apt.staff.name}
                      </p>
                    </div>
                  </div>
                  <Badge className={`${statusColors[apt.status] || ''} border-0`}>
                    {statusLabels[apt.status] || apt.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
