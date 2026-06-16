'use client'

import './globals.css'
import { AlertTriangle, RefreshCw } from 'lucide-react'

// Last-resort boundary: a crash in the ROOT layout lands here, so this renders
// its own <html>/<body> and can't lean on app providers, fonts, or the shared
// ErrorState. Kept deliberately self-contained and resilient. The raw error and
// digest are never shown to the user.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
          <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-muted">
            <AlertTriangle className="size-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium">Something went wrong</p>
          <p className="mt-1 max-w-xs text-[13px] text-muted-foreground">
            The app ran into an unexpected problem. Please try again.
          </p>
          <button
            onClick={() => reset()}
            className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-line-strong px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
