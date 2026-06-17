'use client'

import { useEffect } from 'react'
import ErrorState from '@/components/salon/ErrorState'

// Boundary for the public booking page. Keeps the same calm, branded surface a
// customer sees elsewhere instead of a white screen, and offers a retry.
export default function BookingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Booking page error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <ErrorState
        message="We couldn't load this booking page. Please try again."
        onRetry={reset}
      />
    </div>
  )
}
