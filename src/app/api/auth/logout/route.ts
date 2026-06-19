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

function extractHost(req: NextRequest): string {
  return (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0].trim()
}

function setClearCookieHeaders(
  res: Pick<NextResponse, 'cookies'>,
  host: string,
) {
  const domain = rootCookieDomain(host)
  const rootExpire = domain ? { ...EXPIRE, domain } : EXPIRE
  res.cookies.set('salonpro_session', '', EXPIRE)
  res.cookies.set(ROOT_STAFF_COOKIE, '', rootExpire)
  res.cookies.set(ROOT_OWNER_COOKIE, '', rootExpire)
}

export async function POST(req: NextRequest) {
  const host = extractHost(req)
  const response = NextResponse.json({ message: 'Logged out successfully' })
  setClearCookieHeaders(response, host)
  return response
}

// GET handler for the redirect-based logout flow. Client-side logout computes
// the apex URL and redirects the browser here so the root picker cookies can
// be cleared on the same origin that set them. Then redirects to /login.
// IMPORTANT: cookie-clearing headers are set directly on the redirect response
// (not on a separate JSON response), because NextResponse.redirect() creates a
// brand-new response object. The redirect won't carry cookies from another one.
export async function GET(req: NextRequest) {
  const host = extractHost(req)
  const { pathname } = req.nextUrl
  const loginDest = pathname.endsWith('/logout') ? '/login' : '/'
  const redirect = NextResponse.redirect(new URL(loginDest, req.url))
  setClearCookieHeaders(redirect, host)
  return redirect
}
