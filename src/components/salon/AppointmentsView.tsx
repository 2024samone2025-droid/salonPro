'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addDays, startOfWeek } from 'date-fns'
import { useSalonStore } from '@/lib/salon-store'
import QuickBookingForm from './QuickBookingForm'
import AppointmentDialog from './AppointmentDialog'
import { useAuth } from '@/lib/auth-context'

interface Appointment {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  notes: string
  customer: { id: string; name: string; phone: string }
  staff: { id: string; name: string }
  service: { id: string; name: string; price: number; duration: number }
  payment?: { id: string; status: string; method: string; amount: number } | null
}

const statusColors: Record<string, string> = {
  booked: 'bg-blue-100 text-blue-800 border-blue-200',
  confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  no_show: 'bg-red-100 text-red-800 border-red-200',
}

const statusDotColors: Record<string, string> = {
  booked: 'bg-blue-500',
  confirmed: 'bg-emerald-500',
  in_progress: 'bg-amber-500',
  completed: 'bg-green-500',
  no_show: 'bg-red-500',
}

const statusLabels: Record<string, string> = {
  booked: 'Booked',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  no_show: 'No Show',
}

function formatRWF(amount: number) {
  return new Intl.NumberFormat('en-RW').format(amount) + ' RWF'
}

const SLOT_HEIGHT = 56 // h-14 = 56px
const START_HOUR = 8
const END_HOUR = 18
const timeSlots = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => {
  const hour = i + START_HOUR
  return `${hour.toString().padStart(2, '0')}:00`
})

export default function AppointmentsView() {
  const { selectedDate, setSelectedDate } = useSalonStore()
  const { user, permissions } = useAuth()
  const isStylist = user?.role === 'stylist'
  const staffFilter = isStylist && user.staffId ? user.staffId : null
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    try {
      let url = `/api/appointments?date=${selectedDate}`
      if (viewMode === 'week') {
        const weekStart = startOfWeek(new Date(selectedDate), { weekStartsOn: 1 })
        const from = format(weekStart, 'yyyy-MM-dd')
        const to = format(addDays(weekStart, 6), 'yyyy-MM-dd')
        url = `/api/appointments?from=${from}&to=${to}`
      }
      // Stylists only see their own appointments
      if (staffFilter) {
        url += `&staffId=${staffFilter}`
      }
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setAppointments(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch appointments', err)
    } finally {
      setLoading(false)
    }
  }, [selectedDate, viewMode, staffFilter])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const navigateDay = (delta: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    setSelectedDate(format(d, 'yyyy-MM-dd'))
  }

  const weekStart = startOfWeek(new Date(selectedDate), { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Calculate overlapping groups for day view
  const overlapGroups = useMemo(() => {
    const sorted = [...appointments].sort((a, b) => {
      const aStart = timeToMinutes(a.startTime)
      const bStart = timeToMinutes(b.startTime)
      return aStart - bStart
    })

    const groups: Appointment[][] = []
    for (const apt of sorted) {
      const aptStart = timeToMinutes(apt.startTime)
      const aptEnd = timeToMinutes(apt.endTime)

      let placed = false
      for (const group of groups) {
        const lastInGroup = group[group.length - 1]
        const lastEnd = timeToMinutes(lastInGroup.endTime)
        if (aptStart < lastEnd) {
          // Overlapping - add to this group
          group.push(apt)
          placed = true
          break
        }
      }
      if (!placed) {
        groups.push([apt])
      }
    }

    // Now create a layout map: for each appointment, assign column index and total columns
    const layoutMap = new Map<string, { col: number; totalCols: number }>()
    for (const group of groups) {
      // Simple column assignment based on position in group
      group.forEach((apt, idx) => {
        layoutMap.set(apt.id, { col: idx, totalCols: group.length })
      })
    }

    return layoutMap
  }, [appointments])

  function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }

  const getAppointmentPosition = (apt: Appointment) => {
    const startMinutes = timeToMinutes(apt.startTime)
    const endMinutes = timeToMinutes(apt.endTime)
    const dayStartMinutes = START_HOUR * 60

    const top = ((startMinutes - dayStartMinutes) / 60) * SLOT_HEIGHT
    const height = Math.max(((endMinutes - startMinutes) / 60) * SLOT_HEIGHT, 28)

    return { top, height }
  }

  const handleAppointmentClick = (apt: Appointment) => {
    setSelectedAppointment(apt)
    setDialogOpen(true)
  }

  // Current time indicator position
  const currentTimeTop = useMemo(() => {
    const now = currentTime
    const isToday = selectedDate === format(now, 'yyyy-MM-dd')
    if (!isToday) return null
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const dayStartMinutes = START_HOUR * 60
    if (currentMinutes < dayStartMinutes || currentMinutes > END_HOUR * 60) return null
    return ((currentMinutes - dayStartMinutes) / 60) * SLOT_HEIGHT
  }, [currentTime, selectedDate])

  // Day View
  const DayView = () => (
    <div className="relative">
      <div className="grid grid-cols-[52px_1fr]">
        {/* Time labels */}
        <div className="space-y-0">
          {timeSlots.map((time) => (
            <div key={time} className="h-14 flex items-start justify-end pr-2 pt-0">
              <span className="text-[11px] text-muted-foreground -mt-2">{time}</span>
            </div>
          ))}
        </div>

        {/* Appointments grid */}
        <div className="relative border-l">
          {/* Grid lines */}
          {timeSlots.map((time) => (
            <div key={time} className="h-14 border-b border-dashed border-border/60" />
          ))}

          {/* Current time indicator */}
          {currentTimeTop !== null && (
            <div
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: `${currentTimeTop}px` }}
            >
              <div className="flex items-center">
                <div className="size-2.5 rounded-full bg-red-500 -ml-1" />
                <div className="h-0.5 flex-1 bg-red-500" />
              </div>
            </div>
          )}

          {/* Appointment cards */}
          {appointments.map((apt) => {
            const { top, height } = getAppointmentPosition(apt)
            const layout = overlapGroups.get(apt.id)
            const col = layout?.col || 0
            const totalCols = layout?.totalCols || 1
            const colWidth = 100 / totalCols
            const leftPercent = col * colWidth
            const widthPercent = colWidth - 1

            return (
              <div
                key={apt.id}
                className={`absolute rounded-md border p-1.5 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden ${statusColors[apt.status] || 'bg-gray-100 border-gray-200'}`}
                style={{
                  top: `${top + 2}px`,
                  height: `${height - 4}px`,
                  left: `${leftPercent + 0.5}%`,
                  width: `${widthPercent}%`,
                }}
                onClick={() => handleAppointmentClick(apt)}
              >
                <div className="flex items-center gap-1">
                  <div className={`size-2 rounded-full shrink-0 ${statusDotColors[apt.status] || 'bg-gray-400'}`} />
                  <span className="text-xs font-semibold truncate">{apt.customer?.name}</span>
                </div>
                <p className="text-xs truncate">{apt.service?.name}</p>
                {height > 40 && (
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[10px] opacity-75">
                      {apt.startTime} - {apt.endTime}
                    </p>
                    <p className="text-[10px] font-medium opacity-80">
                      {formatRWF(apt.service?.price)}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  // Week View
  const WeekView = () => (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => {
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
            const isSelected = format(day, 'yyyy-MM-dd') === selectedDate
            return (
              <button
                key={day.toISOString()}
                className={`text-center py-2 rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-emerald-600 text-white'
                    : isToday
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'hover:bg-accent'
                }`}
                onClick={() => {
                  setSelectedDate(format(day, 'yyyy-MM-dd'))
                  setViewMode('day')
                }}
              >
                <p className="text-xs font-medium">{format(day, 'EEE')}</p>
                <p className="text-lg font-bold">{format(day, 'd')}</p>
              </button>
            )
          })}
        </div>

        {/* Appointments per day */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd')
            const dayApts = appointments.filter((a) => a.date === dayStr)
            return (
              <div key={dayStr} className="min-h-48 space-y-1 p-1 border rounded-md">
                {dayApts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center pt-4">No appointments</p>
                ) : (
                  dayApts.map((apt) => (
                    <div
                      key={apt.id}
                      className={`rounded border p-1.5 cursor-pointer hover:opacity-80 transition-opacity text-xs ${statusColors[apt.status]}`}
                      onClick={() => handleAppointmentClick(apt)}
                    >
                      <div className="flex items-center gap-1">
                        <div className={`size-1.5 rounded-full ${statusDotColors[apt.status]}`} />
                        <span className="font-medium truncate">{apt.customer?.name}</span>
                      </div>
                      <p className="truncate text-[10px]">{apt.startTime} {apt.service?.name}</p>
                    </div>
                  ))
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Quick booking */}
      <QuickBookingForm selectedDate={selectedDate} onBookingCreated={fetchAppointments} />

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateDay(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
          <Button variant="outline" size="icon" onClick={() => navigateDay(1)}>
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
          >
            Today
          </Button>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={viewMode === 'day' ? 'default' : 'outline'}
            className={viewMode === 'day' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            onClick={() => setViewMode('day')}
          >
            Day
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'week' ? 'default' : 'outline'}
            className={viewMode === 'week' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            onClick={() => setViewMode('week')}
          >
            Week
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(statusLabels).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`size-2.5 rounded-full ${statusDotColors[key]}`} />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="p-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : viewMode === 'day' ? (
            <DayView />
          ) : (
            <WeekView />
          )}
        </CardContent>
      </Card>

      {/* Appointment Dialog */}
      <AppointmentDialog
        appointment={selectedAppointment}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setSelectedAppointment(null)
        }}
        onUpdate={fetchAppointments}
      />
    </div>
  )
}
