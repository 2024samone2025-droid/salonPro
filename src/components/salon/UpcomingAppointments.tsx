'use client'

import { useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { CalendarClock } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import EmptyState from '@/components/salon/EmptyState'
import { useMoney } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import { STATUS_CONFIG, type AppointmentStatus } from '@/lib/constants'

export interface UpcomingAppointment {
  id: string
  date: string // YYYY-MM-DD
  startTime: string
  endTime: string
  status: string
  customer: { name: string }
  staff: { name: string }
  service: { name: string; price: number }
}

const WEEK_LENGTH = 7

export default function UpcomingAppointments({
  today,
  appointments,
}: {
  today: string
  appointments: UpcomingAppointment[]
}) {
  const formatRWF = useMoney()
  const [selected, setSelected] = useState(today)

  const byDate = new Map<string, UpcomingAppointment[]>()
  for (const apt of appointments) {
    const list = byDate.get(apt.date)
    if (list) list.push(apt)
    else byDate.set(apt.date, [apt])
  }

  const days = Array.from({ length: WEEK_LENGTH }, (_, i) => {
    const date = format(addDays(parseISO(today), i), 'yyyy-MM-dd')
    return { date, count: byDate.get(date)?.length ?? 0 }
  })

  const selectedAppts = byDate.get(selected) ?? []
  const selectedLabel = format(parseISO(selected), 'EEE, MMM d')

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-[15px] font-medium">Upcoming appointments</CardTitle>
        <CardDescription className="text-xs">
          {selectedAppts.length} on {selectedLabel}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {/* Week strip */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const isSelected = d.date === selected
            return (
              <button
                key={d.date}
                onClick={() => setSelected(d.date)}
                className={cn(
                  'flex flex-col items-center rounded-md py-1.5 transition-colors',
                  isSelected
                    ? 'bg-accent text-accent-contrast'
                    : 'text-foreground hover:bg-muted'
                )}
              >
                <span
                  className={cn(
                    'text-[10px] uppercase',
                    isSelected ? 'text-accent-contrast/80' : 'text-muted-foreground'
                  )}
                >
                  {format(parseISO(d.date), 'EEE')}
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {format(parseISO(d.date), 'd')}
                </span>
                <span
                  className={cn(
                    'mt-0.5 size-1 rounded-full',
                    d.count === 0
                      ? 'bg-transparent'
                      : isSelected
                        ? 'bg-accent-contrast/80'
                        : 'bg-foreground/30'
                  )}
                  aria-hidden="true"
                />
              </button>
            )
          })}
        </div>

        {/* Selected day's appointments */}
        {selectedAppts.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            message="Nothing booked this day"
            className="border-0 bg-transparent p-4"
          />
        ) : (
          <ScrollArea className="max-h-80 flex-1">
            <div className="space-y-2">
              {selectedAppts.map((apt) => {
                const cfg = STATUS_CONFIG[apt.status as AppointmentStatus]
                return (
                  <div
                    key={apt.id}
                    className="flex items-center gap-2.5 rounded-sm border-hairline border-border bg-surface p-2.5"
                  >
                    <span
                      className={cn('size-2 shrink-0 rounded-full', cfg?.dotClass ?? 'bg-muted-foreground')}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-foreground">{apt.customer.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {apt.service.name} · {apt.staff.name}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[13px] font-medium text-foreground tabular-nums">
                        {formatRWF(apt.service.price)}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {apt.startTime}–{apt.endTime}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
