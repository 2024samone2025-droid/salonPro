import type { NextRequest } from 'next/server'
import { resolveApex } from './subdomain'

/**
 * Cross-subdomain owner handoff URL.
 *
 * The apex is AUTHORITATIVE from the configured ROOT_DOMAIN(s) — we match the
 * request's host against the configured roots to find which apex it belongs to,
 * then hang the target salon's subdomain off that. This is the only correct way
 * to know the apex: you cannot tell whether `a.b.salonpro.me` means apex
 * `salonpro.me` or `b.salonpro.me` from the host alone. Deriving it from the
 * request (and stripping a label) produced `sub.sub.apex` whenever the tenant
 * couldn't be resolved.
 *
 * Only the SCHEME comes from the request, since http/https and proxy termination
 * genuinely vary per environment.
 */
function requestScheme(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-proto')?.split(',')[0].trim() ||
    req.nextUrl.protocol.replace(/:$/, '') ||
    'http'
  )
}

export function buildExchangeUrl(req: NextRequest, salonSubdomain: string, token: string): string {
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0].trim()
  const apex = resolveApex(host)
  if (!apex) {
    // Fail loud: a host arrived that matches no configured ROOT_DOMAIN. Silently
    // defaulting (the old bug) shipped dead cross-subdomain links to localhost.
    throw new Error(
      `Cannot build handoff URL: host "${host}" matches no configured ROOT_DOMAIN. ` +
        `Set ROOT_DOMAIN to the apex you serve (comma-separated for multiple, e.g. "localhost:3000,salonpro.me").`
    )
  }
  const scheme = requestScheme(req)
  return `${scheme}://${salonSubdomain}.${apex}/api/auth/exchange?t=${encodeURIComponent(token)}`
}
