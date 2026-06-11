'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import {
  Scissors,
  User,
  CalendarDays,
  Clock,
  Check,
  ChevronLeft,
  Phone,
  Loader2,
  PartyPopper,
  ArrowRight,
} from 'lucide-react'
import { cn, formatMoney } from '@/lib/utils'

interface Service {
  id: string
  name: string
  price: number
  duration: number
}
interface Staff {
  id: string
  name: string
}
interface SalonInfo {
  salon: { name: string; subdomain: string }
  currency?: string
  services: Service[]
  staff: Staff[]
}
interface Confirmation {
  date: string
  startTime: string
  endTime: string
  serviceName: string
  staffName: string
  price: number
}

type Step = 'service' | 'staff' | 'datetime' | 'details' | 'done'

const STEPS: { key: Step; label: string }[] = [
  { key: 'service', label: 'Service' },
  { key: 'staff', label: 'Stylist' },
  { key: 'datetime', label: 'Date & time' },
  { key: 'details', label: 'Your details' },
]

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d
    .getDate()
    .toString()
    .padStart(2, '0')}`
}

function formatLongDate(date: string) {
  try {
    return new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return date
  }
}

export default function BookingFlow({ subdomain }: { subdomain: string }) {
  const [info, setInfo] = useState<SalonInfo | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [step, setStep] = useState<Step>('service')
  const [serviceId, setServiceId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [date, setDate] = useState(todayStr())
  const [startTime, setStartTime] = useState('')

  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch(`/api/public/booking/${subdomain}`)
        if (!res.ok) {
          if (active) setNotFound(true)
          return
        }
        const data = await res.json()
        if (active) setInfo(data)
      } catch {
        if (active) setNotFound(true)
      } finally {
        if (active) setLoadingInfo(false)
      }
    })()
    return () => {
      active = false
    }
  }, [subdomain])

  const selectedService = useMemo(
    () => info?.services.find((s) => s.id === serviceId) || null,
    [info, serviceId]
  )
  const selectedStaff = useMemo(
    () => info?.staff.find((s) => s.id === staffId) || null,
    [info, staffId]
  )

  const formatRWF = (amount: number) => formatMoney(amount, info?.currency || 'RWF')

  const loadSlots = useCallback(async () => {
    if (!serviceId || !staffId || !date) return
    setLoadingSlots(true)
    setStartTime('')
    try {
      const res = await fetch(
        `/api/public/booking/${subdomain}/slots?date=${date}&staffId=${staffId}&serviceId=${serviceId}`
      )
      const data = await res.json()
      setSlots(res.ok ? data.slots || [] : [])
    } catch {
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }, [subdomain, serviceId, staffId, date])

  useEffect(() => {
    if (step === 'datetime') loadSlots()
  }, [step, loadSlots])

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Please enter your name')
      return
    }
    if (!phone.trim()) {
      toast.error('Please enter your phone number')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/public/booking/${subdomain}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, date, startTime, staffId, serviceId }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok) {
        setConfirmation(data.appointment)
        setStep('done')
      } else if (res.status === 409) {
        toast.error('Slot just taken', {
          description: data?.message || 'Please choose another time.',
        })
        setStep('datetime')
        loadSlots()
      } else {
        toast.error(data?.error || 'Could not complete booking')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingInfo) {
    return (
      <Shell>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </CardContent>
        </Card>
      </Shell>
    )
  }

  if (notFound || !info) {
    return (
      <Shell>
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Salon not found</CardTitle>
            <CardDescription>
              This booking link doesn&apos;t match any salon. Please check the address and try
              again.
            </CardDescription>
          </CardHeader>
        </Card>
      </Shell>
    )
  }

  if (step === 'done' && confirmation) {
    return (
      <Shell salonName={info.salon.name}>
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 inline-flex size-12 items-center justify-center rounded-full bg-success/10">
              <PartyPopper className="size-6 text-success" />
            </div>
            <CardTitle>You&apos;re booked!</CardTitle>
            <CardDescription>
              We&apos;ve reserved your appointment at {info.salon.name}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SummaryRow icon={<Scissors className="size-4" />} label="Service" value={confirmation.serviceName} />
            <SummaryRow icon={<User className="size-4" />} label="Stylist" value={confirmation.staffName} />
            <SummaryRow
              icon={<CalendarDays className="size-4" />}
              label="Date"
              value={formatLongDate(confirmation.date)}
            />
            <SummaryRow
              icon={<Clock className="size-4" />}
              label="Time"
              value={`${confirmation.startTime} – ${confirmation.endTime}`}
            />
            <SummaryRow
              icon={<Badge className="px-0 bg-transparent text-foreground shadow-none">RWF</Badge>}
              label="Price"
              value={formatRWF(confirmation.price)}
            />
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => {
                setConfirmation(null)
                setServiceId('')
                setStaffId('')
                setStartTime('')
                setName('')
                setPhone('')
                setStep('service')
              }}
            >
              Book another appointment
            </Button>
          </CardContent>
        </Card>
      </Shell>
    )
  }

  const currentStepIndex = STEPS.findIndex((s) => s.key === step)

  return (
    <Shell salonName={info.salon.name}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-1.5 mb-3">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex flex-1 items-center gap-1.5">
                <div
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors',
                    i <= currentStepIndex ? 'bg-primary' : 'bg-muted'
                  )}
                />
              </div>
            ))}
          </div>
          <CardTitle className="text-lg">{STEPS[currentStepIndex]?.label}</CardTitle>
          <CardDescription>
            Step {currentStepIndex + 1} of {STEPS.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {step === 'service' && (
            <>
              {info.services.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No services are available for booking right now.
                </p>
              )}
              {info.services.map((s) => (
                <Button
                  key={s.id}
                  variant="ghost"
                  onClick={() => {
                    setServiceId(s.id)
                    setStartTime('')
                    setStep('staff')
                  }}
                  className={cn(
                    'flex h-auto w-full items-center justify-between rounded-lg border p-3 text-left font-normal whitespace-normal hover:border-primary hover:bg-primary/[0.03]',
                    serviceId === s.id && 'border-primary bg-primary/[0.04]'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                      <Scissors className="size-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.duration} min</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">{formatRWF(s.price)}</span>
                </Button>
              ))}
            </>
          )}

          {step === 'staff' && (
            <>
              {info.staff.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No stylists are available right now.
                </p>
              )}
              {info.staff.map((st) => (
                <Button
                  key={st.id}
                  variant="ghost"
                  onClick={() => {
                    setStaffId(st.id)
                    setStartTime('')
                    setStep('datetime')
                  }}
                  className={cn(
                    'flex h-auto w-full items-center justify-start gap-3 rounded-lg border p-3 text-left font-normal whitespace-normal hover:border-primary hover:bg-primary/[0.03]',
                    staffId === st.id && 'border-primary bg-primary/[0.04]'
                  )}
                >
                  <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                    <User className="size-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">{st.name}</p>
                </Button>
              ))}
            </>
          )}

          {step === 'datetime' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="book-date">Date</Label>
                <Input
                  id="book-date"
                  type="date"
                  min={todayStr()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Available times</Label>
                {loadingSlots ? (
                  <div className="grid grid-cols-4 gap-2">
                    {[...Array(8)].map((_, i) => (
                      <Skeleton key={i} className="h-9 w-full" />
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No open times on this day. Try another date.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map((t) => (
                      <Button
                        key={t}
                        variant={startTime === t ? 'default' : 'outline'}
                        onClick={() => setStartTime(t)}
                        className={cn(
                          'h-auto py-2 font-normal shadow-none',
                          startTime === t
                            ? 'border border-primary'
                            : 'hover:border-primary hover:bg-background hover:text-foreground'
                        )}
                      >
                        {t}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                className="w-full"
                disabled={!startTime}
                onClick={() => setStep('details')}
              >
                Continue
                <ArrowRight className="size-4" />
              </Button>
            </>
          )}

          {step === 'details' && (
            <>
              <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-sm">
                <SummaryRow icon={<Scissors className="size-4" />} label="Service" value={selectedService?.name || ''} />
                <SummaryRow icon={<User className="size-4" />} label="Stylist" value={selectedStaff?.name || ''} />
                <SummaryRow icon={<CalendarDays className="size-4" />} label="Date" value={formatLongDate(date)} />
                <SummaryRow icon={<Clock className="size-4" />} label="Time" value={startTime} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="book-name">Full name</Label>
                <Input
                  id="book-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="book-phone">Phone number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="book-phone"
                    className="pl-9"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XX XXX XXX"
                    inputMode="tel"
                  />
                </div>
              </div>
              <Button className="w-full" disabled={submitting} onClick={handleSubmit}>
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Booking…
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    Confirm booking
                  </>
                )}
              </Button>
            </>
          )}

          {step !== 'service' && step !== 'done' && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => {
                const order: Step[] = ['service', 'staff', 'datetime', 'details']
                const idx = order.indexOf(step)
                if (idx > 0) setStep(order[idx - 1])
              }}
            >
              <ChevronLeft className="size-4" />
              Back
            </Button>
          )}
        </CardContent>
      </Card>
    </Shell>
  )
}

function Shell({ children, salonName }: { children: React.ReactNode; salonName?: string }) {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <Toaster />
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex size-11 items-center justify-center rounded-xl bg-primary/10">
            <Scissors className="size-5 text-primary" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            {salonName || 'Book an appointment'}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Book online in a few taps</p>
        </div>
        {children}
        <p className="mt-6 text-center text-xs text-muted-foreground">Powered by SalonPro</p>
      </div>
    </div>
  )
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}
