import { headers } from 'next/headers'
import { SALON_SUBDOMAIN_HEADER } from '@/lib/subdomain'
import { AuthProvider } from '@/lib/auth-context'
import UnifiedLogin from './UnifiedLogin'

// One unified, email-first login on every host. The tenant subdomain (set by the
// middleware as x-salon-subdomain) is passed down so the staff PIN path knows
// which salon it's on; on the apex it's null and staff are routed to their host.
export default async function LoginRoute() {
  const subdomain = (await headers()).get(SALON_SUBDOMAIN_HEADER)
  return (
    <AuthProvider>
      <UnifiedLogin subdomain={subdomain} />
    </AuthProvider>
  )
}
