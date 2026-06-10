import BookingFlow from '@/components/booking/BookingFlow'

export default async function BookPage({
  params,
}: {
  params: Promise<{ subdomain: string }>
}) {
  const { subdomain } = await params
  return <BookingFlow subdomain={subdomain} />
}
