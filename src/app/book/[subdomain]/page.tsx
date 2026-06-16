import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import BookingFlow from '@/components/booking/BookingFlow'

export default async function BookPage({
  params,
}: {
  params: Promise<{ subdomain: string }>
}) {
  const { subdomain } = await params

  // Status-first gate at the page level: a SUSPENDED (or unknown) salon renders the
  // generic 404 rather than the booking UI — no suspended-state leak to the public.
  const salon = await db.salon.findUnique({ where: { subdomain }, select: { status: true } })
  if (!salon || salon.status === 'SUSPENDED') notFound()

  return <BookingFlow subdomain={subdomain} />
}
