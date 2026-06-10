export const STATUS_CONFIG = {
  booked: {
    label: 'Booked',
    color: 'info',
    bgClass: 'bg-info/10',
    textClass: 'text-info',
    borderClass: 'border-info/20',
    dotClass: 'bg-info',
    accentBorderClass: 'border-l-info',
    cardBg: 'bg-info/[0.08]',
    badgeClass: 'bg-info/10 text-info border-info/20',
    chartColor: 'hsl(var(--info))',
  },
  confirmed: {
    label: 'Confirmed',
    color: 'success',
    bgClass: 'bg-success/10',
    textClass: 'text-success',
    borderClass: 'border-success/20',
    dotClass: 'bg-success',
    accentBorderClass: 'border-l-success',
    cardBg: 'bg-success/[0.08]',
    badgeClass: 'bg-success/10 text-success border-success/20',
    chartColor: 'hsl(var(--success))',
  },
  in_progress: {
    label: 'In Progress',
    color: 'warning',
    bgClass: 'bg-warning/10',
    textClass: 'text-warning',
    borderClass: 'border-warning/20',
    dotClass: 'bg-warning',
    accentBorderClass: 'border-l-warning',
    cardBg: 'bg-warning/[0.08]',
    badgeClass: 'bg-warning/10 text-warning border-warning/20',
    chartColor: 'hsl(var(--warning))',
  },
  completed: {
    label: 'Completed',
    color: 'muted',
    bgClass: 'bg-muted',
    textClass: 'text-muted-foreground',
    borderClass: 'border-muted-foreground/20',
    dotClass: 'bg-muted-foreground',
    accentBorderClass: 'border-l-muted-foreground',
    cardBg: 'bg-muted/80',
    badgeClass: 'bg-muted text-muted-foreground border-transparent',
    chartColor: 'hsl(var(--muted-foreground))',
  },
  no_show: {
    label: 'No Show',
    color: 'destructive',
    bgClass: 'bg-destructive/10',
    textClass: 'text-destructive',
    borderClass: 'border-destructive/20',
    dotClass: 'bg-destructive',
    accentBorderClass: 'border-l-destructive',
    cardBg: 'bg-destructive/[0.08]',
    badgeClass: 'bg-destructive/10 text-destructive border-destructive/20',
    chartColor: 'hsl(var(--destructive))',
  },
} as const

export const PAYMENT_STATUS_CONFIG = {
  unpaid: {
    label: 'Unpaid',
    badgeClass: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  partially_paid: {
    label: 'Partial',
    badgeClass: 'bg-warning/10 text-warning border-warning/20',
  },
  paid: {
    label: 'Paid',
    badgeClass: 'bg-success/10 text-success border-success/20',
  },
} as const

export type AppointmentStatus = keyof typeof STATUS_CONFIG
export type PaymentStatus = keyof typeof PAYMENT_STATUS_CONFIG
