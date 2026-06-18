import { NextRequest, NextResponse } from 'next/server'
import { ROOT_OWNER_COOKIE, ROOT_STAFF_COOKIE } from '@/lib/auth'
import { rootCookieDomain } from '@/lib/subdomain'

// The apex picker cookies (root-staff / root-owner) outlive a salon session and,
// if left behind, let the /login restore effect silently re-mint a session via
// the handoff — the "auto re-login after logout" bug.
//
// NORMAL FLOW (POST): called from the tenant subdomain. The session cookie is
// host-scoped and can be cleared directly. The root picker cookies are scoped to
// the registrable apex via Domain= (see rootCookieDomain), so a subdomain CAN
// clear them — EXCEPT on localhost where Domain= is rejected. For localhost we
// rely on the browser being redirected to the apex (GET flow below).
//
// REDIRECT FLOW (GET): called after the browser navigates to the apex logout
// endpoint (computed by the client logout()). This ensures host-only root cookies
// set on the apex are cleared on the same origin — the only reliable way for
// localhost where Domain= can't be used. After clearing, redirects to /login.
const EXPIRE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 0,
  path: '/',
}

function clearCookies(req: NextRequest): NextResponse {
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0].trim()
  const domain = rootCookieDomain(host)
  const rootExpire = domain ? { ...EXPIRE, domain } : EXPIRE

  const res = NextResponse.json({ message: 'Logged out successfully' })
  res.cookies.set('salonpro_session', '', EXPIRE)
  res.cookies.set(ROOT_STAFF_COOKIE, '', rootExpire)
  res.cookies.set(ROOT_OWNER_COOKIE, '', rootExpire)
  return res
}

export async function POST(_req: NextRequest) {
  return clearCookies(_req)
}

// GET handler for the redirect-based logout flow. Client-side logout computes
// the apex URL and redirects the browser here so the root picker cookies can
// be cleared on the same origin that set them. Then redirects to /login.
export async function GET(req: NextRequest) {
  const response = clearCookies(req)
  // Override the JSON body with a redirect to login on the same host
  const { pathname } = req.nextUrl
  const loginDest = pathname.endsWith('/logout') ? '/login' : '/'
  return NextResponse.redirect(new URL(loginDest, req.url))
}
