'use client'

import { useEffect } from 'react'
import ErrorState from '@/components/salon/ErrorState'

// Segment boundary for the authenticated app: a thrown view renders this in
// place of the page, INSIDE the shell (sidebar + tab bar stay), so a crash is
// recoverable without a full reload. The raw error is logged, never shown.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App route error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <ErrorState
        message="We couldn't load this page. Please try again."
        onRetry={reset}
      />
    </div>
  )
}
