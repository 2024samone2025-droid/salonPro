import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  /** Short, plain-language headline. Never a status code or exception text. */
  title?: string
  /** One calm sentence: what happened + what to do next. */
  message?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

// The single error surface for the app: data-load failures, thrown views
// (error.tsx boundaries), and the public booking flow all render this so a
// failure always looks and behaves the same. Neutral tone — no pink, no raw
// error text.
export default function ErrorState({
  title = 'Something went wrong',
  message = 'We hit a snag on our end. Please try again.',
  onRetry,
  retryLabel = 'Try again',
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center px-4 py-16 text-center', className)}
    >
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-muted">
        <AlertTriangle className="size-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-xs text-[13px] text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry} className="mt-4">
          <RefreshCw className="size-3.5" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </div>
  )
}
