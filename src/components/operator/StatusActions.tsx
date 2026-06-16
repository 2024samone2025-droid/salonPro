'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { setSalonStatus } from '@/app/operator/[salonId]/actions'

interface Props {
  salonId: string
  status: 'ACTIVE' | 'SUSPENDED'
}

// Suspend / reactivate. Both demand a typed reason (written to the operator
// audit log in the same transaction as the flip). Suspend is destructive-styled;
// the copy states plainly that no data is deleted.
export default function StatusActions({ salonId, status }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const target: 'ACTIVE' | 'SUSPENDED' = status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
  const isSuspend = target === 'SUSPENDED'
  const verb = isSuspend ? 'Suspend' : 'Reactivate'

  function reset() {
    setOpen(false)
    setReason('')
    setError(null)
  }

  function confirm() {
    setError(null)
    if (!reason.trim()) {
      setError('A reason is required.')
      return
    }
    startTransition(async () => {
      const res = await setSalonStatus(salonId, target, reason)
      if (res.ok) {
        reset()
        router.refresh()
      } else {
        setError(res.error ?? 'Something went wrong.')
      }
    })
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant={isSuspend ? 'destructive' : 'default'}
        onClick={() => setOpen(true)}
      >
        {verb} salon
      </Button>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <p className="text-sm">
        {isSuspend
          ? 'Suspending blocks all access and online booking for this salon. No data is deleted — this only flips the status. Reactivating restores access.'
          : 'Reactivating restores full access and online booking for this salon.'}
      </p>
      <Textarea
        placeholder={`Reason for ${verb.toLowerCase()} (required, recorded in the audit log)…`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={isSuspend ? 'destructive' : 'default'}
          onClick={confirm}
          disabled={pending}
        >
          {pending ? 'Working…' : `Confirm ${verb.toLowerCase()}`}
        </Button>
        <Button type="button" variant="ghost" onClick={reset} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
