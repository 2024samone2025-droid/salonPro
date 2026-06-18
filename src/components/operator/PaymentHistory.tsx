'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatMoney } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { reversePayment } from '@/app/operator/[salonId]/actions'

export interface PaymentRow {
  id: string
  amount: number
  currency: string
  method: string
  reference: string
  paidAt: string // ISO
  kind: 'PAYMENT' | 'REVERSAL'
  reversesId: string | null
  voidReason: string | null
}

interface Props {
  salonId: string
  payments: PaymentRow[]
}

// The append-only ledger view. PAYMENT rows can be reversed (once); a REVERSAL row
// shows the negative correction + its reason. Reversing NEVER edits/deletes a row —
// the server appends a REVERSAL and rolls the period back when safe.
export default function PaymentHistory({ salonId, payments }: Props) {
  const router = useRouter()
  const [target, setTarget] = useState<PaymentRow | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // A payment is reversed iff some REVERSAL row points back at it.
  const reversedIds = useMemo(
    () => new Set(payments.filter((p) => p.kind === 'REVERSAL' && p.reversesId).map((p) => p.reversesId)),
    [payments],
  )

  function close() {
    setTarget(null)
    setReason('')
    setError(null)
    setWarning(null)
  }

  function submit() {
    if (!target) return
    setError(null)
    setWarning(null)
    startTransition(async () => {
      const res = await reversePayment(salonId, target.id, reason)
      if (!res.ok) {
        setError(res.error ?? 'Could not reverse the payment.')
        return
      }
      if (res.periodAdjusted === false) {
        // Reversal recorded but a later payment had moved the period — don't guess.
        setWarning(
          'Reversal recorded, but the paid period was left unchanged because a later payment superseded this one. Check the period and adjust the plan by hand if needed.',
        )
        router.refresh()
        return
      }
      close()
      router.refresh()
    })
  }

  if (payments.length === 0) {
    return <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {payments.map((p) => {
          const isReversal = p.kind === 'REVERSAL'
          const isReversed = reversedIds.has(p.id)
          return (
            <li key={p.id} className="flex items-center justify-between gap-4 py-2 text-sm">
              <div className="min-w-0">
                <span
                  className={
                    isReversal
                      ? 'font-medium tabular-nums text-destructive'
                      : isReversed
                        ? 'font-medium tabular-nums text-muted-foreground line-through'
                        : 'font-medium tabular-nums'
                  }
                >
                  {formatMoney(p.amount, p.currency)}
                </span>
                <span className="text-muted-foreground"> · {p.method}</span>
                {isReversal && (
                  <Badge variant="outline" className="ml-2 align-middle">
                    Reversal
                  </Badge>
                )}
                {isReversed && (
                  <Badge variant="outline" className="ml-2 align-middle">
                    Reversed
                  </Badge>
                )}
                <div className="truncate text-xs text-muted-foreground">
                  {isReversal && p.voidReason ? p.voidReason : `ref ${p.reference}`}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <time className="text-xs text-muted-foreground" dateTime={p.paidAt}>
                  {new Date(p.paidAt).toLocaleDateString()}
                </time>
                {!isReversal && !isReversed && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => setTarget(p)}
                  >
                    Reverse
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <Dialog open={target !== null} onOpenChange={(o) => (o ? undefined : close())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse payment</DialogTitle>
            <DialogDescription>
              Appends a reversing entry (the original is kept, never deleted) and rolls the paid
              period back when this is still the latest payment. Audited.
            </DialogDescription>
          </DialogHeader>

          {target && (
            <p className="text-sm">
              Reversing{' '}
              <span className="font-medium tabular-nums">
                {formatMoney(target.amount, target.currency)}
              </span>{' '}
              · {target.method} <span className="text-muted-foreground">(ref {target.reference})</span>
            </p>
          )}

          {warning ? (
            <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground">
              {warning}
            </p>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="reverse-reason">Reason</Label>
              <Textarea
                id="reverse-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this being reversed? (recorded in the audit log)"
                rows={2}
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            {warning ? (
              <Button type="button" onClick={close}>
                Done
              </Button>
            ) : (
              <>
                <Button type="button" variant="ghost" onClick={close} disabled={pending}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" onClick={submit} disabled={pending}>
                  {pending ? 'Reversing…' : 'Reverse payment'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
