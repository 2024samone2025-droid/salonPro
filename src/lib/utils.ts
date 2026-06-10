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
