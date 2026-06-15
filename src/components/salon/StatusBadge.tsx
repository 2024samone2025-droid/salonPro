import { cn } from '@/lib/utils'
import {
  STATUS_CONFIG,
  PAYMENT_STATUS_CONFIG,
  type AppointmentStatus,
  type PaymentStatus,
} from '@/lib/constants'

const pillClasses =
  'inline-flex items-center whitespace-nowrap rounded-full px-2 py-[3px] text-caption leading-none'

export default function StatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  const config = STATUS_CONFIG[status as AppointmentStatus]
  return (
    <span
      className={cn(pillClasses, config?.badgeClass ?? 'bg-muted text-muted-foreground', className)}
    >
      {config?.label ?? status}
    </span>
  )
}

export function PaymentBadge({ status, className }: { status: string; className?: string }) {
  const config = PAYMENT_STATUS_CONFIG[status as PaymentStatus]
  return (
    <span
      className={cn(pillClasses, config?.badgeClass ?? 'bg-muted text-muted-foreground', className)}
    >
      {config?.label ?? status}
    </span>
  )
}
