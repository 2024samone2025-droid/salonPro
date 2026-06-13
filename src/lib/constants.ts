export const STATUS_CONFIG = {
  booked: {
    label: 'Booked',
    color: 'booked',
    bgClass: 'bg-status-booked-bg',
    textClass: 'text-status-booked-fg',
    borderClass: 'border-status-booked-fg/20',
    dotClass: 'bg-status-booked-fg',
    accentBorderClass: 'border-l-status-booked-fg',
    cardBg: 'bg-status-booked-bg/40',
    badgeClass: 'bg-status-booked-bg text-status-booked-fg border-transparent',
    chartColor: 'hsl(var(--status-booked-fg))',
  },
  confirmed: {
    label: 'Confirmed',
    color: 'confirmed',
    bgClass: 'bg-status-confirmed-bg',
    textClass: 'text-status-confirmed-fg',
    borderClass: 'border-status-confirmed-fg/20',
    dotClass: 'bg-status-confirmed-fg',
    accentBorderClass: 'border-l-status-confirmed-fg',
    cardBg: 'bg-status-confirmed-bg/40',
    badgeClass: 'bg-status-confirmed-bg text-status-confirmed-fg border-transparent',
    chartColor: 'hsl(var(--status-confirmed-fg))',
  },
  in_progress: {
    label: 'In progress',
    color: 'progress',
    bgClass: 'bg-status-progress-bg',
    textClass: 'text-status-progress-fg',
    borderClass: 'border-status-progress-fg/20',
    dotClass: 'bg-status-progress-fg',
    accentBorderClass: 'border-l-status-progress-fg',
    cardBg: 'bg-status-progress-bg/40',
    badgeClass: 'bg-status-progress-bg text-status-progress-fg border-transparent',
    chartColor: 'hsl(var(--status-progress-fg))',
  },
  completed: {
    label: 'Completed',
    color: 'completed',
    bgClass: 'bg-status-completed-bg',
    textClass: 'text-status-completed-fg',
    borderClass: 'border-status-completed-fg/20',
    dotClass: 'bg-status-completed-fg',
    accentBorderClass: 'border-l-status-completed-fg',
    cardBg: 'bg-status-completed-bg/40',
    badgeClass: 'bg-status-completed-bg text-status-completed-fg border-transparent',
    chartColor: 'hsl(var(--status-completed-fg))',
  },
  no_show: {
    label: 'No show',
    color: 'noshow',
    bgClass: 'bg-status-noshow-bg',
    textClass: 'text-status-noshow-fg',
    borderClass: 'border-status-noshow-fg/20',
    dotClass: 'bg-status-noshow-fg',
    accentBorderClass: 'border-l-status-noshow-fg',
    cardBg: 'bg-status-noshow-bg/40',
    badgeClass: 'bg-status-noshow-bg text-status-noshow-fg border-transparent',
    chartColor: 'hsl(var(--status-noshow-fg))',
  },
} as const

export const PAYMENT_STATUS_CONFIG = {
  unpaid: {
    label: 'Unpaid',
    badgeClass: 'bg-status-noshow-bg text-status-noshow-fg border-transparent',
  },
  partial: {
    label: 'Partial',
    badgeClass: 'bg-status-progress-bg text-status-progress-fg border-transparent',
  },
  paid: {
    label: 'Paid',
    badgeClass: 'bg-status-confirmed-bg text-status-confirmed-fg border-transparent',
  },
} as const

export type AppointmentStatus = keyof typeof STATUS_CONFIG
export type PaymentStatus = keyof typeof PAYMENT_STATUS_CONFIG

/* ──────────────────────────────────────────────────────────────────────────
 * Subdomain rules — single source of truth for signup (client + API).
 * This module is client-safe (no server imports), so the signup page, the
 * availability endpoint, and the create endpoint all share these rules and
 * can never disagree. Documented in /context/DATA_MODELS.md.
 * ────────────────────────────────────────────────────────────────────────── */

export const SUBDOMAIN_MIN_LENGTH = 3
export const SUBDOMAIN_MAX_LENGTH = 30

// Reserved system/infra names that must never be claimed as a salon subdomain.
// NOTE: 'demo' is intentionally NOT reserved — it's a legitimate (seed) tenant
// and the uniqueness constraint already protects it.
export const RESERVED_SUBDOMAINS: ReadonlySet<string> = new Set([
  'www', 'api', 'app', 'admin', 'dashboard', 'mail', 'email', 'smtp', 'ftp',
  'ns1', 'ns2', 'cdn', 'assets', 'static', 'media', 'blog', 'status', 'docs',
  'help', 'support', 'signup', 'login', 'register', 'auth', 'account', 'billing',
  'settings', 'pricing', 'about', 'contact', 'salonpro', 'salon', 'root',
  'system', 'internal', 'staging', 'test',
])

// Start and end alphanumeric; hyphens allowed only in between.
const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

/**
 * Validate a subdomain against format, length, and reserved-name rules.
 * Normalizes (trim + lowercase) before checking. Returns the first failure.
 */
export function validateSubdomain(raw: string): { valid: boolean; error?: string } {
  const value = raw.trim().toLowerCase()
  if (value.length < SUBDOMAIN_MIN_LENGTH) {
    return { valid: false, error: `Must be at least ${SUBDOMAIN_MIN_LENGTH} characters` }
  }
  if (value.length > SUBDOMAIN_MAX_LENGTH) {
    return { valid: false, error: `Must be at most ${SUBDOMAIN_MAX_LENGTH} characters` }
  }
  if (!SUBDOMAIN_PATTERN.test(value)) {
    return { valid: false, error: 'Use lowercase letters, numbers, and hyphens (no leading or trailing hyphen)' }
  }
  if (RESERVED_SUBDOMAINS.has(value)) {
    return { valid: false, error: 'This subdomain is reserved' }
  }
  return { valid: true }
}
