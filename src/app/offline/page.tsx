import { WifiOff } from 'lucide-react'

// Served by the service worker when a navigation fails with no network. Kept
// static and dependency-light so it caches cleanly at install time. No "use
// client" / no data fetching — it must render with zero network.
export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 text-center">
        <div className="mb-3 inline-flex size-11 items-center justify-center rounded-xl bg-muted">
          <WifiOff className="size-5 text-muted-foreground" />
        </div>
        <h1 className="text-lg font-semibold">You&apos;re offline</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          SalonPro needs a connection for this page. Check your network and try again —
          your work is safe.
        </p>
      </div>
    </div>
  )
}
