import { NextResponse } from 'next/server'
import { ROOT_OWNER_COOKIE, ROOT_STAFF_COOKIE } from '@/lib/auth'

// Clear ALL session cookies, not just the per-host app session. The apex picker
// cookies (root-staff / root-owner) outlive a salon session and, if left behind,
// let the /login restore effect silently re-mint a session via the handoff —
// the "auto re-login after logout" bug. In dev the apex and a tenant share the
// same localhost host (the ?salon= query doesn't scope cookies), so all three
// can coexist on one host; clear them together.
const EXPIRE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 0, // expire immediately
  path: '/',
}

export async function POST() {
  const response = NextResponse.json({ message: 'Logged out successfully' })
  response.cookies.set('salonpro_session', '', EXPIRE)
  response.cookies.set(ROOT_STAFF_COOKIE, '', EXPIRE)
  response.cookies.set(ROOT_OWNER_COOKIE, '', EXPIRE)
  return response
}
