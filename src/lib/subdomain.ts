import { RESERVED_SUBDOMAINS } from './constants'

/**
 * Tenant resolution — STAGE 1 (edge-safe, no DB).
 *
 * The middleware runs in the edge runtime and cannot touch Prisma, so it only
 * extracts the subdomain *label* from the Host header. The Node side (the (app)
 * layout, requireAuth, /api/auth/me) does the authoritative `subdomain -> salon`
 * lookup. This module is intentionally pure (constants only) so it can be
 * imported from both the edge middleware and Node code.
 */

// Request header the middleware uses to forward the resolved label downstream.
export const SALON_SUBDOMAIN_HEADER = 'x-salon-subdomain'

/**
 * The configured apex domain(s) — the single source of truth for "what's the
 * apex". ROOT_DOMAIN is a COMMA-SEPARATED list so one deployment can serve
 * several apexes at once (e.g. `localhost:3000,salonpro.me`): handy for testing
 * the real domain locally via /etc/hosts without flipping config.
 *
 * Outside production an unset value falls back to the dev default. In production
 * an unset value yields an EMPTY list on purpose — callers that build tenant
 * URLs fail loudly rather than silently emitting `localhost` links (the bug that
 * sent salonpro.me handoffs to localhost:3000).
 */
export function getRootDomains(): string[] {
  const list = (process.env.ROOT_DOMAIN ?? '')
    .split(',')
    .map((d) => d.trim().toLowerCase().replace(/\.$/, ''))
    .filter(Boolean)
  if (list.length > 0) return list
  return process.env.NODE_ENV === 'production' ? [] : ['localhost:3000']
}

function labelUnderRoot(host: string, rootDomain: string): string | null {
  const hostName = host.split(':')[0].toLowerCase().replace(/\.$/, '')
  const rootName = rootDomain.split(':')[0].toLowerCase().replace(/\.$/, '')
  if (!hostName || !rootName) return null

  // Apex (salonpro.me) and www carry no tenant.
  if (hostName === rootName || hostName === `www.${rootName}`) return null

  // Must sit directly under the root domain.
  if (!hostName.endsWith(`.${rootName}`)) return null

  const label = hostName.slice(0, hostName.length - rootName.length - 1)

  // A salon is a single label; anything deeper (a.b.salonpro.me) is not a tenant.
  if (!label || label.includes('.')) return null

  // System/infra labels are never tenants (www, api, app, admin, …).
  if (RESERVED_SUBDOMAINS.has(label)) return null

  return label
}

/**
 * Extract the tenant subdomain label from a Host header, or null when the host
 * carries no tenant (apex domain, www, a reserved/system label, or anything
 * that doesn't sit under a configured root). Ports are ignored on both sides so
 * this works for `salonA.salonpro.me` in prod and `salonA.localhost:3000` in dev.
 * Accepts one root or a list; returns the first match.
 */
export function getSubdomainLabel(host: string | null | undefined, rootDomain: string | string[]): string | null {
  if (!host) return null
  const roots = Array.isArray(rootDomain) ? rootDomain : [rootDomain]
  for (const root of roots) {
    const label = labelUnderRoot(host, root)
    if (label) return label
  }
  return null
}

/**
 * Given a request Host, return the configured apex it belongs to — the value to
 * build sibling-subdomain URLs against (e.g. `mysalon.salonpro.me` → the
 * configured `salonpro.me`, port included). Returns null when no configured root
 * matches, so URL builders can fail loud instead of guessing.
 */
export function resolveApex(host: string | null | undefined, roots: string[] = getRootDomains()): string | null {
  if (!host) return null
  const hostName = host.split(':')[0].toLowerCase().replace(/\.$/, '')
  for (const root of roots) {
    const rootName = root.split(':')[0].toLowerCase().replace(/\.$/, '')
    if (!rootName) continue
    if (hostName === rootName || hostName === `www.${rootName}` || hostName.endsWith(`.${rootName}`)) {
      return root
    }
  }
  return null
}
