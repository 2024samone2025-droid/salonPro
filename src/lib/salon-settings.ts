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

export interface SalonSettings {
  profile: SalonProfile
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

export const DEFAULT_PROFILE: SalonProfile = {
  logoUrl: '',
  phone: '',
  websiteUrl: '',
  address: { street: '', city: '', district: '', country: '' },
  socialLinks: { instagram: '', facebook: '', tiktok: '', whatsapp: '' },
  tinNumber: '',
  licenseNumber: '',
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
  slotIntervalMinutes: 30,
  publicBookingEnabled: true,
  currency: 'RWF',
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

// Max lengths for free-text profile fields (kept generous; URLs longer than text).
export const PROFILE_TEXT_MAX = 120
export const PROFILE_URL_MAX = 300

function cleanStr(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

function isHttpUrl(v: string): boolean {
  return /^https?:\/\/.+/i.test(v)
}

// Parse a raw profile blob into a complete, sanitized SalonProfile.
function parseProfile(raw: unknown): SalonProfile {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const addr = (p.address && typeof p.address === 'object' ? p.address : {}) as Record<string, unknown>
  const social = (p.socialLinks && typeof p.socialLinks === 'object' ? p.socialLinks : {}) as Record<string, unknown>
  return {
    logoUrl: cleanStr(p.logoUrl, PROFILE_URL_MAX),
    phone: cleanStr(p.phone, PROFILE_TEXT_MAX),
    websiteUrl: cleanStr(p.websiteUrl, PROFILE_URL_MAX),
    address: {
      street: cleanStr(addr.street, PROFILE_TEXT_MAX),
      city: cleanStr(addr.city, PROFILE_TEXT_MAX),
      district: cleanStr(addr.district, PROFILE_TEXT_MAX),
      country: cleanStr(addr.country, PROFILE_TEXT_MAX),
    },
    socialLinks: {
      instagram: cleanStr(social.instagram, PROFILE_URL_MAX),
      facebook: cleanStr(social.facebook, PROFILE_URL_MAX),
      tiktok: cleanStr(social.tiktok, PROFILE_URL_MAX),
      whatsapp: cleanStr(social.whatsapp, PROFILE_TEXT_MAX),
    },
    tinNumber: cleanStr(p.tinNumber, PROFILE_TEXT_MAX),
    licenseNumber: cleanStr(p.licenseNumber, PROFILE_TEXT_MAX),
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
  }
  if (!raw || typeof raw !== 'object') return out
  const s = raw as Record<string, unknown>

  out.profile = parseProfile(s.profile)

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
    // URL fields, when provided, must be absolute http(s) URLs.
    const urlFields: [string, string | undefined][] = [
      ['Logo URL', p.logoUrl],
      ['Website URL', p.websiteUrl],
      ['Instagram link', p.socialLinks?.instagram],
      ['Facebook link', p.socialLinks?.facebook],
      ['TikTok link', p.socialLinks?.tiktok],
    ]
    for (const [label, value] of urlFields) {
      if (value && !isHttpUrl(value)) {
        return `${label} must start with http:// or https://`
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
