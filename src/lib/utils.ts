import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Display-only currency formatting — amounts are stored as plain numbers, no conversion.
export function formatMoney(amount: number, currency: string = 'RWF') {
  if (currency === 'USD') {
    return '$' + new Intl.NumberFormat('en-US').format(amount)
  }
  return new Intl.NumberFormat('en-RW').format(amount) + ' ' + currency
}

export function formatRWF(amount: number) {
  return formatMoney(amount, 'RWF')
}

// Up-to-two-letter initials for avatar fallbacks (e.g. "Aline Niyonsaba" -> "AN").
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
