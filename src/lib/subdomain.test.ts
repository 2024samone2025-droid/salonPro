import { describe, it, expect } from 'vitest'
import { rootCookieDomain } from './subdomain'

const ROOTS = ['salonpro.me']
const DEV_ROOTS = ['localhost:3000']

describe('rootCookieDomain', () => {
  it('returns the apex for the apex host and any subdomain under it', () => {
    expect(rootCookieDomain('salonpro.me', ROOTS)).toBe('salonpro.me')
    expect(rootCookieDomain('demo.salonpro.me', ROOTS)).toBe('salonpro.me')
    expect(rootCookieDomain('www.salonpro.me', ROOTS)).toBe('salonpro.me')
  })

  it('gives login (apex) and logout (subdomain) the SAME domain — the bug fix', () => {
    // Login sets the picker cookie at the apex; logout runs on the tenant subdomain.
    // Both must resolve to the same Domain or the logout clear can never match.
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
