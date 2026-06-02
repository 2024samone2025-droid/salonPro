import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.authorized) return auth.error

  const today = new Date().toISOString().split('T')[0]

  // Build appointment filter based on role
  const appointmentWhere: Record<string, unknown> = { date: today }
  if (auth.user?.role === 'stylist' && auth.user.staffId) {
    appointmentWhere.staffId = auth.user.staffId
  }

  const [
    todayAppointments,
    pendingPayments,
    activeStaff,
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
    // Stylists don't need pending payments data
    auth.user?.role !== 'stylist' ? db.payment.findMany({
      where: { status: { in: ['unpaid', 'partial'] } },
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
      where: { active: true },
    }),
  ])

  const todayRevenue = todayAppointments
    .filter((a: { status: string }) => a.status === 'completed')
    .reduce((sum: number, a: { service: { price: number }; payment?: { amount: number } | null }) => {
      if (a.payment && a.payment.amount > 0) return sum + a.payment.amount
      return sum + a.service.price
    }, 0)

  const pendingAmount = pendingPayments.reduce((sum: number, p: { appointment: { service: { price: number } }; amount: number }) => {
    return sum + p.appointment.service.price - p.amount
  }, 0)

  const statusBreakdown: Record<string, number> = {}
  todayAppointments.forEach((a: { status: string }) => {
    statusBreakdown[a.status] = (statusBreakdown[a.status] || 0) + 1
  })

  const staffWorkload = activeStaff.map((s: { id: string; name: string; role: string }) => {
    // For stylist dashboard, show only own workload
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

  // Pending payments list for dashboard
  const pendingPaymentsList = pendingPayments.map((p: {
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

  return NextResponse.json({
    todayAppointments,
    todayRevenue,
    pendingPayments: pendingPayments.length,
    pendingAmount,
    pendingPaymentsList,
    statusBreakdown,
    staffWorkload,
    totalAppointmentsToday: todayAppointments.length,
  })
}
