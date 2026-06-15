import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  message: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export default function EmptyState({
  icon: Icon,
  message,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-lg border-hairline border-dashed border-line-strong bg-card p-5 text-center',
        className
      )}
    >
      <Icon className="mx-auto size-[22px] text-ink-faint" aria-hidden="true" />
      <p className="mt-2 text-body text-muted-foreground">{message}</p>
      {actionLabel && onAction && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onAction}
          className="mt-2.5 border-accent/30 text-accent hover:bg-accent/10 hover:text-accent"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
