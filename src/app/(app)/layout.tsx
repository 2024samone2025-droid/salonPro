import React from 'react'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { SALON_SUBDOMAIN_HEADER } from '@/lib/subdomain'
import AppShell from './AppShell'
import SuspendedNotice from '@/components/salon/SuspendedNotice'

// Server layer: resolve the tenant from the Host BEFORE any auth, so the client
// shell only ever renders for a real salon. Two distinct outcomes:
//   - No tenant context (apex / www / bare localhost): this is a real app route
//     that simply lacks a salon to scope to — send it to /login, which on the
//     root host shows the owner login + salon picker. Never a dead-end 404.
//   - A subdomain that resolves to no salon: genuinely not served by us -> 404.
// The actual auth gate is in AppShell (client).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const subdomain = (await headers()).get(SALON_SUBDOMAIN_HEADER)
  if (!subdomain) redirect('/login')

  const salon = await db.salon.findUnique({ where: { subdomain }, select: { id: true, name: true, status: true } })
  if (!salon) notFound()

  // Suspended tenants get the notice in place of the app shell — the page-load
  // counterpart to requireAuth's 403 for API calls. Caught here, before AppShell
  // (and its data fetches) ever mount.
  if (salon.status === 'SUSPENDED') return <SuspendedNotice salonName={salon.name} />

  return <AppShell>{children}</AppShell>
}
