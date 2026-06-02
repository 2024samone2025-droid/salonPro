import { db } from '@/lib/db'
import { hashPin } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST() {
  // Clear existing data
  await db.payment.deleteMany()
  await db.appointment.deleteMany()
  await db.user.deleteMany()
  await db.customer.deleteMany()
  await db.staff.deleteMany()
  await db.service.deleteMany()

  // Create services (Rwandan-style names and prices)
  const services = await Promise.all([
    db.service.create({ data: { name: 'Haircut', price: 5000, duration: 30, active: true } }),
    db.service.create({ data: { name: 'Hair Braiding', price: 15000, duration: 120, active: true } }),
    db.service.create({ data: { name: 'Hair Wash & Style', price: 8000, duration: 45, active: true } }),
    db.service.create({ data: { name: 'Manicure', price: 6000, duration: 40, active: true } }),
    db.service.create({ data: { name: 'Pedicure', price: 7000, duration: 50, active: true } }),
    db.service.create({ data: { name: 'Facial Treatment', price: 12000, duration: 60, active: true } }),
    db.service.create({ data: { name: 'Makeup', price: 10000, duration: 45, active: true } }),
    db.service.create({ data: { name: 'Hair Color', price: 20000, duration: 90, active: true } }),
  ])

  // Create staff
  const staff = await Promise.all([
    db.staff.create({ data: { name: 'Marie Uwimana', phone: '+250788123456', role: 'stylist', active: true } }),
    db.staff.create({ data: { name: 'Jeanne Mukamana', phone: '+250788234567', role: 'stylist', active: true } }),
    db.staff.create({ data: { name: 'Grace Ingabire', phone: '+250788345678', role: 'stylist', active: true } }),
    db.staff.create({ data: { name: 'Alice Niyonsaba', phone: '+250788456789', role: 'receptionist', active: true } }),
  ])

  // Create demo users with hashed PINs
  const pin1 = hashPin('1234') // Admin PIN
  const pin2 = hashPin('5678') // Receptionist PIN
  const pin3 = hashPin('9012') // Stylist PIN

  await db.user.create({ data: { name: 'Admin', pin: pin1, role: 'admin', active: true } })
  await db.user.create({ data: { name: 'Alice', pin: pin2, role: 'receptionist', active: true, staffId: staff[3].id } })
  await db.user.create({ data: { name: 'Marie', pin: pin3, role: 'stylist', active: true, staffId: staff[0].id } })

  // Create more customers for variety
  const customers = await Promise.all([
    db.customer.create({ data: { name: 'Chantal Nyirahabimana', phone: '+250788111111', notes: 'Regular customer, prefers morning appointments' } }),
    db.customer.create({ data: { name: 'Diane Uwamahoro', phone: '+250788222222', notes: '' } }),
    db.customer.create({ data: { name: 'Pascal Imanirakiza', phone: '+250788333333', notes: 'Allergic to certain hair products' } }),
    db.customer.create({ data: { name: 'Clarisse Murekatete', phone: '+250788444444', notes: '' } }),
    db.customer.create({ data: { name: 'Eric Niyonzima', phone: '+250788555555', notes: 'Prefers Jeanne' } }),
    db.customer.create({ data: { name: 'Aline Uwimbabazi', phone: '+250788666666', notes: '' } }),
    db.customer.create({ data: { name: 'Patrick Habimana', phone: '+250788777777', notes: 'Walk-in customer' } }),
    db.customer.create({ data: { name: 'Sophie Mugisha', phone: '+250788888888', notes: '' } }),
    db.customer.create({ data: { name: 'Immaculee Niyonsaba', phone: '+250788999999', notes: 'VIP client' } }),
    db.customer.create({ data: { name: 'Jean Pierre Habimana', phone: '+250788000000', notes: '' } }),
    db.customer.create({ data: { name: 'Florence Mukamazimpaka', phone: '+250788101010', notes: 'Prefers Grace' } }),
    db.customer.create({ data: { name: 'Olive Uwimana', phone: '+250788202020', notes: '' } }),
  ])

  // Generate 30 days of historical data
  const today = new Date()
  const appointmentData: Array<{
    date: string
    startTime: string
    endTime: string
    status: string
    customerId: number
    staffId: number
    serviceId: number
    paymentStatus: string
    paymentMethod: string
    paymentAmount: number
  }> = []

  const stylistIds = [0, 1, 2] // Only stylists get appointments
  const timeSlots = [
    { start: '08:00', end: '08:30' },
    { start: '08:30', end: '09:00' },
    { start: '09:00', end: '09:45' },
    { start: '09:30', end: '10:00' },
    { start: '10:00', end: '11:30' },
    { start: '10:30', end: '11:00' },
    { start: '11:00', end: '11:45' },
    { start: '11:30', end: '12:00' },
    { start: '13:00', end: '13:30' },
    { start: '13:30', end: '14:00' },
    { start: '14:00', end: '15:30' },
    { start: '14:30', end: '15:00' },
    { start: '15:00', end: '15:50' },
    { start: '15:30', end: '16:00' },
    { start: '16:00', end: '16:40' },
    { start: '16:30', end: '17:00' },
  ]

  const paymentMethods = ['cash', 'mtn_momo', 'airtel_money']
  function getRandomPaymentMethod(): string {
    const r = Math.random()
    if (r < 0.40) return 'cash'
    if (r < 0.75) return 'mtn_momo'
    return 'airtel_money'
  }

  // Seeded pseudo-random for reproducibility
  let seed = 42
  function seededRandom() {
    seed = (seed * 16807 + 0) % 2147483647
    return (seed - 1) / 2147483646
  }

  for (let dayOffset = -30; dayOffset <= 2; dayOffset++) {
    const d = new Date(today)
    d.setDate(d.getDate() + dayOffset)
    const dateStr = d.toISOString().split('T')[0]
    const isToday = dayOffset === 0
    const isFuture = dayOffset > 0
    const isPast = dayOffset < 0

    const numAppointments = Math.floor(seededRandom() * 4) + 5

    const usedSlots = new Set<number>()
    for (let i = 0; i < numAppointments; i++) {
      let slotIdx: number
      do {
        slotIdx = Math.floor(seededRandom() * timeSlots.length)
      } while (usedSlots.has(slotIdx) && usedSlots.size < timeSlots.length)
      usedSlots.add(slotIdx)

      const slot = timeSlots[slotIdx]
      const custIdx = Math.floor(seededRandom() * customers.length)
      const staffIdx = stylistIds[Math.floor(seededRandom() * stylistIds.length)]
      const serviceIdx = Math.floor(seededRandom() * services.length)
      const service = services[serviceIdx]

      const [startH, startM] = slot.start.split(':').map(Number)
      const totalMin = startH * 60 + startM + service.duration
      const endH = Math.floor(totalMin / 60)
      const endM = totalMin % 60
      const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`

      let status: string
      let paymentStatus: string
      let paymentAmount: number

      if (isPast) {
        const r = seededRandom()
        if (r < 0.80) {
          status = 'completed'
        } else if (r < 0.92) {
          status = 'no_show'
        } else {
          status = 'completed'
        }

        if (status === 'completed') {
          const pr = seededRandom()
          if (pr < 0.80) {
            paymentStatus = 'paid'
            paymentAmount = service.price
          } else if (pr < 0.90) {
            paymentStatus = 'partial'
            paymentAmount = Math.floor(service.price * 0.5)
          } else {
            paymentStatus = 'unpaid'
            paymentAmount = 0
          }
        } else {
          paymentStatus = 'unpaid'
          paymentAmount = 0
        }
      } else if (isToday) {
        const r = seededRandom()
        if (r < 0.30) {
          status = 'completed'
          paymentStatus = 'paid'
          paymentAmount = service.price
        } else if (r < 0.45) {
          status = 'in_progress'
          paymentStatus = 'unpaid'
          paymentAmount = 0
        } else if (r < 0.65) {
          status = 'confirmed'
          paymentStatus = 'unpaid'
          paymentAmount = 0
        } else {
          status = 'booked'
          paymentStatus = 'unpaid'
          paymentAmount = 0
        }
      } else {
        const r = seededRandom()
        status = r < 0.6 ? 'booked' : 'confirmed'
        paymentStatus = 'unpaid'
        paymentAmount = 0
      }

      const paymentMethod = status === 'no_show' || paymentStatus === 'unpaid'
        ? 'cash'
        : getRandomPaymentMethod()

      appointmentData.push({
        date: dateStr,
        startTime: slot.start,
        endTime,
        status,
        customerId: custIdx,
        staffId: staffIdx,
        serviceId: serviceIdx,
        paymentStatus,
        paymentMethod,
        paymentAmount,
      })
    }
  }

  // Create all appointments with payments
  for (const apt of appointmentData) {
    const appointment = await db.appointment.create({
      data: {
        date: apt.date,
        startTime: apt.startTime,
        endTime: apt.endTime,
        status: apt.status,
        customerId: customers[apt.customerId].id,
        staffId: staff[apt.staffId].id,
        serviceId: services[apt.serviceId].id,
      },
    })
    await db.payment.create({
      data: {
        status: apt.paymentStatus,
        method: apt.paymentMethod,
        amount: apt.paymentAmount,
        appointmentId: appointment.id,
      },
    })
  }

  return NextResponse.json({
    success: true,
    message: 'Database seeded with 30 days of demo data + 3 user accounts',
    stats: {
      customers: customers.length,
      staff: staff.length,
      services: services.length,
      appointments: appointmentData.length,
      users: 3,
      userAccounts: [
        { name: 'Admin', role: 'admin', pin: '1234' },
        { name: 'Alice', role: 'receptionist', pin: '5678' },
        { name: 'Marie', role: 'stylist', pin: '9012' },
      ],
    },
  })
}
