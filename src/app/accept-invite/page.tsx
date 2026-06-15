import AcceptInviteForm from './AcceptInviteForm'

// Public, tenant-host page. The token comes from the query string; the form does
// the validity check + accept. No session required to reach this route.
export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  return <AcceptInviteForm token={token ?? ''} />
}
