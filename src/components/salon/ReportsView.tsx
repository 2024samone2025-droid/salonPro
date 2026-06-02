'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { format, subMonths, subWeeks } from 'date-fns'
import { DollarSign, TrendingUp, Users, Scissors, AlertCircle, CheckCircle2, Lock } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

function formatRWF(amount: number) {
  return new Intl.NumberFormat('en-RW').format(amount) + ' RWF'
}

const statusLabels: Record<string, string> = {
  booked: 'Booked',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  no_show: 'No Show',
}

const statusColors: Record<string, string> = {
  booked: '#3b82f6',
  confirmed: '#10b981',
  in_progress: '#f59e0b',
  completed: '#22c55e',
  no_show: '#ef4444',
}

const methodLabels: Record<string, string> = {
  cash: 'Cash',
  mtn_momo: 'MTN MoMo',
  airtel_money: 'Airtel Money',
}

const pieColors = ['#10b981', '#059669', '#0d9488']

interface ReportData {
  revenueChart: Array<{ date: string; revenue: number }>
  topServices: Array<{ name: string; count: number; revenue: number }>
  topCustomers: Array<{ name: string; visits: number; spent: number }>
  paymentMethods: Record<string, number>
  statusBreakdown: Record<string, number>
  totalAppointments: number
  totalRevenue: number
  totalCollected: number
  totalOutstanding: number
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const width = 60
  const height = 24
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  const isPositive = data[data.length - 1] >= data[0]
  const color = isPositive ? '#10b981' : '#ef4444'

  return (
    <svg width={width} height={height} className="inline-block ml-2">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function ReportsView() {
  const { permissions, authFetch } = useAuth()
  const canView = permissions?.reports !== 'none'

  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('daily')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState(format(new Date(), 'yyyy-MM-dd'))

  // Compute date range from period
  const { from, to } = useMemo(() => {
    const now = new Date()
    const toDate = format(now, 'yyyy-MM-dd')
    let fromDate: string
    switch (period) {
      case 'weekly':
        fromDate = format(subWeeks(now, 1), 'yyyy-MM-dd')
        break
      case 'monthly':
        fromDate = format(subMonths(now, 1), 'yyyy-MM-dd')
        break
      default:
        fromDate = toDate
    }
    // Use custom dates if they've been set
    if (customFrom) {
      return { from: customFrom, to: customTo || toDate }
    }
    return { from: fromDate, to: toDate }
  }, [period, customFrom, customTo])

  const fetchReports = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (from && to) {
      params.set('from', from)
      params.set('to', to)
    } else {
      params.set('period', period)
    }
    try {
      const res = await authFetch(`/api/reports?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const d = await res.json()
      setData(d)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [from, to, period])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod)
    setCustomFrom('')
  }

  // Calculate trend - must be before early returns
  const trendPercent = useMemo(() => {
    if (!data || data.revenueChart.length < 2) return null
    const recent = data.revenueChart.slice(-3)
    const older = data.revenueChart.slice(-6, -3)
    if (older.length === 0 || recent.length === 0) return null
    const recentAvg = recent.reduce((s, d) => s + d.revenue, 0) / recent.length
    const olderAvg = older.reduce((s, d) => s + d.revenue, 0) / older.length
    if (olderAvg === 0) return null
    return ((recentAvg - olderAvg) / olderAvg) * 100
  }, [data])

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Lock className="size-12 mb-4 opacity-30" />
        <h3 className="text-lg font-semibold">Access Restricted</h3>
        <p className="text-sm mt-1">Reports are available for Admin and Receptionist roles only.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!data) return <div className="text-muted-foreground">Failed to load reports.</div>

  const paymentPieData = Object.entries(data.paymentMethods).map(([method, amount]) => ({
    name: methodLabels[method] || method,
    value: amount,
  }))

  const statusPieData = Object.entries(data.statusBreakdown).map(([status, count]) => ({
    name: statusLabels[status] || status,
    value: count,
    color: statusColors[status] || '#8884d8',
  }))

  // Sparkline data: last 7 data points
  const sparklineData = data.revenueChart.slice(-7).map((d) => d.revenue)


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reports</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs font-normal">
              {format(new Date(from), 'MMM d, yyyy')} — {format(new Date(to), 'MMM d, yyyy')}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={customFrom || from}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="w-36"
          />
          <Input
            type="date"
            value={customTo || to}
            onChange={(e) => setCustomTo(e.target.value)}
            className="w-36"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="sm:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-100">
                <DollarSign className="size-5 text-emerald-700" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <div className="flex items-center">
                  <p className="text-lg font-bold">{formatRWF(data.totalRevenue)}</p>
                  <Sparkline data={sparklineData} />
                </div>
                {trendPercent !== null && (
                  <p className={`text-xs ${trendPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {trendPercent >= 0 ? '↑' : '↓'} {Math.abs(trendPercent).toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-green-100">
                <CheckCircle2 className="size-5 text-green-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Collected</p>
                <p className="text-lg font-bold text-green-700">{formatRWF(data.totalCollected)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-amber-100">
                <AlertCircle className="size-5 text-amber-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-lg font-bold text-amber-700">{formatRWF(data.totalOutstanding)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-teal-100">
                <TrendingUp className="size-5 text-teal-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Appointments</p>
                <p className="text-lg font-bold">{data.totalAppointments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-100">
                <Scissors className="size-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Services</p>
                <p className="text-lg font-bold">{data.topServices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {data.revenueChart.length === 0 || data.revenueChart.every((d) => d.revenue === 0) ? (
            <div className="text-center py-12">
              <DollarSign className="size-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">No revenue data for this period.</p>
              <p className="text-xs text-muted-foreground mt-1">Try selecting a wider date range.</p>
            </div>
          ) : (
            <div className="w-full h-[280px] sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.revenueChart} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val: string) => {
                      try {
                        return format(new Date(val), 'MMM d')
                      } catch {
                        return val
                      }
                    }}
                    interval={Math.max(0, Math.floor(data.revenueChart.length / 8))}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val: number) => `${(val / 1000).toFixed(0)}k`}
                    width={45}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatRWF(value), 'Revenue']}
                    labelFormatter={(label: string) => {
                      try {
                        return format(new Date(label), 'MMM d, yyyy')
                      } catch {
                        return label
                      }
                    }}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Services */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Top Services</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topServices.length === 0 ? (
              <p className="text-muted-foreground text-sm">No service data.</p>
            ) : (
              <div className="space-y-3">
                {data.topServices.slice(0, 8).map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-md border">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted-foreground w-6">
                        #{i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.count} bookings</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-emerald-700">{formatRWF(s.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Top Customers</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topCustomers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No customer data.</p>
            ) : (
              <div className="space-y-3">
                {data.topCustomers.slice(0, 8).map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-md border">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted-foreground w-6">
                        #{i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.visits} visits</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-emerald-700">{formatRWF(c.spent)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Method Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentPieData.length === 0 ? (
              <p className="text-muted-foreground text-sm">No payment data.</p>
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={paymentPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }: { name: string; percent: number }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {paymentPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatRWF(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Appointment Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusPieData.length === 0 ? (
              <p className="text-muted-foreground text-sm">No status data.</p>
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }: { name: string; value: number }) =>
                        `${name}: ${value}`
                      }
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
