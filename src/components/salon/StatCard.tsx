import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatCardTone = 'accent' | 'success' | 'warning' | 'info' | 'neutral'

const chipTones: Record<StatCardTone, string> = {
  accent: 'bg-accent-tint text-accent-tint-fg',
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
  /** Signed percent change vs a prior period. `null`/omitted hides the chip. */
  delta?: number | null
  /** Tooltip on the delta chip naming the baseline, e.g. "vs last week". */
  deltaLabel?: string
  onClick?: () => void
  className?: string
}

function DeltaChip({ pct, label }: { pct: number; label?: string }) {
  const up = pct > 0
  const flat = Math.round(pct) === 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span
      title={label ? `${up ? '+' : ''}${Math.round(pct)}% ${label}` : undefined}
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums',
        flat
          ? 'bg-muted text-muted-foreground'
          : up
            ? 'bg-status-completed-bg text-status-completed-fg'
            : 'bg-status-noshow-bg text-status-noshow-fg'
      )}
    >
      {!flat && <Icon className="size-3" aria-hidden="true" />}
      {Math.abs(Math.round(pct))}%
    </span>
  )
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  context,
  tone = 'neutral',
  delta,
  deltaLabel,
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
      <div className="flex items-center justify-between gap-2">
        <p className="text-[26px] font-medium leading-none text-foreground tabular-nums">{value}</p>
        {typeof delta === 'number' && <DeltaChip pct={delta} label={deltaLabel} />}
      </div>
      {context !== undefined && (
        <p className="mt-1.5 text-xs text-muted-foreground">{context}</p>
      )}
    </Comp>
  )
}
