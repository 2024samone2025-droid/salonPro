import { headers } from 'next/headers'
import { SALON_SUBDOMAIN_HEADER } from '@/lib/subdomain'
import StaffLogin from './StaffLogin'
import OwnerLogin from './OwnerLogin'

// Host-branched login: a tenant host (x-salon-subdomain present) shows the staff
// name+PIN login; the root host shows the owner email/password login + picker.
export default async function LoginRoute() {
  const subdomain = (await headers()).get(SALON_SUBDOMAIN_HEADER)
  return subdomain ? <StaffLogin /> : <OwnerLogin />
}
