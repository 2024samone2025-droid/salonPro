// Salon-level settings stored in Salon.settings (Json column).
// Always read through parseSalonSettings() so missing/partial blobs fall back to defaults.

export interface DayHours {
  open: string // 'HH:mm'
  close: string // 'HH:mm'
  closed: boolean
}

// Keyed 0–6 like Date.getDay(): 0 = Sunday
export type BusinessHours = Record<string, DayHours>

export interface SalonSettings {
  businessHours: BusinessHours
  slotIntervalMinutes: 15 | 30 | 60
  publicBookingEnabled: boolean
  currency: SupportedCurrency
}

export type SupportedCurrency = 'RWF' | 'USD' | 'KES' | 'UGX'

export const SUPPORTED_CURRENCIES: { code: SupportedCurrency; label: string }[] = [
  { code: 'RWF', label: 'Rwandan Franc (RWF)' },
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'KES', label: 'Kenyan Shilling (KES)' },
  { code: 'UGX', label: 'Ugandan Shilling (UGX)' },
]

export const DAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

const DEFAULT_DAY: DayHours = { open: '08:00', close: '18:00', closed: false }

export const DEFAULT_SETTINGS: SalonSettings = {
  businessHours: {
    '0': { ...DEFAULT_DAY },
    '1': { ...DEFAULT_DAY },
    '2': { ...DEFAULT_DAY },
    '3': { ...DEFAULT_DAY },
    '4': { ...DEFAULT_DAY },
    '5': { ...DEFAULT_DAY },
    '6': { ...DEFAULT_DAY },
  },
  slotIntervalMinutes: 30,
  publicBookingEnabled: true,
  currency: 'RWF',
}

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

// Parse a raw Json blob (or null) into complete, valid settings.
export function parseSalonSettings(raw: unknown): SalonSettings {
  const out: SalonSettings = {
    ...DEFAULT_SETTINGS,
    businessHours: { ...DEFAULT_SETTINGS.businessHours },
  }
  if (!raw || typeof raw !== 'object') return out
  const s = raw as Record<string, unknown>

  if (s.businessHours && typeof s.businessHours === 'object') {
    for (let i = 0; i <= 6; i++) {
      const day = (s.businessHours as Record<string, unknown>)[String(i)]
      if (isValidDay(day)) out.businessHours[String(i)] = { ...day }
    }
  }
  if (s.slotIntervalMinutes === 15 || s.slotIntervalMinutes === 30 || s.slotIntervalMinutes === 60) {
    out.slotIntervalMinutes = s.slotIntervalMinutes
  }
  if (typeof s.publicBookingEnabled === 'boolean') {
    out.publicBookingEnabled = s.publicBookingEnabled
  }
  if (SUPPORTED_CURRENCIES.some((c) => c.code === s.currency)) {
    out.currency = s.currency as SupportedCurrency
  }
  return out
}

// Validate a settings payload from the client. Returns an error string or null.
export function validateSettingsPatch(patch: Partial<SalonSettings>): string | null {
  if (patch.businessHours) {
    for (let i = 0; i <= 6; i++) {
      const day = patch.businessHours[String(i)]
      if (!isValidDay(day)) return `Invalid hours for ${DAY_LABELS[i]}`
      if (!day.closed && day.open >= day.close) {
        return `${DAY_LABELS[i]}: opening time must be before closing time`
      }
    }
  }
  if (
    patch.slotIntervalMinutes !== undefined &&
    ![15, 30, 60].includes(patch.slotIntervalMinutes)
  ) {
    return 'Slot interval must be 15, 30, or 60 minutes'
  }
  if (
    patch.currency !== undefined &&
    !SUPPORTED_CURRENCIES.some((c) => c.code === patch.currency)
  ) {
    return 'Unsupported currency'
  }
  return null
}
