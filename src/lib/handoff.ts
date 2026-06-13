import type { NextRequest } from 'next/server'
import { SALON_SUBDOMAIN_HEADER } from './subdomain'

/**
 * Cross-subdomain owner handoff — REQUEST-relative, never env-driven.
 *
 * The exchange URL must land on whatever apex the request actually arrived on
 * (salonpro.me in prod, localhost:3000 in dev, any preview host), so we derive
 * the apex + scheme from the request instead of a static ROOT_DOMAIN env var
 * that silently drifts. Proxy forwarding headers win; we also strip a tenant
 * label if a handoff is ever built from a subdomain host, so we never produce
 * `sub.sub.apex`.
 */
export function requestOrigin(req: NextRequest): { scheme: string; apex: string } {
  const scheme =
    req.headers.get('x-forwarded-proto')?.split(',')[0].trim() ||
    req.nextUrl.protocol.replace(/:$/, '') ||
    'http'
  let host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0].trim()
  const label = req.headers.get(SALON_SUBDOMAIN_HEADER)
  if (label && host.toLowerCase().startsWith(`${label.toLowerCase()}.`)) {
    host = host.slice(label.length + 1)
  }
  return { scheme, apex: host }
}

/** Build the single-use owner handoff URL on the target salon's subdomain. */
export function buildExchangeUrl(req: NextRequest, salonSubdomain: string, token: string): string {
  const { scheme, apex } = requestOrigin(req)
  return `${scheme}://${salonSubdomain}.${apex}/api/auth/exchange?t=${encodeURIComponent(token)}`
}
