// Salon-level settings stored in Salon.settings (Json column).
// Always read through parseSalonSettings() so missing/partial blobs fall back to defaults.

export interface DayHours {
  open: string // 'HH:mm'
  close: string // 'HH:mm'
  closed: boolean
}

// Keyed 0–6 like Date.getDay(): 0 = Sunday
export type BusinessHours = Record<string, DayHours>

export interface SalonAddress {
  street: string
  city: string
  district: string
  country: string
}

export interface SalonSocialLinks {
  instagram: string
  facebook: string
  tiktok: string
  whatsapp: string
}

// Business-profile fields. All strings, default '' — pure display data
// (shown to staff/customers); no engine behind them.
export interface SalonProfile {
  logoUrl: string // URL only (no upload infra yet)
  phone: string
  websiteUrl: string
  address: SalonAddress
  socialLinks: SalonSocialLinks
  tinNumber: string // Rwanda Tax Identification Number
  licenseNumber: string
}

// Customer-facing online-booking rules. Applied to the public booking surface
// (slot generation + public booking POST), NOT the internal front-desk route.
export interface BookingRules {
  minLeadTimeHours: number // earliest a customer can book, relative to now
  maxAdvanceDays: number // furthest into the future a customer can book
  bufferBeforeMinutes: number // required free gap before each appointment
  bufferAfterMinutes: number // required free gap after each appointment
}

export interface SalonSettings {
  profile: SalonProfile
  businessHours: BusinessHours
  bookingRules: BookingRules
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

export const DEFAULT_PROFILE: SalonProfile = {
  logoUrl: '',
  phone: '',
  websiteUrl: '',
  address: { street: '', city: '', district: '', country: '' },
  socialLinks: { instagram: '', facebook: '', tiktok: '', whatsapp: '' },
  tinNumber: '',
  licenseNumber: '',
}

// Defaults preserve current behaviour: no lead-time/buffers, a generous advance window.
export const DEFAULT_BOOKING_RULES: BookingRules = {
  minLeadTimeHours: 0,
  maxAdvanceDays: 365,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
}

export const DEFAULT_SETTINGS: SalonSettings = {
  profile: {
    ...DEFAULT_PROFILE,
    address: { ...DEFAULT_PROFILE.address },
    socialLinks: { ...DEFAULT_PROFILE.socialLinks },
  },
  businessHours: {
    '0': { ...DEFAULT_DAY },
    '1': { ...DEFAULT_DAY },
    '2': { ...DEFAULT_DAY },
    '3': { ...DEFAULT_DAY },
    '4': { ...DEFAULT_DAY },
    '5': { ...DEFAULT_DAY },
    '6': { ...DEFAULT_DAY },
  },
  bookingRules: { ...DEFAULT_BOOKING_RULES },
  slotIntervalMinutes: 30,
  publicBookingEnabled: true,
  currency: 'RWF',
}

// Booking-rule field bounds (shared by parse-clamp and write-time validation).
export const BOOKING_RULE_BOUNDS = {
  minLeadTimeHours: { min: 0, max: 720 }, // up to 30 days
  maxAdvanceDays: { min: 1, max: 365 },
  bufferBeforeMinutes: { min: 0, max: 120 },
  bufferAfterMinutes: { min: 0, max: 120 },
} as const

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

// Max lengths for free-text profile fields (kept generous; URLs longer than text).
export const PROFILE_TEXT_MAX = 120
export const PROFILE_URL_MAX = 300

function cleanStr(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

// Prepend https:// when the user omits the scheme (e.g. "instagram.com/x").
function normalizeUrl(v: string): string {
  const t = v.trim()
  if (!t) return ''
  return /^https?:\/\//i.test(t) ? t : `https://${t}`
}

// A normalized URL needs a scheme, a dotted host, and no whitespace.
function isValidUrl(v: string): boolean {
  return /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v)
}

// Sanitize a URL field: trim, auto-prepend scheme, then cap length.
function urlStr(v: unknown, max: number): string {
  return typeof v === 'string' ? normalizeUrl(v).slice(0, max) : ''
}

// Parse a raw profile blob into a complete, sanitized SalonProfile.
function parseProfile(raw: unknown): SalonProfile {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const addr = (p.address && typeof p.address === 'object' ? p.address : {}) as Record<string, unknown>
  const social = (p.socialLinks && typeof p.socialLinks === 'object' ? p.socialLinks : {}) as Record<string, unknown>
  return {
    logoUrl: urlStr(p.logoUrl, PROFILE_URL_MAX),
    phone: cleanStr(p.phone, PROFILE_TEXT_MAX),
    websiteUrl: urlStr(p.websiteUrl, PROFILE_URL_MAX),
    address: {
      street: cleanStr(addr.street, PROFILE_TEXT_MAX),
      city: cleanStr(addr.city, PROFILE_TEXT_MAX),
      district: cleanStr(addr.district, PROFILE_TEXT_MAX),
      country: cleanStr(addr.country, PROFILE_TEXT_MAX),
    },
    socialLinks: {
      instagram: urlStr(social.instagram, PROFILE_URL_MAX),
      facebook: urlStr(social.facebook, PROFILE_URL_MAX),
      tiktok: urlStr(social.tiktok, PROFILE_URL_MAX),
      whatsapp: cleanStr(social.whatsapp, PROFILE_TEXT_MAX),
    },
    tinNumber: cleanStr(p.tinNumber, PROFILE_TEXT_MAX),
    licenseNumber: cleanStr(p.licenseNumber, PROFILE_TEXT_MAX),
  }
}

// Coerce a value to an integer within [min, max], falling back to a default.
function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

function parseBookingRules(raw: unknown): BookingRules {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const b = BOOKING_RULE_BOUNDS
  return {
    minLeadTimeHours: clampInt(r.minLeadTimeHours, b.minLeadTimeHours.min, b.minLeadTimeHours.max, DEFAULT_BOOKING_RULES.minLeadTimeHours),
    maxAdvanceDays: clampInt(r.maxAdvanceDays, b.maxAdvanceDays.min, b.maxAdvanceDays.max, DEFAULT_BOOKING_RULES.maxAdvanceDays),
    bufferBeforeMinutes: clampInt(r.bufferBeforeMinutes, b.bufferBeforeMinutes.min, b.bufferBeforeMinutes.max, DEFAULT_BOOKING_RULES.bufferBeforeMinutes),
    bufferAfterMinutes: clampInt(r.bufferAfterMinutes, b.bufferAfterMinutes.min, b.bufferAfterMinutes.max, DEFAULT_BOOKING_RULES.bufferAfterMinutes),
  }
}

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
    profile: parseProfile(null),
    businessHours: { ...DEFAULT_SETTINGS.businessHours },
    bookingRules: { ...DEFAULT_BOOKING_RULES },
  }
  if (!raw || typeof raw !== 'object') return out
  const s = raw as Record<string, unknown>

  out.profile = parseProfile(s.profile)
  out.bookingRules = parseBookingRules(s.bookingRules)

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
  if (patch.profile) {
    const p = patch.profile
    // URL fields, when provided, must resolve to a valid URL once normalized
    // (the scheme is auto-prepended, so "instagram.com/x" is accepted).
    const urlFields: [string, string | undefined, number][] = [
      ['Logo URL', p.logoUrl, PROFILE_URL_MAX],
      ['Website URL', p.websiteUrl, PROFILE_URL_MAX],
      ['Instagram link', p.socialLinks?.instagram, PROFILE_URL_MAX],
      ['Facebook link', p.socialLinks?.facebook, PROFILE_URL_MAX],
      ['TikTok link', p.socialLinks?.tiktok, PROFILE_URL_MAX],
    ]
    for (const [label, value, max] of urlFields) {
      if (!value) continue
      if (value.length > max) return `${label} is too long (max ${max} characters)`
      if (!isValidUrl(normalizeUrl(value))) return `${label} is not a valid URL`
    }
    // Free-text fields: enforce length at write time (parse also caps on read).
    const textFields: [string, string | undefined][] = [
      ['Phone', p.phone],
      ['WhatsApp number', p.socialLinks?.whatsapp],
      ['TIN', p.tinNumber],
      ['License number', p.licenseNumber],
      ['Street', p.address?.street],
      ['City', p.address?.city],
      ['District', p.address?.district],
      ['Country', p.address?.country],
    ]
    for (const [label, value] of textFields) {
      if (value && value.length > PROFILE_TEXT_MAX) {
        return `${label} is too long (max ${PROFILE_TEXT_MAX} characters)`
      }
    }
  }
  if (patch.businessHours) {
    for (let i = 0; i <= 6; i++) {
      const day = patch.businessHours[String(i)]
      if (!isValidDay(day)) return `Invalid hours for ${DAY_LABELS[i]}`
      if (!day.closed && day.open >= day.close) {
        return `${DAY_LABELS[i]}: opening time must be before closing time`
      }
    }
  }
  if (patch.bookingRules) {
    const r = patch.bookingRules
    const checks: [string, number | undefined, { min: number; max: number }][] = [
      ['Minimum lead time (hours)', r.minLeadTimeHours, BOOKING_RULE_BOUNDS.minLeadTimeHours],
      ['Maximum advance (days)', r.maxAdvanceDays, BOOKING_RULE_BOUNDS.maxAdvanceDays],
      ['Buffer before (minutes)', r.bufferBeforeMinutes, BOOKING_RULE_BOUNDS.bufferBeforeMinutes],
      ['Buffer after (minutes)', r.bufferAfterMinutes, BOOKING_RULE_BOUNDS.bufferAfterMinutes],
    ]
    for (const [label, value, bound] of checks) {
      if (value === undefined) continue
      if (!Number.isFinite(value) || !Number.isInteger(value)) {
        return `${label} must be a whole number`
      }
      if (value < bound.min || value > bound.max) {
        return `${label} must be between ${bound.min} and ${bound.max}`
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
