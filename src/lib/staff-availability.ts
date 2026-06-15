// Per-stylist weekly working hours, stored in Staff.availability (Json column).
// Always read through parseStaffAvailability(). A null result means "unset" — the
// stylist follows the salon's business hours with no override (the default).
//
// The booking engine intersects this with the salon business hours: a slot is
// offered only if it falls within BOTH. Keyed to the Staff roster entry (the
// bookable entity), not the User account.

import type { DayHours, BusinessHours } from './salon-settings'

// Same shape as salon business hours: keys '0'..'6' (0 = Sunday).
export type StaffAvailability = Record<string, DayHours>

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function isValidDay(d: unknown): d is DayHours {
  if (!d || typeof d !== 'object') return false
  const day = d as Record<string, unknown>
  return (
    typeof day.closed === 'boolean' &&
    typeof day.open === 'string' &&
    typeof day.close === 'string' &&
    TIME_RE.test(day.open) &&
    TIME_RE.test(day.close)
  )
}

// Parse a raw blob into a complete week, or null if unset/incomplete (→ follow salon hours).
export function parseStaffAvailability(raw: unknown): StaffAvailability | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  const out: StaffAvailability = {}
  for (let i = 0; i <= 6; i++) {
    const day = s[String(i)]
    // Treat any incomplete/invalid week as unset rather than guessing.
    if (!isValidDay(day)) return null
    out[String(i)] = { open: day.open, close: day.close, closed: day.closed }
  }
  return out
}

// Validate a full-week availability payload from the client. Returns an error string or null.
export function validateStaffAvailability(av: unknown): string | null {
  if (!av || typeof av !== 'object') return 'Availability must be a full week'
  const s = av as Record<string, unknown>
  const labels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  for (let i = 0; i <= 6; i++) {
    const day = s[String(i)]
    if (!isValidDay(day)) return `Invalid hours for ${labels[i]}`
    if (!day.closed && day.open >= day.close) {
      return `${labels[i]}: opening time must be before closing time`
    }
  }
  return null
}

// Seed a custom-hours template from the salon's business hours, so the editor
// starts from the salon's defaults rather than a blank week.
export function availabilityFromBusinessHours(hours: BusinessHours): StaffAvailability {
  const out: StaffAvailability = {}
  for (let i = 0; i <= 6; i++) {
    const d = hours[String(i)]
    out[String(i)] = d ? { ...d } : { open: '08:00', close: '18:00', closed: false }
  }
  return out
}
