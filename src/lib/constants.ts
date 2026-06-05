export const STATUS_CONFIG = {
  booked: {
    label: 'Booked',
    color: 'blue',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-600 dark:text-blue-400',
    borderClass: 'border-blue-500/20 dark:border-blue-500/30',
    dotClass: 'bg-blue-500',
    accentBorderClass: 'border-l-blue-500',
    cardBg: 'bg-blue-500/8',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 dark:border-blue-500/30'
  },
  confirmed: {
    label: 'Confirmed',
    color: 'emerald',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    borderClass: 'border-emerald-500/20 dark:border-emerald-500/30',
    dotClass: 'bg-emerald-500',
    accentBorderClass: 'border-l-emerald-500',
    cardBg: 'bg-emerald-500/8',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30'
  },
  in_progress: {
    label: 'In Progress',
    color: 'amber',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-600 dark:text-amber-400',
    borderClass: 'border-amber-500/20 dark:border-amber-500/30',
    dotClass: 'bg-amber-500',
    accentBorderClass: 'border-l-amber-500',
    cardBg: 'bg-amber-500/8',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30'
  },
  completed: {
    label: 'Completed',
    color: 'zinc',
    bgClass: 'bg-muted',
    textClass: 'text-muted-foreground',
    borderClass: 'border-muted-foreground/20',
    dotClass: 'bg-muted-foreground',
    accentBorderClass: 'border-l-muted-foreground',
    cardBg: 'bg-muted/80',
    badgeClass: 'bg-muted text-muted-foreground border-transparent'
  },
  no_show: {
    label: 'No Show',
    color: 'red',
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-600 dark:text-red-400',
    borderClass: 'border-red-500/20 dark:border-red-500/30',
    dotClass: 'bg-red-500',
    accentBorderClass: 'border-l-red-500',
    cardBg: 'bg-red-500/8',
    badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 dark:border-red-500/30'
  },
} as const

export const PAYMENT_STATUS_CONFIG = {
  unpaid: {
    label: 'Unpaid',
    badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 dark:border-red-500/30'
  },
  partially_paid: {
    label: 'Partial',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30'
  },
  paid: {
    label: 'Paid',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30'
  }
} as const

export type AppointmentStatus = keyof typeof STATUS_CONFIG
export type PaymentStatus = keyof typeof PAYMENT_STATUS_CONFIG
