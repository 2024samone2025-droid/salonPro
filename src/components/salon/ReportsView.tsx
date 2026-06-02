'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { format, subMonths, subWeeks } from 'date-fns'
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  Users,
  Scissors,
  AlertCircle,
  CheckCircle2,
  Lock,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
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

const methodColors: Record<string, string> = {
  cash: '#10b981',
  mtn_momo: '#f59e0b',
  airtel_money: '#ef4444',
}

const pieColors = ['#10b981', '#f59e0b', '#ef4444']

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
  const width = 64
  const height = 28
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((v - min) / range) * height
      return `${x},${y}`
    })
    .join(' ')

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
  }, [from, to, period, authFetch])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod)
    setCustomFrom('')
  }

  // Calculate trend
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
        <div className="flex items-center justify-center size-16 rounded-2xl bg-muted mb-4">
          <Lock className="size-8 text-muted-foreground/40" />
        </div>
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
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!data) return <div className="text-muted-foreground">Failed to load reports.</div>

  const paymentPieData = Object.entries(data.paymentMethods).map(([method, amount]) => ({
    name: methodLabels[method] || method,
    value: amount,
    color: methodColors[method] || pieColors[0],
  }))

  const statusPieData = Object.entries(data.statusBreakdown).map(([status, count]) => ({
    name: statusLabels[status] || status,
    value: count,
    color: statusColors[status] || '#8884d8',
  }))

  // Sparkline data: last 7 data points
  const sparklineData = data.revenueChart.slice(-7).map((d) => d.revenue)

  const collectionRate = data.totalRevenue > 0
    ? ((data.totalCollected / data.totalRevenue) * 100).toFixed(1)
    : '0'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
          <CardDescription className="flex items-center gap-2 mt-1">
            <CalendarDays className="size-3.5" />
            {format(new Date(from + 'T00:00:00'), 'MMM d, yyyy')} — {format(new Date(to + 'T00:00:00'), 'MMM d, yyyy')}
          </CardDescription>
        </div>
        <div className="flex gap-2 items-center flex-wrap w-full sm:w-auto">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-full sm:w-32">
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
            className="w-28 sm:w-36"
          />
          <Input
            type="date"
            value={customTo || to}
            onChange={(e) => setCustomTo(e.target.value)}
            className="w-28 sm:w-36"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReports}
            className="shrink-0"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="sm:col-span-1">
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 shrink-0">
                <Banknote className="size-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center">
                  <p className="text-base sm:text-lg font-bold truncate">{formatRWF(data.totalRevenue)}</p>
                  <Sparkline data={sparklineData} />
                </div>
                {trendPercent !== null && (
                  <div className={`flex items-center gap-0.5 text-xs font-medium ${trendPercent >= 0 ? 'text-primary' : 'text-red-600'}`}>
                    {trendPercent >= 0 ? (
                      <ArrowUpRight className="size-3" />
                    ) : (
                      <ArrowDownRight className="size-3" />
                    )}
                    {Math.abs(trendPercent).toFixed(1)}% vs prior period
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Collected</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-xl bg-green-100 shrink-0">
                <CheckCircle2 className="size-5 text-green-700" />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-bold text-green-700 truncate">{formatRWF(data.totalCollected)}</p>
                <p className="text-xs text-muted-foreground">{collectionRate}% collection rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-xl bg-amber-100 shrink-0">
                <AlertCircle className="size-5 text-amber-700" />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-bold text-amber-700 truncate">{formatRWF(data.totalOutstanding)}</p>
                <p className="text-xs text-muted-foreground">Pending payments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Appointments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-xl bg-teal-100 shrink-0">
                <TrendingUp className="size-5 text-teal-700" />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-bold truncate">{data.totalAppointments}</p>
                <p className="text-xs text-muted-foreground">{data.topServices.length} services</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Charts organized with Tabs */}
      <Tabs defaultValue="revenue" className="w-full">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Revenue Overview</CardTitle>
              <CardDescription>Daily revenue for the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {data.revenueChart.length === 0 || data.revenueChart.every((d) => d.revenue === 0) ? (
                <div className="text-center py-12">
                  <Banknote className="size-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">No revenue data for this period.</p>
                  <p className="text-xs text-muted-foreground mt-1">Try selecting a wider date range.</p>
                </div>
              ) : (
                <div className="w-full h-[300px] sm:h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.revenueChart} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
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
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(val: number) => `${(val / 1000).toFixed(0)}k`}
                        width={45}
                        axisLine={false}
                        tickLine={false}
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
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Breakdown Tab */}
        <TabsContent value="breakdown" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Method Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Methods</CardTitle>
                <CardDescription>Revenue distribution by payment method</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentPieData.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">No payment data.</p>
                  </div>
                ) : (
                  <>
                    <div className="w-full h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={paymentPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            dataKey="value"
                            paddingAngle={2}
                          >
                            {paymentPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => formatRWF(value)}
                            contentStyle={{
                              borderRadius: '8px',
                              border: '1px solid var(--border)',
                            }}
                          />
                          <Legend
                            formatter={(value: string) => (
                              <span className="text-xs text-foreground">{value}</span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <Separator className="my-3" />
                    <div className="space-y-2">
                      {paymentPieData.map((entry) => {
                        const total = paymentPieData.reduce((s, e) => s + e.value, 0)
                        const percent = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0'
                        return (
                          <div key={entry.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="size-3 rounded-sm" style={{ backgroundColor: entry.color }} />
                              <span className="font-medium">{entry.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{percent}%</span>
                              <span className="font-medium">{formatRWF(entry.value)}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Appointment Status</CardTitle>
                <CardDescription>Distribution of appointment statuses</CardDescription>
              </CardHeader>
              <CardContent>
                {statusPieData.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">No status data.</p>
                  </div>
                ) : (
                  <>
                    <div className="w-full h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            dataKey="value"
                            paddingAngle={2}
                          >
                            {statusPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              borderRadius: '8px',
                              border: '1px solid var(--border)',
                            }}
                          />
                          <Legend
                            formatter={(value: string) => (
                              <span className="text-xs text-foreground">{value}</span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <Separator className="my-3" />
                    <div className="space-y-2">
                      {statusPieData.map((entry) => (
                        <div key={entry.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="size-3 rounded-sm" style={{ backgroundColor: entry.color }} />
                            <span className="font-medium">{entry.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{entry.value}</span>
                            <Badge variant="secondary" className="text-xs">
                              {data.totalAppointments > 0
                                ? ((entry.value / data.totalAppointments) * 100).toFixed(0)
                                : 0}
                              %
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Rankings Tab */}
        <TabsContent value="rankings" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Services */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
                    <Scissors className="size-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Top Services</CardTitle>
                    <CardDescription>Ranked by revenue</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {data.topServices.length === 0 ? (
                  <div className="text-center py-8">
                    <Scissors className="size-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-muted-foreground text-sm">No service data.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.topServices.slice(0, 8).map((s, i) => {
                      const maxRevenue = data.topServices[0]?.revenue || 1
                      const barPercent = (s.revenue / maxRevenue) * 100
                      return (
                        <div
                          key={i}
                          className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2.5">
                              <span className="text-sm font-bold text-foreground w-6 shrink-0">
                                #{i + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{s.name}</p>
                                <p className="text-xs text-muted-foreground">{s.count} booking{s.count !== 1 ? 's' : ''}</p>
                              </div>
                            </div>
                            <span className="text-sm font-bold text-foreground shrink-0 ml-2">
                              {formatRWF(s.revenue)}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${barPercent}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Customers */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-teal-100">
                    <Users className="size-4 text-teal-700" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Top Customers</CardTitle>
                    <CardDescription>Ranked by spending</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {data.topCustomers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="size-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-muted-foreground text-sm">No customer data.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.topCustomers.slice(0, 8).map((c, i) => {
                      const maxSpent = data.topCustomers[0]?.spent || 1
                      const barPercent = (c.spent / maxSpent) * 100
                      return (
                        <div
                          key={i}
                          className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2.5">
                              <span className="text-sm font-bold text-teal-700 w-6 shrink-0">
                                #{i + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{c.name}</p>
                                <p className="text-xs text-muted-foreground">{c.visits} visit{c.visits !== 1 ? 's' : ''}</p>
                              </div>
                            </div>
                            <span className="text-sm font-bold text-teal-700 shrink-0 ml-2">
                              {formatRWF(c.spent)}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-teal-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-teal-500 rounded-full transition-all"
                              style={{ width: `${barPercent}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
