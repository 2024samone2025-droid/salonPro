import React from 'react'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { SALON_SUBDOMAIN_HEADER } from '@/lib/subdomain'
import AppShell from './AppShell'

// Server layer: resolve the tenant from the Host BEFORE any auth. An unknown
// subdomain (or no tenant context at all) 404s here, so the client shell only
// ever renders for a real salon. The actual auth gate is in AppShell (client).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const subdomain = (await headers()).get(SALON_SUBDOMAIN_HEADER)
  if (!subdomain) notFound()

  const salon = await db.salon.findUnique({ where: { subdomain }, select: { id: true } })
  if (!salon) notFound()

  return <AppShell>{children}</AppShell>
}
