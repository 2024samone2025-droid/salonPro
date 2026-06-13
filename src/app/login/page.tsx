import { headers } from 'next/headers'
import { SALON_SUBDOMAIN_HEADER } from '@/lib/subdomain'
import { AuthProvider } from '@/lib/auth-context'
import UnifiedLogin from './UnifiedLogin'

// One unified, email-first login on every host. The tenant subdomain (set by the
// middleware as x-salon-subdomain) is passed down so a tenant host signs staff in
// against that salon; on the apex it's null (owner login + a link to the salon login).
export default async function LoginRoute() {
  const subdomain = (await headers()).get(SALON_SUBDOMAIN_HEADER)
  return (
    <AuthProvider>
      <UnifiedLogin subdomain={subdomain} />
    </AuthProvider>
  )
}
