import { NextRequest, NextResponse } from 'next/server'
import { ROOT_OWNER_COOKIE, ROOT_STAFF_COOKIE } from '@/lib/auth'
import { rootCookieDomain } from '@/lib/subdomain'

// Clear ALL session cookies, not just the per-host app session. The apex picker
// cookies (root-staff / root-owner) outlive a salon session and, if left behind,
// let the /login restore effect silently re-mint a session via the handoff — the
// "auto re-login after logout" bug.
//
// Those picker cookies are set at the APEX during login, but logout runs on the
// TENANT subdomain — and a host-only apex cookie cannot be cleared from a subdomain.
// So we clear them with the SAME apex Domain they're now set with (rootCookieDomain),
// which a subdomain CAN reach. On localhost (no usable Domain) the apex and tenant
// share one host, so a host-only clear still works there.
const EXPIRE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 0, // expire immediately
  path: '/',
}

export async function POST(req: NextRequest) {
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0].trim()
  const domain = rootCookieDomain(host)
  // To delete a cookie the browser matches name + Domain + Path, so the picker
  // cookies must be cleared with the same Domain they were set with.
  const rootExpire = domain ? { ...EXPIRE, domain } : EXPIRE

  const response = NextResponse.json({ message: 'Logged out successfully' })
  response.cookies.set('salonpro_session', '', EXPIRE) // per-tenant session: host-only
  response.cookies.set(ROOT_STAFF_COOKIE, '', rootExpire)
  response.cookies.set(ROOT_OWNER_COOKIE, '', rootExpire)
  return response
}
