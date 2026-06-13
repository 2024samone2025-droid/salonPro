import { NextRequest, NextResponse } from 'next/server'
import { getSubdomainLabel, SALON_SUBDOMAIN_HEADER } from '@/lib/subdomain'

// Production: salonpro.me. Dev: localhost:3000. The Host header is matched
// against this to extract the tenant subdomain label (see lib/subdomain.ts).
const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'localhost:3000'

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl

  // The public booking surface resolves its tenant from the path param
  // (/book/[subdomain], /api/public/booking/[subdomain]) — leave it untouched.
  if (pathname.startsWith('/book/') || pathname.startsWith('/api/public/')) {
    return NextResponse.next()
  }

  // STAGE 1: extract the tenant label from the Host (edge-safe, no DB).
  let subdomain = getSubdomainLabel(req.headers.get('host'), ROOT_DOMAIN)

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
