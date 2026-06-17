'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { revealOwnerContact } from '@/app/operator/[salonId]/actions'

interface Props {
  salonId: string
  hasOwner: boolean
  nameMasked: string
  emailMasked: string
}

// Owner contact starts masked. "Reveal" calls the server action (which logs
// REVEAL_PII and returns the unmasked values); the swap is inline. "Hide" only
// re-masks in the browser — it does NOT re-log, so the audit holds exactly one
// reveal per deliberate click.
export default function OwnerContact({ salonId, hasOwner, nameMasked, emailMasked }: Props) {
  const [revealed, setRevealed] = useState<{ name: string; email: string } | null>(null)
  const [shown, setShown] = useState(false)
  const [pending, startTransition] = useTransition()

  if (!hasOwner) {
    return <p className="text-sm text-muted-foreground">No owner linked to this salon.</p>
  }

  const showing = shown && revealed
  const name = showing ? revealed!.name : nameMasked
  const email = showing ? revealed!.email : emailMasked

  function onReveal() {
    if (revealed) {
      setShown(true)
      return
    }
    startTransition(async () => {
      const contact = await revealOwnerContact(salonId)
      if (contact) {
        setRevealed(contact)
        setShown(true)
      }
    })
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="truncate font-medium">{name}</div>
        <div className="truncate text-sm text-muted-foreground">{email}</div>
      </div>
      {showing ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => setShown(false)}>
          Hide
        </Button>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={onReveal} disabled={pending}>
          {pending ? 'Revealing…' : 'Reveal'}
        </Button>
      )}
    </div>
  )
}
