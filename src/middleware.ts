import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  const url = req.nextUrl
  const pathname = url.pathname

  // Allow signup page and API routes for salon creation without salon context
  if (pathname === '/signup' || pathname === '/api/salons' || pathname === '/api/seed') {
    return NextResponse.next()
  }

  // For API routes, set subdomain header for lookup in API handlers
  // Note: We don't query DB here because middleware runs in edge runtime
  if (pathname.startsWith('/api/')) {
    const subdomain = url.searchParams.get('salon')
    if (subdomain) {
      const response = NextResponse.next()
      response.headers.set('x-salon-subdomain', subdomain)
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}