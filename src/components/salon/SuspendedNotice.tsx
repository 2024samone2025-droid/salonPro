// Shown by the (app) server layout in place of the app shell when the resolved
// salon's status is SUSPENDED. The authenticated-app counterpart to requireAuth's
// 403: the salon's own people are told plainly and pointed at how to restore
// service. (The public booking surface masks suspension as a generic 404 instead.)
export default function SuspendedNotice({ salonName }: { salonName?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-card-foreground">
        <h1 className="text-xl font-semibold">Account suspended</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {salonName ? `${salonName}'s` : 'This salon’s'} access to SalonPro is
          currently paused, so the app is unavailable. No data has been removed.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          To restore service, please contact SalonPro support at{' '}
          <a href="mailto:support@salonpro.me" className="text-foreground underline">
            support@salonpro.me
          </a>
          .
        </p>
      </div>
    </div>
  )
}
