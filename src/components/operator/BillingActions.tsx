'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  recordBillingPayment,
  changeSalonPlan,
  setSubscriptionStatus,
} from '@/app/operator/[salonId]/actions'

const METHODS = ['MTN MoMo', 'Airtel', 'cash', 'bank']
const STATUSES = ['ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING', 'SUSPENDED']

interface Props {
  salonId: string
  currentPlan: string
  currentStatus: string
}

type Which = 'payment' | 'plan' | 'status' | null

// Operator manual billing actions. Each opens a shadcn Dialog and calls the
// matching server action (which runs the change + audit row in one transaction).
// Billing here never touches access — that's the separate Suspend control.
export default function BillingActions({ salonId, currentPlan, currentStatus }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState<Which>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Record-payment fields
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState(METHODS[0])
  const [reference, setReference] = useState('')
  const [paidAt, setPaidAt] = useState('')

  // Change-plan / set-status fields
  const [plan, setPlan] = useState(currentPlan === 'pro' ? 'free' : 'pro')
  const [status, setStatus] = useState(currentStatus)
  const [reason, setReason] = useState('')

  function close() {
    setOpen(null)
    setError(null)
    setReason('')
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res.ok) {
        close()
        router.refresh()
      } else {
        setError(res.error ?? 'Something went wrong.')
      }
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" onClick={() => setOpen('payment')}>
        Record payment
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen('plan')}>
        Change plan
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen('status')}>
        Set status
      </Button>

      {/* Record payment */}
      <Dialog open={open === 'payment'} onOpenChange={(o) => (o ? setOpen('payment') : close())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              Logs the payment, puts the salon on pro and extends the paid period; it
              auto-downgrades to free at period end unless renewed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pay-amount">Amount (RWF)</Label>
              <Input
                id="pay-amount"
                type="number"
                inputMode="numeric"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="15000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-method">Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger id="pay-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-ref">Reference</Label>
              <Input
                id="pay-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Transaction id / receipt no."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-date">Paid on (optional)</Label>
              <Input
                id="pay-date"
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() =>
                  recordBillingPayment(salonId, {
                    amount: Number(amount),
                    method,
                    reference,
                    paidAt: paidAt || undefined,
                  }),
                )
              }
            >
              {pending ? 'Recording…' : 'Record payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change plan */}
      <Dialog open={open === 'plan'} onOpenChange={(o) => (o ? setOpen('plan') : close())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change plan</DialogTitle>
            <DialogDescription>
              Administrative override (immediate). Separate from a payment — use this to comp a
              salon to pro or force it back to free now.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="plan-target">Plan</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger id="plan-target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">free</SelectItem>
                  <SelectItem value="pro">pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-reason">Reason</Label>
              <Textarea
                id="plan-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Recorded in the audit log…"
                rows={2}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => run(() => changeSalonPlan(salonId, plan, reason))}
            >
              {pending ? 'Saving…' : 'Change plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set status */}
      <Dialog open={open === 'status'} onOpenChange={(o) => (o ? setOpen('status') : close())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set subscription status</DialogTitle>
            <DialogDescription>
              A tracking label for the billing story (e.g. mark CANCELED on churn). Does not
              change access — use Suspend for that.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="status-target">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status-target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status-reason">Reason</Label>
              <Textarea
                id="status-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Recorded in the audit log…"
                rows={2}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() =>
                  setSubscriptionStatus(salonId, status as Parameters<typeof setSubscriptionStatus>[1], reason),
                )
              }
            >
              {pending ? 'Saving…' : 'Set status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
