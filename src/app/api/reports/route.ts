import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.error

  if (auth.user?.role === 'stylist') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }
  const params = req.nextUrl.searchParams
  const period = params.get('period') || 'daily'
  const fromParam = params.get('from')
  const toParam = params.get('to')
  const salonId = auth.salonId as string

  const now = new Date()
  let from: string
  let to: string

  if (fromParam && toParam) {
    from = fromParam
    to = toParam
  } else {
    to = now.toISOString().split('T')[0]
    switch (period) {
      case 'weekly': {
        const weekAgo = new Date(now)
        weekAgo.setDate(weekAgo.getDate() - 7)
        from = weekAgo.toISOString().split('T')[0]
        break
      }
      case 'monthly': {
        const monthAgo = new Date(now)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        from = monthAgo.toISOString().split('T')[0]
        break
      }
      default: {
        from = to
        break
      }
    }
  }

  const appointments = await db.appointment.findMany({
    where: {
      date: { gte: from, lte: to },
      salonId,
    },
    include: {
      customer: true,
      staff: true,
      service: true,
      payment: true,
    },
    orderBy: { date: 'asc' },
  })

  const revenueByDate: Record<string, number> = {}
  appointments
    .filter((a: { status: string }) => a.status === 'completed')
    .forEach((a: { date: string; service: { price: number }; payment?: { amount: number } | null }) => {
      const revenue = a.payment && a.payment.amount > 0 ? a.payment.amount : a.service.price
      revenueByDate[a.date] = (revenueByDate[a.date] || 0) + revenue
    })

  const serviceCount: Record<string, { name: string; count: number; revenue: number }> = {}
  appointments.forEach((a: { service: { id: string; name: string; price: number }; status: string; payment?: { amount: number } | null }) => {
    if (!serviceCount[a.service.id]) {
      serviceCount[a.service.id] = { name: a.service.name, count: 0, revenue: 0 }
    }
    serviceCount[a.service.id].count++
    if (a.status === 'completed') {
      const revenue = a.payment && a.payment.amount > 0 ? a.payment.amount : a.service.price
      serviceCount[a.service.id].revenue += revenue
    }
  })
  const topServices = Object.values(serviceCount).sort((a, b) => b.revenue - a.revenue)

  const customerCount: Record<string, { name: string; visits: number; spent: number }> = {}
  appointments.forEach((a: { customer: { id: string; name: string }; service: { price: number }; status: string; payment?: { amount: number } | null }) => {
    if (!customerCount[a.customer.id]) {
      customerCount[a.customer.id] = { name: a.customer.name, visits: 0, spent: 0 }
    }
    customerCount[a.customer.id].visits++
    if (a.status === 'completed') {
      const revenue = a.payment && a.payment.amount > 0 ? a.payment.amount : a.service.price
      customerCount[a.customer.id].spent += revenue
    }
  })
  const topCustomers = Object.values(customerCount).sort((a, b) => b.spent - a.spent)

  const paymentMethods: Record<string, number> = {}
  appointments.forEach((a: any) => {
    if (a.payment && a.payment.status !== 'unpaid') {
      paymentMethods[a.payment.method] = (paymentMethods[a.payment.method] || 0) + a.payment.amount
    }
  })

  const statusBreakdown: Record<string, number> = {}
  appointments.forEach((a: { status: string }) => {
    statusBreakdown[a.status] = (statusBreakdown[a.status] || 0) + 1
  })

  let totalCollected = 0
  let totalOutstanding = 0
  appointments
    .filter((a: { status: string }) => a.status === 'completed')
    .forEach((a: { service: { price: number }; payment?: { status: string; amount: number } | null }) => {
      if (a.payment && a.payment.status === 'paid') {
        totalCollected += a.payment.amount || a.service.price
      } else if (a.payment && a.payment.status === 'partial') {
        totalCollected += a.payment.amount
        totalOutstanding += a.service.price - a.payment.amount
      } else {
        totalOutstanding += a.service.price
      }
    })

  const revenueChart: Array<{ date: string; revenue: number }> = []
  const startDate = new Date(from)
  const endDate = new Date(to)
  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0]
    revenueChart.push({
      date: dateStr,
      revenue: revenueByDate[dateStr] || 0,
    })
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return NextResponse.json({
    revenueChart,
    topServices,
    topCustomers,
    paymentMethods,
    statusBreakdown,
    totalAppointments: appointments.length,
    totalRevenue: Object.values(revenueByDate).reduce((s, v) => s + v, 0),
    totalCollected,
    totalOutstanding,
  })
}
