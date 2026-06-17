'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Rwanda phone input. Shows a fixed +250 country prefix and lets the user type
 * the 9-digit subscriber number on a numeric keypad — matching how phones are
 * dialled here (and the server-side normalizePhone in lib/invite.ts, which maps
 * a leading 0 / bare local number to +250).
 *
 * Built on the shadcn ui/input so styling, focus ring, and the 44px mobile touch
 * floor stay consistent with every other field. The emitted value is the full
 * `+250XXXXXXXXX` string (or '' when empty), so consumers store one canonical
 * shape.
 */

// Subscriber digits = everything after the country code. Accepts whatever shape
// the stored value is in (+250…, 0…, bare digits) and reduces to ≤9 digits.
function toSubscriberDigits(value: string): string {
  let digits = (value || '').replace(/\D/g, '')
  if (digits.startsWith('250')) digits = digits.slice(3)
  digits = digits.replace(/^0+/, '')
  return digits.slice(0, 9)
}

export interface PhoneInputProps
  extends Omit<React.ComponentProps<typeof Input>, 'type' | 'value' | 'onChange' | 'inputMode'> {
  value: string
  onChange: (value: string) => void
}

function PhoneInput({ value, onChange, className, id, ...props }: PhoneInputProps) {
  const subscriber = toSubscriberDigits(value)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = toSubscriberDigits(e.target.value)
    onChange(digits ? `+250${digits}` : '')
  }

  return (
    <div
      className={cn(
        'border-input dark:bg-input/30 flex h-9 min-h-11 md:min-h-0 w-full items-center rounded-sm border bg-transparent shadow-xs transition-[color,box-shadow]',
        'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
        props['aria-invalid'] ? 'ring-destructive/20 dark:ring-destructive/40 border-destructive' : '',
        className,
      )}
    >
      <span className="pl-3 pr-2 text-sm text-muted-foreground select-none" aria-hidden="true">
        +250
      </span>
      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={subscriber}
        onChange={handleChange}
        placeholder="788 123 456"
        // Strip the wrapper-provided chrome from the inner field; the container
        // owns the border, height, and focus ring now.
        className="h-auto min-h-0 flex-1 rounded-none border-0 bg-transparent pl-0 shadow-none focus-visible:ring-0"
        {...props}
      />
    </div>
  )
}

export { PhoneInput, toSubscriberDigits }
