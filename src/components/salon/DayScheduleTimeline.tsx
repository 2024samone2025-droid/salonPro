'use client'

import { cn } from '@/lib/utils'
import { STATUS_CONFIG, type AppointmentStatus } from '@/lib/constants'

export interface TimelineAppointment {
  id: string
  startTime: string
  endTime: string
  status: string
  customer: { name: string }
  staff: { id: string; name: string }
  service: { name: string }
}

// Layout constants (positioning only — colours/radii come from tokens).
const HOUR_HEIGHT = 56 // px per hour row
const MIN_BLOCK_HEIGHT = 26 // keep short appointments legible
const GUTTER_WIDTH = 56 // time-label column
const COLUMN_MIN_WIDTH = 148 // per-stylist column before horizontal scroll

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

interface PositionedAppointment extends TimelineAppointment {
  start: number
  end: number
  lane: number
}

/**
 * Pack a column's appointments into lanes so overlapping ones sit side by side
 * rather than on top of each other. Greedy: each appointment takes the first
 * lane whose previous appointment has already ended.
 */
function packLanes(appts: TimelineAppointment[]): {
  items: PositionedAppointment[]
  laneCount: number
} {
  const sorted = appts
    .map((a) => {
      const start = toMinutes(a.startTime)
      return { ...a, start, end: Math.max(toMinutes(a.endTime), start + 5), lane: 0 }
    })
    .sort((a, b) => a.start - b.start || a.end - b.end)

  const laneEnds: number[] = []
  for (const item of sorted) {
    let placed = false
    for (let i = 0; i < laneEnds.length; i++) {
      if (item.start >= laneEnds[i]) {
        item.lane = i
        laneEnds[i] = item.end
        placed = true
        break
      }
    }
    if (!placed) {
      item.lane = laneEnds.length
      laneEnds.push(item.end)
    }
  }
  return { items: sorted, laneCount: Math.max(laneEnds.length, 1) }
}

export default function DayScheduleTimeline({
  appointments,
}: {
  appointments: TimelineAppointment[]
}) {
  // One column per stylist who has appointments today.
  const byStaff = new Map<string, { id: string; name: string; appts: TimelineAppointment[] }>()
  for (const apt of appointments) {
    const key = apt.staff.id || apt.staff.name
    const existing = byStaff.get(key)
    if (existing) existing.appts.push(apt)
    else byStaff.set(key, { id: key, name: apt.staff.name, appts: [apt] })
  }
  const columns = Array.from(byStaff.values()).sort((a, b) => a.name.localeCompare(b.name))

  // Vertical range derived from the day's appointments (clamped to whole hours).
  const starts = appointments.map((a) => toMinutes(a.startTime))
  const ends = appointments.map((a) => toMinutes(a.endTime))
  const rangeStartHour = Math.floor(Math.min(...starts) / 60)
  const rangeEndHour = Math.max(Math.ceil(Math.max(...ends) / 60), rangeStartHour + 1)
  const rangeStart = rangeStartHour * 60
  const bodyHeight = (rangeEndHour - rangeStartHour) * HOUR_HEIGHT
  const hours = Array.from({ length: rangeEndHour - rangeStartHour + 1 }, (_, i) => rangeStartHour + i)

  const innerMinWidth = GUTTER_WIDTH + columns.length * COLUMN_MIN_WIDTH

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: innerMinWidth }}>
        {/* Stylist column headers */}
        <div className="flex border-b-hairline border-border">
          <div className="shrink-0" style={{ width: GUTTER_WIDTH }} />
          {columns.map((col) => (
            <div
              key={col.id}
              className="flex-1 truncate border-l-hairline border-border/60 px-2 py-2 text-xs font-medium text-foreground"
              style={{ minWidth: COLUMN_MIN_WIDTH }}
            >
              {col.name}
              <span className="ml-1 text-muted-foreground tabular-nums">{col.appts.length}</span>
            </div>
          ))}
        </div>

        {/* Timeline body */}
        <div className="flex" style={{ height: bodyHeight }}>
          {/* Time gutter */}
          <div className="relative shrink-0" style={{ width: GUTTER_WIDTH }}>
            {hours.map((hour, i) => (
              <span
                key={hour}
                className="absolute right-1.5 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
                style={{ top: i * HOUR_HEIGHT }}
              >
                {formatHour(hour)}
              </span>
            ))}
          </div>

          {/* Columns + shared hour gridlines */}
          <div className="relative flex flex-1">
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              {hours.map((hour, i) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t-hairline border-border/50"
                  style={{ top: i * HOUR_HEIGHT }}
                />
              ))}
            </div>

            {columns.map((col) => {
              const { items, laneCount } = packLanes(col.appts)
              const laneWidth = 100 / laneCount
              return (
                <div
                  key={col.id}
                  className="relative flex-1 border-l-hairline border-border/60"
                  style={{ minWidth: COLUMN_MIN_WIDTH }}
                >
                  {items.map((apt) => {
                    const cfg = STATUS_CONFIG[apt.status as AppointmentStatus]
                    const top = ((apt.start - rangeStart) / 60) * HOUR_HEIGHT
                    const height = Math.max(
                      ((apt.end - apt.start) / 60) * HOUR_HEIGHT,
                      MIN_BLOCK_HEIGHT
                    )
                    return (
                      <div
                        key={apt.id}
                        title={`${apt.startTime}–${apt.endTime} · ${apt.service.name} · ${apt.customer.name} · ${cfg?.label ?? apt.status}`}
                        className={cn(
                          'absolute overflow-hidden rounded-sm border-l-2 px-1.5 py-1',
                          cfg?.cardBg ?? 'bg-muted',
                          cfg?.accentBorderClass ?? 'border-l-border'
                        )}
                        style={{
                          top,
                          height,
                          left: `calc(${apt.lane * laneWidth}% + 2px)`,
                          width: `calc(${laneWidth}% - 4px)`,
                        }}
                      >
                        <p className="truncate text-[11px] font-medium leading-tight text-foreground">
                          {apt.service.name}
                        </p>
                        <p className="truncate text-[10px] leading-tight text-muted-foreground">
                          {apt.customer.name}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
