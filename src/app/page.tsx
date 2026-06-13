import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { SALON_SUBDOMAIN_HEADER } from '@/lib/subdomain'
import LandingPage from '@/components/marketing/LandingPage'

// The root path is host-branched:
//   - Apex / www (no subdomain): public marketing landing page.
//   - A subdomain that resolves to a real salon: that tenant's home -> /dashboard
//     (the app shell then bounces to /login if there's no session).
//   - A subdomain that resolves to no salon: not served by us -> 404.
// This keeps marketing on the apex only; a tenant host never shows it, and a
// bogus subdomain 404s instead of leaking the landing page.
export default async function Home() {
  const subdomain = (await headers()).get(SALON_SUBDOMAIN_HEADER)
  if (!subdomain) return <LandingPage />

  const salon = await db.salon.findUnique({ where: { subdomain }, select: { id: true } })
  if (!salon) notFound()

  redirect('/dashboard')
}
