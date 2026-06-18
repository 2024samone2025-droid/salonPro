import { describe, it, expect, beforeEach } from 'vitest'
import {
  getRootDomains,
  getSubdomainLabel,
  resolveApex,
  rootCookieDomain,
  SALON_SUBDOMAIN_HEADER,
} from './subdomain'

const ROOTS = ['salonpro.me']
const DEV_ROOTS = ['localhost:3000']
const MULTI_ROOTS = ['salonpro.me', 'localhost:3000']

// Preserve the original env so other tests aren't affected
const ORIGINAL_ROOT_DOMAIN = process.env.ROOT_DOMAIN
const ORIGINAL_NODE_ENV = process.env.NODE_ENV

beforeEach(() => {
  // Restore defaults before each test
  process.env.ROOT_DOMAIN = ORIGINAL_ROOT_DOMAIN
  process.env.NODE_ENV = ORIGINAL_NODE_ENV
})

describe('SALON_SUBDOMAIN_HEADER', () => {
  it('is the expected header name', () => {
    expect(SALON_SUBDOMAIN_HEADER).toBe('x-salon-subdomain')
  })
})

describe('getRootDomains', () => {
  it('parses comma-separated ROOT_DOMAIN env var', () => {
    process.env.ROOT_DOMAIN = 'salonpro.me,example.com'
    process.env.NODE_ENV = 'production'
    expect(getRootDomains()).toEqual(['salonpro.me', 'example.com'])
  })

  it('strips trailing dots and trims whitespace', () => {
    process.env.ROOT_DOMAIN = '  salonpro.me. , example.com  '
    process.env.NODE_ENV = 'production'
    expect(getRootDomains()).toEqual(['salonpro.me', 'example.com'])
  })

  it('lowercases the domain', () => {
    process.env.ROOT_DOMAIN = 'SalonPro.Me'
    process.env.NODE_ENV = 'production'
    expect(getRootDomains()).toEqual(['salonpro.me'])
  })

  it('filters out empty entries from extra commas', () => {
    process.env.ROOT_DOMAIN = 'salonpro.me,,example.com,'
    process.env.NODE_ENV = 'production'
    expect(getRootDomains()).toEqual(['salonpro.me', 'example.com'])
  })

  it('returns localhost:3000 fallback in non-production when ROOT_DOMAIN is unset', () => {
    process.env.ROOT_DOMAIN = ''
    process.env.NODE_ENV = 'development'
    expect(getRootDomains()).toEqual(['localhost:3000'])
  })

  it('returns empty array in production when ROOT_DOMAIN is unset', () => {
    process.env.ROOT_DOMAIN = ''
    process.env.NODE_ENV = 'production'
    expect(getRootDomains()).toEqual([])
  })

  it('returns localhost:3000 fallback in test environment when ROOT_DOMAIN is unset', () => {
    process.env.ROOT_DOMAIN = ''
    process.env.NODE_ENV = 'test'
    expect(getRootDomains()).toEqual(['localhost:3000'])
  })
})

describe('getSubdomainLabel', () => {
  it('extracts a single tenant label under a real domain', () => {
    expect(getSubdomainLabel('mysalon.salonpro.me', ROOTS)).toBe('mysalon')
  })

  it('extracts a tenant label with hyphen', () => {
    expect(getSubdomainLabel('my-salon.salonpro.me', ROOTS)).toBe('my-salon')
  })

  it('returns null for the apex (no subdomain)', () => {
    expect(getSubdomainLabel('salonpro.me', ROOTS)).toBeNull()
  })

  it('returns null for www subdomain', () => {
    expect(getSubdomainLabel('www.salonpro.me', ROOTS)).toBeNull()
  })

  it('returns null for null/undefined host', () => {
    expect(getSubdomainLabel(null, ROOTS)).toBeNull()
    expect(getSubdomainLabel(undefined, ROOTS)).toBeNull()
  })

  it('returns null for a reserved subdomain (api, admin, etc.)', () => {
    expect(getSubdomainLabel('api.salonpro.me', ROOTS)).toBeNull()
    expect(getSubdomainLabel('admin.salonpro.me', ROOTS)).toBeNull()
    expect(getSubdomainLabel('billing.salonpro.me', ROOTS)).toBeNull()
    expect(getSubdomainLabel('blog.salonpro.me', ROOTS)).toBeNull()
  })

  it('allows "demo" as a legitimate tenant (not reserved)', () => {
    expect(getSubdomainLabel('demo.salonpro.me', ROOTS)).toBe('demo')
  })

  it('returns null for multi-label subdomain (a.b.salonpro.me)', () => {
    expect(getSubdomainLabel('a.b.salonpro.me', ROOTS)).toBeNull()
  })

  it('works with localhost subdomains in dev', () => {
    expect(getSubdomainLabel('demo.localhost:3000', DEV_ROOTS)).toBe('demo')
  })

  it('works with port numbers on real domains', () => {
    expect(getSubdomainLabel('mysalon.salonpro.me:8080', ROOTS)).toBe('mysalon')
  })

  it('matches against multiple roots if provided', () => {
    expect(getSubdomainLabel('mysalon.salonpro.me', MULTI_ROOTS)).toBe('mysalon')
    expect(getSubdomainLabel('demo.localhost:3000', MULTI_ROOTS)).toBe('demo')
  })

  it('returns null when no root matches', () => {
    expect(getSubdomainLabel('mysalon.other.com', ROOTS)).toBeNull()
  })

  it('accepts a single string root (not array)', () => {
    expect(getSubdomainLabel('mysalon.salonpro.me', 'salonpro.me')).toBe('mysalon')
  })

  it('returns null for hosts not directly under the root', () => {
    // sub.domain.other.com does not end with .salonpro.me
    expect(getSubdomainLabel('mysalon.other.com', ROOTS)).toBeNull()
  })
})

describe('resolveApex', () => {
  it('returns the configured root for an apex host', () => {
    expect(resolveApex('salonpro.me', ROOTS)).toBe('salonpro.me')
  })

  it('returns the configured root for a www subdomain', () => {
    expect(resolveApex('www.salonpro.me', ROOTS)).toBe('salonpro.me')
  })

  it('returns the configured root for a tenant subdomain', () => {
    expect(resolveApex('mysalon.salonpro.me', ROOTS)).toBe('salonpro.me')
  })

  it('returns the configured root for localhost subdomain with port', () => {
    expect(resolveApex('demo.localhost:3000', DEV_ROOTS)).toBe('localhost:3000')
  })

  it('returns null for null/undefined host', () => {
    expect(resolveApex(null, ROOTS)).toBeNull()
    expect(resolveApex(undefined, ROOTS)).toBeNull()
  })

  it('returns null when no root matches', () => {
    expect(resolveApex('mysalon.other.com', ROOTS)).toBeNull()
  })

  it('matches the first matching root in a multi-root config', () => {
    expect(resolveApex('demo.localhost:3000', MULTI_ROOTS)).toBe('localhost:3000')
  })

  it('preserves the port in the returned apex', () => {
    expect(resolveApex('demo.localhost:3000', DEV_ROOTS)).toBe('localhost:3000')
  })
})

describe('rootCookieDomain', () => {
  it('returns the apex for the apex host and any subdomain under it', () => {
    expect(rootCookieDomain('salonpro.me', ROOTS)).toBe('salonpro.me')
    expect(rootCookieDomain('demo.salonpro.me', ROOTS)).toBe('salonpro.me')
    expect(rootCookieDomain('www.salonpro.me', ROOTS)).toBe('salonpro.me')
  })

  it('gives login (apex) and logout (subdomain) the SAME domain — the bug fix', () => {
    const atLogin = rootCookieDomain('salonpro.me', ROOTS)
    const atLogout = rootCookieDomain('demo.salonpro.me', ROOTS)
    expect(atLogout).toBe(atLogin)
  })

  it('returns undefined on localhost / single-label / IP (Domain= not usable)', () => {
    expect(rootCookieDomain('localhost:3000', DEV_ROOTS)).toBeUndefined()
    expect(rootCookieDomain('demo.localhost:3000', DEV_ROOTS)).toBeUndefined()
    expect(rootCookieDomain('127.0.0.1:3000', ['127.0.0.1:3000'])).toBeUndefined()
  })

  it('returns undefined when the host matches no configured root', () => {
    expect(rootCookieDomain('evil.com', ROOTS)).toBeUndefined()
    expect(rootCookieDomain(null, ROOTS)).toBeUndefined()
  })
})
