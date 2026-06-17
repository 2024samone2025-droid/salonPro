import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth.authorized) return auth.error

    const today = new Date().toISOString().split('T')[0]
    const salonId = auth.salonId as string

    // Same weekday last week — a stable, like-for-like baseline for the KPI deltas
    // (accounts for weekly seasonality; appointment counts are full-day vs full-day).
    const lastWeekDate = new Date()
    lastWeekDate.setUTCDate(lastWeekDate.getUTCDate() - 7)
    const lastWeek = lastWeekDate.toISOString().split('T')[0]

    // Forward week (today + 6 days) for the upcoming-appointments rail. `date` is a
    // zero-padded ISO string, so lexicographic gte/lte range == chronological.
    const weekEndDate = new Date()
    weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6)
    const weekEnd = weekEndDate.toISOString().split('T')[0]

    const appointmentWhere: Record<string, unknown> = { date: today, salonId }
    if (auth.user?.role === 'stylist' && auth.user.staffId) {
      appointmentWhere.staffId = auth.user.staffId
    }
    const priorWhere = { ...appointmentWhere, date: lastWeek }
    const upcomingWhere = { ...appointmentWhere, date: { gte: today, lte: weekEnd } }

    const [
      todayAppointments,
      todayPendingPayments,
      activeStaff,
      priorAppointments,
      upcomingAppointments,
    ] = await Promise.all([
      db.appointment.findMany({
        where: appointmentWhere,
        include: {
          customer: true,
          staff: true,
          service: true,
          payment: true,
        },
        orderBy: { startTime: 'asc' },
      }),
      auth.user?.role !== 'stylist' ? db.payment.findMany({
        where: {
          status: { in: ['unpaid', 'partial'] },
          appointment: { date: today, salonId },
        },
        include: {
          appointment: {
            include: {
              customer: true,
              service: true,
            },
          },
        },
      }) : Promise.resolve([]),
      db.staff.findMany({
        where: {
          active: true,
          salonId,
          ...(auth.user?.role === 'stylist' && auth.user.staffId
            ? { id: auth.user.staffId }
            : {}),
        },
      }),
      db.appointment.findMany({
        where: priorWhere,
        include: { service: true, payment: true },
      }),
      db.appointment.findMany({
        where: upcomingWhere,
        include: { customer: true, staff: true, service: true },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      }),
    ])

    const completedRevenue = (
      appts: Array<{ status: string; service: { price: number }; payment?: { amount: number } | null }>
    ) =>
      appts
        .filter((a) => a.status === 'completed')
        .reduce((sum, a) => {
          if (a.payment && a.payment.amount > 0) return sum + a.payment.amount
          return sum + a.service.price
        }, 0)

    const todayRevenue = completedRevenue(todayAppointments)
    const priorRevenue = completedRevenue(priorAppointments)
    const priorAppointmentCount = priorAppointments.length

    const pendingAmount = todayPendingPayments.reduce((sum: number, p: { appointment: { service: { price: number } }; amount: number }) => {
      return sum + p.appointment.service.price - p.amount
    }, 0)

    const statusBreakdown: Record<string, number> = {}
    todayAppointments.forEach((a: { status: string }) => {
      statusBreakdown[a.status] = (statusBreakdown[a.status] || 0) + 1
    })

    const staffWorkload = activeStaff.map((s: { id: string; name: string; role: string }) => {
      const staffApts = todayAppointments.filter((a: { staffId: string }) => a.staffId === s.id)
      const totalMinutes = staffApts.reduce((sum: number, a: { service: { duration: number } }) => sum + a.service.duration, 0)
      return {
        id: s.id,
        name: s.name,
        role: s.role,
        appointmentCount: staffApts.length,
        totalMinutes,
      }
    })

    const pendingPaymentsList = todayPendingPayments.map((p: {
      id: string
      amount: number
      appointment: {
        customer: { name: string }
        service: { name: string; price: number }
      }
    }) => ({
      id: p.id,
      amount: p.amount,
      appointment: {
        customer: { name: p.appointment.customer.name },
        service: { name: p.appointment.service.name, price: p.appointment.service.price },
      },
    }))

    const upcoming = upcomingAppointments.map((a: {
      id: string
      date: string
      startTime: string
      endTime: string
      status: string
      customer: { name: string }
      staff: { name: string }
      service: { name: string; price: number }
    }) => ({
      id: a.id,
      date: a.date,
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      customer: { name: a.customer.name },
      staff: { name: a.staff.name },
      service: { name: a.service.name, price: a.service.price },
    }))

    return NextResponse.json({
      today,
      todayAppointments,
      todayRevenue,
      pendingPayments: todayPendingPayments.length,
      pendingAmount,
      pendingPaymentsList,
      statusBreakdown,
      staffWorkload,
      totalAppointmentsToday: todayAppointments.length,
      priorRevenue,
      priorAppointmentCount,
      upcomingAppointments: upcoming,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 })
  }
}
