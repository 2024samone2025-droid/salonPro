'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'

// Presentational, reusable display of a one-time invite link: a read-only field
// plus a copy button with transient confirmation. Shared by the create-invite
// and rotate-invite flows so both render (and copy) the link identically.
export default function InviteLinkPanel({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Invite link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy — select and copy the link manually')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input readOnly value={url} className="font-mono text-xs" aria-label="Invite link" />
      <Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Copy invite link">
        {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
      </Button>
    </div>
  )
}
