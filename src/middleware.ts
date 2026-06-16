import { NextRequest, NextResponse } from 'next/server'
import { getRootDomains, getSubdomainLabel, SALON_SUBDOMAIN_HEADER } from '@/lib/subdomain'

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl

  // STAGE 0: the operator console. Its routes physically ship in this same
  // codebase, so on the TENANT deployment they must not exist at all. Default-
  // deny: 404 every /operator and /api/operator request unless OPERATOR_APP=1
  // (set ONLY on the dedicated operator deployment). 404, never 403 — the tenant
  // app must not even admit operator routes are there. This is the code half of
  // the gate; the operator project also sits behind Vercel auth / IP allowlist,
  // and requireOperator() re-checks host + SSO + allowlist on every request.
  if (pathname.startsWith('/operator') || pathname.startsWith('/api/operator')) {
    if (process.env.OPERATOR_APP !== '1') {
      return new NextResponse(null, { status: 404 })
    }
    // Allowed: the operator app resolves no tenant from the Host, so pass
    // through without an x-salon-subdomain header (it is not a salon surface).
    return NextResponse.next()
  }

  // The public booking surface resolves its tenant from the path param
  // (/book/[subdomain], /api/public/booking/[subdomain]) — leave it untouched.
  if (pathname.startsWith('/book/') || pathname.startsWith('/api/public/')) {
    return NextResponse.next()
  }

  // STAGE 1: extract the tenant label from the Host (edge-safe, no DB). The Host
  // is matched against the configured apex(es) — ROOT_DOMAIN, comma-separated.
  let subdomain = getSubdomainLabel(req.headers.get('host'), getRootDomains())

  // Dev-only fallback: a bare localhost has no subdomain, so allow ?salon=.
  // Never honoured in production — there the Host is the only authority.
  if (!subdomain && process.env.NODE_ENV !== 'production') {
    const param = searchParams.get('salon')
    if (param) subdomain = param.trim().toLowerCase()
  }

  // No tenant context (apex / www / marketing) — pass through without a header.
  // The (app) layout will notFound() if a tenant-only route is reached this way.
  if (!subdomain) {
    return NextResponse.next()
  }

  // Forward the resolved label to Node via REQUEST headers — the only channel
  // server components and route handlers can read (response headers don't reach
  // them). The authoritative subdomain -> salon lookup happens there.
  const headers = new Headers(req.headers)
  headers.set(SALON_SUBDOMAIN_HEADER, subdomain)
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
