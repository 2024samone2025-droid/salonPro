export const STATUS_CONFIG = {
  booked: {
    label: 'Booked',
    color: 'booked',
    bgClass: 'bg-status-booked-bg',
    textClass: 'text-status-booked-fg',
    borderClass: 'border-status-booked-fg/20',
    dotClass: 'bg-status-booked-fg',
    accentBorderClass: 'border-l-status-booked-fg',
    cardBg: 'bg-status-booked-bg/40',
    badgeClass: 'bg-status-booked-bg text-status-booked-fg border-transparent',
    chartColor: 'hsl(var(--status-booked-fg))',
  },
  confirmed: {
    label: 'Confirmed',
    color: 'confirmed',
    bgClass: 'bg-status-confirmed-bg',
    textClass: 'text-status-confirmed-fg',
    borderClass: 'border-status-confirmed-fg/20',
    dotClass: 'bg-status-confirmed-fg',
    accentBorderClass: 'border-l-status-confirmed-fg',
    cardBg: 'bg-status-confirmed-bg/40',
    badgeClass: 'bg-status-confirmed-bg text-status-confirmed-fg border-transparent',
    chartColor: 'hsl(var(--status-confirmed-fg))',
  },
  in_progress: {
    label: 'In progress',
    color: 'progress',
    bgClass: 'bg-status-progress-bg',
    textClass: 'text-status-progress-fg',
    borderClass: 'border-status-progress-fg/20',
    dotClass: 'bg-status-progress-fg',
    accentBorderClass: 'border-l-status-progress-fg',
    cardBg: 'bg-status-progress-bg/40',
    badgeClass: 'bg-status-progress-bg text-status-progress-fg border-transparent',
    chartColor: 'hsl(var(--status-progress-fg))',
  },
  completed: {
    label: 'Completed',
    color: 'completed',
    bgClass: 'bg-status-completed-bg',
    textClass: 'text-status-completed-fg',
    borderClass: 'border-status-completed-fg/20',
    dotClass: 'bg-status-completed-fg',
    accentBorderClass: 'border-l-status-completed-fg',
    cardBg: 'bg-status-completed-bg/40',
    badgeClass: 'bg-status-completed-bg text-status-completed-fg border-transparent',
    chartColor: 'hsl(var(--status-completed-fg))',
  },
  no_show: {
    label: 'No show',
    color: 'noshow',
    bgClass: 'bg-status-noshow-bg',
    textClass: 'text-status-noshow-fg',
    borderClass: 'border-status-noshow-fg/20',
    dotClass: 'bg-status-noshow-fg',
    accentBorderClass: 'border-l-status-noshow-fg',
    cardBg: 'bg-status-noshow-bg/40',
    badgeClass: 'bg-status-noshow-bg text-status-noshow-fg border-transparent',
    chartColor: 'hsl(var(--status-noshow-fg))',
  },
} as const

export const PAYMENT_STATUS_CONFIG = {
  unpaid: {
    label: 'Unpaid',
    badgeClass: 'bg-status-noshow-bg text-status-noshow-fg border-transparent',
  },
  partially_paid: {
    label: 'Partial',
    badgeClass: 'bg-status-progress-bg text-status-progress-fg border-transparent',
  },
  paid: {
    label: 'Paid',
    badgeClass: 'bg-status-confirmed-bg text-status-confirmed-fg border-transparent',
  },
} as const

export type AppointmentStatus = keyof typeof STATUS_CONFIG
export type PaymentStatus = keyof typeof PAYMENT_STATUS_CONFIG
