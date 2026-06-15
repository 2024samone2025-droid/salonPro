'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
  Share2,
} from 'lucide-react'
import { format, addDays, startOfWeek, isToday } from 'date-fns'
import { useSalonStore } from '@/lib/salon-store'
import {
  DndContext,
  useDraggable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import QuickBookingForm from './QuickBookingForm'
import AppointmentDialog from './AppointmentDialog'
import EmptyState from '@/components/salon/EmptyState'
import { useAuth, useMoney } from '@/lib/auth-context'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { STATUS_CONFIG, type AppointmentStatus } from '@/lib/constants'

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

const SLOT_HEIGHT = 56 // h-14 = 56px
// Fallback grid hours when the salon has no business-hours settings
const DEFAULT_START_HOUR = 8
const DEFAULT_END_HOUR = 18

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(total: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(total)))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

const SNAP_MINUTES = 15
const PX_PER_MINUTE = SLOT_HEIGHT / 60

// Day View Component
interface DayViewProps {
  appointments: Appointment[]
  currentTimeTop: number | null
  overlapGroups: Map<string, { col: number; totalCols: number }>
  onAppointmentClick: (apt: Appointment) => void
  canReschedule: boolean
  onReschedule: (apt: Appointment, newStartTime: string, newEndTime: string) => void
  startHour: number
  endHour: number
}

interface DraggableCardProps {
  apt: Appointment
  top: number
  height: number
  leftPercent: number
  widthPercent: number
  draggable: boolean
  onAppointmentClick: (apt: Appointment) => void
}

function DraggableAppointmentCard({
  apt,
  top,
  height,
  leftPercent,
  widthPercent,
  draggable,
  onAppointmentClick,
}: DraggableCardProps) {
  const formatRWF = useMoney()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: apt.id,
    disabled: !draggable,
  })
  const config = STATUS_CONFIG[apt.status as AppointmentStatus]
  const dy = transform?.y ?? 0

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'absolute rounded-lg border-l-[3px] p-1.5 transition-all overflow-hidden shadow-sm border',
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer hover:opacity-90',
        isDragging && 'opacity-80 ring-2 ring-primary z-30 shadow-lg',
        config?.cardBg || 'bg-muted',
        config?.textClass || 'text-foreground',
        config?.borderClass || 'border-border/50',
        config?.accentBorderClass || 'border-l-border'
      )}
      style={{
        top: `${top + 2}px`,
        height: `${height - 4}px`,
        left: `${leftPercent + 0.5}%`,
        width: `${widthPercent}%`,
        transform: dy ? `translateY(${dy}px)` : undefined,
      }}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      onClick={() => {
        if (!isDragging) onAppointmentClick(apt)
      }}
      role="button"
      aria-label={`Appointment for ${apt.customer?.name} at ${apt.startTime}`}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold truncate">{apt.customer?.name}</span>
      </div>
      <p className="text-[11px] truncate opacity-80">{apt.service?.name}</p>
      {height > 40 && (
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-[10px] opacity-70 flex items-center gap-0.5">
            <Clock className="size-2.5" aria-hidden="true" />
            {apt.startTime} - {apt.endTime}
          </p>
          <p className="text-[10px] font-medium opacity-80">
            {formatRWF(apt.service?.price)}
          </p>
        </div>
      )}
    </div>
  )
}

function DayView({
  appointments,
  currentTimeTop,
  overlapGroups,
  onAppointmentClick,
  canReschedule,
  onReschedule,
  startHour,
  endHour,
}: DayViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const timeSlots = useMemo(
    () =>
      Array.from({ length: Math.max(endHour - startHour, 1) }, (_, i) => {
        const hour = i + startHour
        return `${hour.toString().padStart(2, '0')}:00`
      }),
    [startHour, endHour]
  )

  const getAppointmentPosition = (apt: Appointment) => {
    const startMinutes = timeToMinutes(apt.startTime)
    const endMinutes = timeToMinutes(apt.endTime)
    const dayStartMinutes = startHour * 60

    const top = ((startMinutes - dayStartMinutes) / 60) * SLOT_HEIGHT
    const height = Math.max(((endMinutes - startMinutes) / 60) * SLOT_HEIGHT, 28)

    return { top, height }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const dy = event.delta.y
    if (!dy) return
    const apt = appointments.find((a) => a.id === event.active.id)
    if (!apt) return

    const duration = timeToMinutes(apt.endTime) - timeToMinutes(apt.startTime)
    const deltaMinutes = Math.round((dy / PX_PER_MINUTE) / SNAP_MINUTES) * SNAP_MINUTES
    if (deltaMinutes === 0) return

    let newStart = timeToMinutes(apt.startTime) + deltaMinutes
    const dayStart = startHour * 60
    const dayEnd = endHour * 60
    newStart = Math.max(dayStart, Math.min(dayEnd - duration, newStart))
    const newStartTime = minutesToTime(newStart)
    const newEndTime = minutesToTime(newStart + duration)
    if (newStartTime === apt.startTime) return

    onReschedule(apt, newStartTime, newEndTime)
  }

  const grid = (
    <div className="relative">
      <div className="grid grid-cols-[44px_sm:52px_1fr]">
        <div className="space-y-0">
          {timeSlots.map((time) => (
            <div key={time} className="h-14 flex items-start justify-end pr-2 pt-0">
              <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium -mt-2">{time}</span>
            </div>
          ))}
        </div>

        <div className="relative border-l">
          {timeSlots.map((time) => (
            <div key={time} className="h-14 border-b border-dashed border-border/60" />
          ))}

          {currentTimeTop !== null && (
            <div
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: `${currentTimeTop}px` }}
            >
              <div className="flex items-center">
                <div className="size-2.5 rounded-full bg-primary -ml-1 shadow-sm shadow-primary/50" />
                <div className="h-0.5 flex-1 bg-primary shadow-sm shadow-primary/50" />
              </div>
            </div>
          )}

          {appointments.map((apt) => {
            const { top, height } = getAppointmentPosition(apt)
            const layout = overlapGroups.get(apt.id)
            const col = layout?.col || 0
            const totalCols = layout?.totalCols || 1
            const colWidth = 100 / totalCols
            const leftPercent = col * colWidth
            const widthPercent = colWidth - 1
            const isFinal = apt.status === 'completed' || apt.status === 'no_show'

            return (
              <DraggableAppointmentCard
                key={apt.id}
                apt={apt}
                top={top}
                height={height}
                leftPercent={leftPercent}
                widthPercent={widthPercent}
                draggable={canReschedule && !isFinal}
                onAppointmentClick={onAppointmentClick}
              />
            )
          })}
        </div>
      </div>
    </div>
  )

  if (!canReschedule) return grid

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {grid}
    </DndContext>
  )
}

// Week View Component
interface WeekViewProps {
  weekDays: Date[]
  selectedDate: string
  appointments: Appointment[]
  onDaySelect: (date: string) => void
  onAppointmentClick: (apt: Appointment) => void
}

function WeekView({ weekDays, selectedDate, appointments, onDaySelect, onAppointmentClick }: WeekViewProps) {
  return (
    <ScrollArea className="w-full">
      <div className="min-w-[700px]">
        <div className="grid grid-cols-7 gap-1.5 mb-3">
          {weekDays.map((day) => {
            const isTodayDate = isToday(day)
            const dayStr = format(day, 'yyyy-MM-dd')
            const isSelected = dayStr === selectedDate
            const dayApts = appointments.filter((a) => a.date === dayStr)
            return (
              <Button
                key={day.toISOString()}
                variant="plain"
                className={cn(
                  'h-auto min-h-[44px] flex-col gap-0 rounded-md px-0 py-2.5 text-center font-normal transition-all',
                  isSelected
                    ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                    : isTodayDate
                    ? 'ring-1 ring-foreground/25 font-medium hover:bg-muted'
                    : 'border border-transparent hover:border-border hover:bg-muted'
                )}
                onClick={() => onDaySelect(dayStr)}
              >
                <p className="text-xs font-medium uppercase tracking-wide">{format(day, 'EEE')}</p>
                <p className="text-base sm:text-lg font-bold">{format(day, 'd')}</p>
                {dayApts.length > 0 && (
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-1.5 py-0 mt-0.5 ${
                      isSelected
                        ? 'bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20'
                        : 'bg-muted text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {dayApts.length}
                  </Badge>
                )}
              </Button>
            )
          })}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd')
            const dayApts = appointments.filter((a) => a.date === dayStr)
            return (
              <div key={dayStr} className="min-h-48 space-y-1 p-1.5 border rounded-lg bg-card/50">
                {dayApts.length === 0 ? (
                  <p className="text-xs text-ink-faint text-center pt-8">No appointments</p>
                ) : (
                  dayApts.map((apt) => {
                    const config = STATUS_CONFIG[apt.status as AppointmentStatus]
                    return (
                      <div
                        key={apt.id}
                        className={cn(
                          "rounded-md border-l-[3px] p-1.5 cursor-pointer hover:opacity-80 transition-opacity text-xs shadow-sm",
                          config?.cardBg || 'bg-muted',
                          config?.textClass || 'text-foreground',
                          config?.accentBorderClass || 'border-l-border'
                        )}
                        onClick={() => onAppointmentClick(apt)}
                        role="button"
                        aria-label={`${apt.startTime} - ${apt.customer?.name} - ${apt.service?.name}`}
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
}

export default function AppointmentsView() {
  const { selectedDate, setSelectedDate } = useSalonStore()
  const { permissions, authFetch, salon, user } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  // Initial view follows the user's saved preference (AppShell guarantees the
  // session — and thus settings — is resolved before this view mounts).
  const [viewMode, setViewMode] = useState<'day' | 'week'>(
    user?.settings?.appPreferences?.calendarDefaultView ?? 'day'
  )
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const isInitialMount = useRef(true)

  const fetchAppointments = useCallback(async () => {
    if (!isInitialMount.current) {
      setLoading(true)
    }
    isInitialMount.current = false;
    try {
      let url: string
      if (viewMode === 'week') {
        const ws = startOfWeek(new Date(selectedDate + 'T00:00:00'), { weekStartsOn: 1 })
        const we = addDays(ws, 6)
        url = `/api/appointments?from=${format(ws, 'yyyy-MM-dd')}&to=${format(we, 'yyyy-MM-dd')}`
      } else {
        url = `/api/appointments?date=${selectedDate}`
      }
      const res = await authFetch(url)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setAppointments(data)
    } catch (error) {
      console.error('Fetch error:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedDate, viewMode, authFetch])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const navigateDay = (delta: number) => {
    const d = new Date(selectedDate + 'T00:00:00')
    const next = addDays(d, delta)
    setSelectedDate(format(next, 'yyyy-MM-dd'))
  }

  const weekStart = startOfWeek(new Date(selectedDate + 'T00:00:00'), { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const overlapGroups = useMemo(() => {
    const sorted = [...appointments].sort((a, b) => {
      const aStart = timeToMinutes(a.startTime)
      const bStart = timeToMinutes(b.startTime)
      return aStart - bStart
    })

    const groups: Appointment[][] = []
    for (const apt of sorted) {
      const aptStart = timeToMinutes(apt.startTime)
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

  const handleAppointmentClick = (apt: Appointment) => {
    setSelectedAppointment(apt)
    setDialogOpen(true)
  }

  const handleShareBookingLink = useCallback(async () => {
    if (!salon?.subdomain) {
      toast.error('Booking link unavailable')
      return
    }
    const url = `${window.location.origin}/book/${salon.subdomain}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Booking link copied', { description: url })
    } catch {
      toast.message('Your public booking link', { description: url })
    }
  }, [salon])

  const handleReschedule = useCallback(
    async (apt: Appointment, newStartTime: string, newEndTime: string) => {
      const previous = appointments
      // Optimistic update.
      setAppointments((prev) =>
        prev.map((a) => (a.id === apt.id ? { ...a, startTime: newStartTime, endTime: newEndTime } : a))
      )
      try {
        const res = await authFetch('/api/appointments', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: apt.id, startTime: newStartTime, endTime: newEndTime }),
        })
        if (res.ok) {
          toast.success('Appointment rescheduled', {
            description: `${apt.customer?.name} → ${newStartTime}–${newEndTime}`,
          })
          fetchAppointments()
        } else if (res.status === 409) {
          const data = await res.json().catch(() => null)
          setAppointments(previous)
          toast.error('Double booking', {
            description: data?.message || 'That time slot is already taken.',
          })
        } else {
          setAppointments(previous)
          toast.error('Failed to reschedule appointment')
        }
      } catch {
        setAppointments(previous)
        toast.error('Something went wrong')
      }
    },
    [appointments, authFetch, fetchAppointments]
  )

  // Grid hours for the selected day, from the salon's business hours settings
  const { startHour, endHour, dayClosed } = useMemo(() => {
    const weekday = new Date(selectedDate + 'T00:00:00').getDay()
    const day = salon?.settings?.businessHours?.[String(weekday)]
    if (!day) return { startHour: DEFAULT_START_HOUR, endHour: DEFAULT_END_HOUR, dayClosed: false }
    if (day.closed) return { startHour: DEFAULT_START_HOUR, endHour: DEFAULT_END_HOUR, dayClosed: true }
    const start = Math.floor(timeToMinutes(day.open) / 60)
    const end = Math.ceil(timeToMinutes(day.close) / 60)
    return end > start
      ? { startHour: start, endHour: end, dayClosed: false }
      : { startHour: DEFAULT_START_HOUR, endHour: DEFAULT_END_HOUR, dayClosed: false }
  }, [salon, selectedDate])

  const currentTimeTop = useMemo(() => {
    const now = currentTime
    const isTodaySelected = selectedDate === format(now, 'yyyy-MM-dd')
    if (!isTodaySelected) return null
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const dayStartMinutes = startHour * 60
    if (currentMinutes < dayStartMinutes || currentMinutes > endHour * 60) return null
    return ((currentMinutes - dayStartMinutes) / 60) * SLOT_HEIGHT
  }, [currentTime, selectedDate, startHour, endHour])

  const formattedSelectedDate = useMemo(() => {
    try {
      return format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')
    } catch {
      return selectedDate
    }
  }, [selectedDate])

  return (
    <div className="space-y-4">
      <QuickBookingForm selectedDate={selectedDate} onBookingCreated={fetchAppointments} />

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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={handleShareBookingLink}
            data-tour="share-booking"
          >
            <Share2 className="size-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Share booking link</span>
          </Button>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'day' | 'week')}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3" aria-label="Status legend">
        {(Object.entries(STATUS_CONFIG) as [AppointmentStatus, typeof STATUS_CONFIG[AppointmentStatus]][]).map(([key, config]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={cn("size-2.5 rounded-full", config.dotClass)} aria-hidden="true" />
            <span className="text-xs text-muted-foreground">{config.label}</span>
          </div>
        ))}
        {currentTimeTop !== null && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-full bg-primary" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">Current time</span>
            </div>
          </>
        )}
      </div>

      <Card className="overflow-hidden" data-tour="appointments-grid">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="size-4 text-muted-foreground" />
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
            <EmptyState
              icon={CalendarDays}
              message="No appointments for this day"
              // Only roles that can actually create see the booking CTA — the
              // QuickBookingForm above is hidden for stylists, so this would
              // otherwise scroll to nothing.
              actionLabel={permissions?.canCreateAppointment ? '+ Book one now' : undefined}
              onAction={
                permissions?.canCreateAppointment
                  ? () => window.scrollTo({ top: 0, behavior: 'smooth' })
                  : undefined
              }
              className="border-0 bg-transparent py-12"
            />
          ) : viewMode === 'day' ? (
            <>
              {dayClosed && (
                <p className="text-xs text-muted-foreground mb-2 px-1">
                  The salon is marked closed on this day — these appointments fall outside business hours.
                </p>
              )}
              <DayView
                appointments={appointments}
                currentTimeTop={currentTimeTop}
                overlapGroups={overlapGroups}
                onAppointmentClick={handleAppointmentClick}
                canReschedule={!!permissions?.canCreateAppointment}
                onReschedule={handleReschedule}
                startHour={startHour}
                endHour={endHour}
              />
            </>
          ) : (
            <WeekView 
              weekDays={weekDays} 
              selectedDate={selectedDate} 
              appointments={appointments} 
              onDaySelect={(date) => {
                setSelectedDate(date)
                setViewMode('day')
              }} 
              onAppointmentClick={handleAppointmentClick} 
            />
          )}
        </CardContent>
      </Card>

      <AppointmentDialog
        key={selectedAppointment?.id || 'new'}
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
