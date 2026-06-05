import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRWF(amount: number) {
  return new Intl.NumberFormat('en-RW').format(amount) + ' RWF'
}
