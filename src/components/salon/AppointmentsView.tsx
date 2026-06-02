'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
} from 'lucide-react'
import { format, addDays, startOfWeek, isToday } from 'date-fns'
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

const statusConfig: Record<string, { label: string; cardClass: string; dotClass: string; borderClass: string }> = {
  booked: { label: 'Booked', cardClass: 'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950 dark:text-sky-100 dark:border-sky-800', dotClass: 'bg-sky-500', borderClass: 'border-l-sky-500' },
  confirmed: { label: 'Confirmed', cardClass: 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-800', dotClass: 'bg-emerald-500', borderClass: 'border-l-emerald-500' },
  in_progress: { label: 'In Progress', cardClass: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-800', dotClass: 'bg-amber-500', borderClass: 'border-l-amber-500' },
  completed: { label: 'Completed', cardClass: 'bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700', dotClass: 'bg-zinc-400', borderClass: 'border-l-zinc-400' },
  no_show: { label: 'No Show', cardClass: 'bg-red-50 text-red-900 border-red-200 dark:bg-red-950 dark:text-red-100 dark:border-red-800', dotClass: 'bg-red-500', borderClass: 'border-l-red-500' },
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
  const { user, permissions, authFetch } = useAuth()
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
      if (staffFilter) {
        url += `&staffId=${staffFilter}`
      }
      const res = await authFetch(url)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setAppointments(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch appointments', err)
    } finally {
      setLoading(false)
    }
  }, [selectedDate, viewMode, staffFilter, authFetch])

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
          group.push(apt)
          placed = true
          break
        }
      }
      if (!placed) {
        groups.push([apt])
      }
    }

    const layoutMap = new Map<string, { col: number; totalCols: number }>()
    for (const group of groups) {
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
    const isTodaySelected = selectedDate === format(now, 'yyyy-MM-dd')
    if (!isTodaySelected) return null
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const dayStartMinutes = START_HOUR * 60
    if (currentMinutes < dayStartMinutes || currentMinutes > END_HOUR * 60) return null
    return ((currentMinutes - dayStartMinutes) / 60) * SLOT_HEIGHT
  }, [currentTime, selectedDate])

  // Day View
  const DayView = () => (
    <div className="relative">
      <div className="grid grid-cols-[44px_sm:52px_1fr]">
        {/* Time labels */}
        <div className="space-y-0">
          {timeSlots.map((time) => (
            <div key={time} className="h-14 flex items-start justify-end pr-2 pt-0">
              <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium -mt-2">{time}</span>
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
                <div className="size-2.5 rounded-full bg-red-500 -ml-1 shadow-sm shadow-red-500/50" />
                <div className="h-0.5 flex-1 bg-red-500 shadow-sm shadow-red-500/50" />
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
            const config = statusConfig[apt.status]

            return (
              <div
                key={apt.id}
                className={`absolute rounded-lg border-l-[3px] p-1.5 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden shadow-sm ${config?.cardClass || 'bg-muted border-border'} ${config?.borderClass || 'border-l-gray-400'}`}
                style={{
                  top: `${top + 2}px`,
                  height: `${height - 4}px`,
                  left: `${leftPercent + 0.5}%`,
                  width: `${widthPercent}%`,
                }}
                onClick={() => handleAppointmentClick(apt)}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold truncate">{apt.customer?.name}</span>
                </div>
                <p className="text-[11px] truncate opacity-80">{apt.service?.name}</p>
                {height > 40 && (
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[10px] opacity-70 flex items-center gap-0.5">
                      <Clock className="size-2.5" />
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
    <ScrollArea className="w-full">
      <div className="min-w-[700px]">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-3">
          {weekDays.map((day) => {
            const isTodayDate = isToday(day)
            const isSelected = format(day, 'yyyy-MM-dd') === selectedDate
            const dayApts = appointments.filter((a) => a.date === format(day, 'yyyy-MM-dd'))
            return (
              <button
                key={day.toISOString()}
                className={`text-center py-2.5 min-h-[44px] rounded-xl transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                    : isTodayDate
                    ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                    : 'hover:bg-accent border border-transparent hover:border-border'
                }`}
                onClick={() => {
                  setSelectedDate(format(day, 'yyyy-MM-dd'))
                  setViewMode('day')
                }}
              >
                <p className="text-xs font-medium uppercase tracking-wide">{format(day, 'EEE')}</p>
                <p className="text-base sm:text-lg font-bold">{format(day, 'd')}</p>
                {dayApts.length > 0 && (
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-1.5 py-0 mt-0.5 ${
                      isSelected
                        ? 'bg-primary/80 text-primary-foreground hover:bg-primary/80'
                        : 'bg-primary/10 text-primary hover:bg-primary/10'
                    }`}
                  >
                    {dayApts.length}
                  </Badge>
                )}
              </button>
            )
          })}
        </div>

        {/* Appointments per day */}
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd')
            const dayApts = appointments.filter((a) => a.date === dayStr)
            return (
              <div key={dayStr} className="min-h-48 space-y-1 p-1.5 border rounded-lg bg-card/50">
                {dayApts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center pt-8">No appointments</p>
                ) : (
                  dayApts.map((apt) => {
                    const config = statusConfig[apt.status]
                    return (
                      <div
                        key={apt.id}
                        className={`rounded-md border-l-[3px] p-1.5 cursor-pointer hover:opacity-80 transition-opacity text-xs shadow-sm ${config?.cardClass || 'bg-muted'} ${config?.borderClass || 'border-l-gray-400'}`}
                        onClick={() => handleAppointmentClick(apt)}
                      >
                        <div className="flex items-center gap-1">
                          <span className="font-medium truncate">{apt.customer?.name}</span>
                        </div>
                        <p className="truncate text-[10px] opacity-80">{apt.startTime} {apt.service?.name}</p>
                      </div>
                    )
                  })
                )}
              </div>
            )
          })}
        </div>
      </div>
    </ScrollArea>
  )

  const formattedSelectedDate = (() => {
    try {
      return format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')
    } catch {
      return selectedDate
    }
  })()

  return (
    <div className="space-y-4">
      {/* Quick booking */}
      <QuickBookingForm selectedDate={selectedDate} onBookingCreated={fetchAppointments} />

      {/* Date navigation + View mode */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateDay(-1)} className="shrink-0">
            <ChevronLeft className="size-4" />
          </Button>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-32 sm:w-40"
          />
          <Button variant="outline" size="icon" onClick={() => navigateDay(1)} className="shrink-0">
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
            className="shrink-0"
          >
            <CalendarDays className="size-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Today</span>
          </Button>
        </div>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'day' | 'week')}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {Object.entries(statusConfig).map(([key, config]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`size-2.5 rounded-full ${config.dotClass}`} />
            <span className="text-xs text-muted-foreground">{config.label}</span>
          </div>
        ))}
        {currentTimeTop !== null && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-full bg-red-500" />
              <span className="text-xs text-muted-foreground">Current Time</span>
            </div>
          </>
        )}
      </div>

      {/* Calendar */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            {formattedSelectedDate}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-10 flex-1" />
                </div>
              ))}
            </div>
          ) : appointments.length === 0 && viewMode === 'day' ? (
            <div className="text-center py-16">
              <CalendarDays className="size-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">No appointments for this day.</p>
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
