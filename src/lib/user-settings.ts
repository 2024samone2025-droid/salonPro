// Per-user personal settings stored in User.settings / Owner.settings (Json column).
// Always read through parseUserSettings() so missing/partial blobs fall back to defaults.
//
// Scope is deliberately narrow: we only persist settings the app can actually honor
// today — profile (pure display data), theme (full theming system), and the default
// calendar view. Other preferences (landing view, time/date format, first day of week)
// are deferred until their read-sites are wired, to avoid shipping dead toggles.

export type Theme = 'light' | 'dark' | 'system'
export type CalendarView = 'day' | 'week'

export interface UserProfile {
  jobTitle: string
  bio: string
  photoUrl: string // URL only (no upload infra yet)
}

export interface UserAppPreferences {
  theme: Theme
  calendarDefaultView: CalendarView
}

export interface UserSettings {
  profile: UserProfile
  appPreferences: UserAppPreferences
}

export const THEMES: Theme[] = ['light', 'dark', 'system']
export const CALENDAR_VIEWS: CalendarView[] = ['day', 'week']

export const PROFILE_TEXT_MAX = 80
export const BIO_MAX = 280
export const PHOTO_URL_MAX = 300

export const DEFAULT_USER_SETTINGS: UserSettings = {
  profile: { jobTitle: '', bio: '', photoUrl: '' },
  appPreferences: { theme: 'system', calendarDefaultView: 'day' },
}

function cleanStr(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

function normalizeUrl(v: string): string {
  const t = v.trim()
  if (!t) return ''
  return /^https?:\/\//i.test(t) ? t : `https://${t}`
}

function isValidUrl(v: string): boolean {
  return /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v)
}

function urlStr(v: unknown, max: number): string {
  return typeof v === 'string' ? normalizeUrl(v).slice(0, max) : ''
}

// Parse a raw Json blob (or null) into complete, valid user settings.
export function parseUserSettings(raw: unknown): UserSettings {
  const out: UserSettings = {
    profile: { ...DEFAULT_USER_SETTINGS.profile },
    appPreferences: { ...DEFAULT_USER_SETTINGS.appPreferences },
  }
  if (!raw || typeof raw !== 'object') return out
  const s = raw as Record<string, unknown>

  if (s.profile && typeof s.profile === 'object') {
    const p = s.profile as Record<string, unknown>
    out.profile = {
      jobTitle: cleanStr(p.jobTitle, PROFILE_TEXT_MAX),
      bio: cleanStr(p.bio, BIO_MAX),
      photoUrl: urlStr(p.photoUrl, PHOTO_URL_MAX),
    }
  }

  if (s.appPreferences && typeof s.appPreferences === 'object') {
    const a = s.appPreferences as Record<string, unknown>
    if (THEMES.includes(a.theme as Theme)) out.appPreferences.theme = a.theme as Theme
    if (CALENDAR_VIEWS.includes(a.calendarDefaultView as CalendarView)) {
      out.appPreferences.calendarDefaultView = a.calendarDefaultView as CalendarView
    }
  }

  return out
}

// Validate a settings patch from the client. Returns an error string or null.
export function validateUserSettingsPatch(patch: Partial<UserSettings>): string | null {
  if (patch.profile) {
    const p = patch.profile
    if (p.jobTitle !== undefined && p.jobTitle.length > PROFILE_TEXT_MAX) {
      return `Job title is too long (max ${PROFILE_TEXT_MAX} characters)`
    }
    if (p.bio !== undefined && p.bio.length > BIO_MAX) {
      return `Bio is too long (max ${BIO_MAX} characters)`
    }
    if (p.photoUrl) {
      if (p.photoUrl.length > PHOTO_URL_MAX) {
        return `Photo URL is too long (max ${PHOTO_URL_MAX} characters)`
      }
      if (!isValidUrl(normalizeUrl(p.photoUrl))) return 'Photo URL is not a valid URL'
    }
  }
  if (patch.appPreferences) {
    const a = patch.appPreferences
    if (a.theme !== undefined && !THEMES.includes(a.theme)) {
      return 'Unsupported theme'
    }
    if (a.calendarDefaultView !== undefined && !CALENDAR_VIEWS.includes(a.calendarDefaultView)) {
      return 'Unsupported calendar view'
    }
  }
  return null
}
