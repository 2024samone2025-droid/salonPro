'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Check, Copy, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import { ROLE_LABELS, type UserRole } from '@/lib/permissions'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** True when the current user may grant the admin role (admins/owners only). */
  canGrantAdmin: boolean
  /** Called once an invite has been created, so the parent can refresh its list. */
  onInvited: () => void
}

// Admin-side "invite staff" flow. Two phases in one dialog:
//  1. form    — collect name, phone, email, role → POST /api/staff/invite
//  2. link    — show the returned one-time acceptUrl to copy and send manually.
//               The raw token is shown ONCE (it isn't stored); losing it means
//               rotating the invite, not re-reading it.
export default function InviteStaffDialog({ open, onOpenChange, canGrantAdmin, onInvited }: Props) {
  const { authFetch } = useAuth()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('receptionist')
  const [submitting, setSubmitting] = useState(false)
  const [acceptUrl, setAcceptUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const reset = () => {
    setName('')
    setPhone('')
    setEmail('')
    setRole('receptionist')
    setAcceptUrl(null)
    setCopied(false)
  }

  const close = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const submit = async () => {
    if (name.trim().length < 2) {
      toast.error('Name must be at least 2 characters')
      return
    }
    if (!phone.trim()) {
      toast.error('A phone number is required')
      return
    }
    if (!EMAIL_RE.test(email.trim())) {
      toast.error('A valid email is required')
      return
    }
    setSubmitting(true)
    try {
      const res = await authFetch('/api/staff/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          role,
        }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(body?.error || 'Could not create invite')
        return
      }
      setAcceptUrl(body.acceptUrl as string)
      onInvited()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const copy = async () => {
    if (!acceptUrl) return
    try {
      await navigator.clipboard.writeText(acceptUrl)
      setCopied(true)
      toast.success('Invite link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy — select and copy the link manually')
    }
  }

  const roles: UserRole[] = canGrantAdmin
    ? (Object.keys(ROLE_LABELS) as UserRole[])
    : (Object.keys(ROLE_LABELS) as UserRole[]).filter((r) => r !== 'admin')

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        {acceptUrl ? (
          // ── Phase 2: one-time link ──────────────────────────────────────────
          <>
            <DialogHeader>
              <DialogTitle>Invite link ready</DialogTitle>
              <DialogDescription>
                Send this link to {name.trim()} (e.g. WhatsApp or SMS). It works once and expires in
                72 hours. You won&apos;t be able to see it again — if it&apos;s lost, rotate the invite.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <Input readOnly value={acceptUrl} className="font-mono text-xs" aria-label="Invite link" />
              <Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Copy invite link">
                {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => close(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          // ── Phase 1: details form ───────────────────────────────────────────
          <>
            <DialogHeader>
              <DialogTitle>Invite staff</DialogTitle>
              <DialogDescription>
                Create a one-time link for a new team member. They confirm their name and phone, set
                their own password, and are signed in — no temporary password to share.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="invite-name">Name</Label>
                <Input
                  id="invite-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-phone">Phone</Label>
                <Input
                  id="invite-phone"
                  type="tel"
                  placeholder="0788 123 456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  They&apos;ll confirm this exact number to accept the invite.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  autoComplete="off"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Create invite link
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
