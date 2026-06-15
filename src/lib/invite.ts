import crypto from 'crypto'
import type { NextRequest } from 'next/server'
import { resolveApex } from './subdomain'

// Mirrors handoff.ts: ONLY the scheme comes from the request; the apex is
// authoritative from the configured ROOT_DOMAIN(s).
function requestScheme(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-proto')?.split(',')[0].trim() ||
    req.nextUrl.protocol.replace(/:$/, '') ||
    'http'
  )
}

/** 256-bit URL-safe random token — the ONLY security boundary. Shown once. */
export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/** sha256 hex of the raw token. Only this is ever persisted. */
export function hashInviteToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

/**
 * Full accept-invite URL on the tenant's OWN host (mirrors buildExchangeUrl):
 *   https://<subdomain>.<apex>/accept-invite?token=<raw>
 */
export function buildAcceptUrl(req: NextRequest, salonSubdomain: string, rawToken: string): string {
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0].trim()
  const apex = resolveApex(host)
  if (!apex) {
    throw new Error(
      `Cannot build accept URL: host "${host}" matches no configured ROOT_DOMAIN. ` +
        `Set ROOT_DOMAIN to the apex you serve (comma-separated for multiple, e.g. "localhost:3000,salonpro.me").`
    )
  }
  return `${requestScheme(req)}://${salonSubdomain}.${apex}/accept-invite?token=${encodeURIComponent(rawToken)}`
}

/**
 * Normalize a phone number to E.164. A leading + with country code passes
 * through; a bare/0-prefixed number defaults to Rwanda (+250). Returns null when
 * it can't produce a plausible E.164 number. No external dependency — the market
 * is East Africa with a Rwanda default. Both forms canonicalize identically
 * (e.g. '0788123456' and '+250788123456' → '+250788123456') so input-format
 * differences can't cause a self-lockout.
 */
export function normalizePhone(input: string): string | null {
  const trimmed = String(input || '').trim()
  if (!trimmed) return null
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '')
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null
  }
  const local = trimmed.replace(/\D/g, '').replace(/^0+/, '')
  return local.length >= 7 && local.length <= 12 ? `+250${local}` : null
}

/**
 * Constant-time string equality. Both sides are hashed to a fixed 32-byte
 * digest first, so there is no length leak and timingSafeEqual never throws.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a, 'utf8').digest()
  const hb = crypto.createHash('sha256').update(b, 'utf8').digest()
  return crypto.timingSafeEqual(ha, hb)
}
