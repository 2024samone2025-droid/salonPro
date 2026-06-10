import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatCardTone = 'accent' | 'success' | 'warning' | 'info' | 'neutral'

const chipTones: Record<StatCardTone, string> = {
  accent: 'bg-accent-deep text-accent',
  success: 'bg-status-completed-bg text-status-completed-fg',
  warning: 'bg-status-progress-bg text-status-progress-fg',
  info: 'bg-status-booked-bg text-status-booked-fg',
  neutral: 'bg-muted text-muted-foreground',
}

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: ReactNode
  context?: ReactNode
  tone?: StatCardTone
  onClick?: () => void
  className?: string
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  context,
  tone = 'neutral',
  onClick,
  className,
}: StatCardProps) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'rounded-lg border-hairline border-border bg-card p-4 text-left',
        onClick && 'cursor-pointer transition-colors hover:bg-card/80',
        className
      )}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <span
          className={cn(
            'inline-flex size-7 shrink-0 items-center justify-center rounded-sm',
            chipTones[tone]
          )}
        >
          <Icon className="size-[15px]" aria-hidden="true" />
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-[26px] font-medium leading-none text-foreground tabular-nums">{value}</p>
      {context !== undefined && (
        <p className="mt-1.5 text-xs text-ink-faint">{context}</p>
      )}
    </Comp>
  )
}
