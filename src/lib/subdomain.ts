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
 * Extract the tenant subdomain label from a Host header, or null when the host
 * carries no tenant (apex domain, www, a reserved/system label, or anything
 * that doesn't sit under ROOT_DOMAIN). Ports are ignored on both sides so this
 * works for `salonA.salonpro.me` in prod and `salonA.localhost:3000` in dev.
 */
export function getSubdomainLabel(host: string | null | undefined, rootDomain: string): string | null {
  if (!host) return null

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
