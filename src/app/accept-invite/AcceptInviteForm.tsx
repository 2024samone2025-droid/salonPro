'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, AlertCircle, Triangle } from 'lucide-react'

const MIN_PASSWORD_LENGTH = 12

function Shell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-start sm:items-center justify-center overflow-y-auto bg-background p-3 sm:p-4 md:p-6 py-8">
      <div className="w-full sm:w-[400px] lg:w-[480px]">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center size-10 sm:size-12 rounded-md bg-foreground mb-3 sm:mb-4">
            <Triangle className="size-5 sm:size-6 text-background fill-background" />
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">SalonPro</h1>
          <p className="text-[13px] sm:text-sm text-muted-foreground mt-0.5">Join your team</p>
        </div>
        <Card className="border shadow-sm">
          <CardHeader className="text-center pb-2 pt-4 sm:pt-5 px-4 sm:px-6">
            <CardTitle className="text-[15px] sm:text-base font-medium">{title}</CardTitle>
            <CardDescription className="text-[13px] sm:text-sm">{description}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2 pb-4 sm:pb-5 px-4 sm:px-6">{children}</CardContent>
        </Card>
      </div>
    </div>
  )
}

type State = 'checking' | 'valid' | 'invalid'

export default function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter()
  const [state, setState] = useState<State>('checking')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) { setState('invalid'); return }
    let active = true
    fetch(`/api/staff/invite?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => { if (active) setState(d.valid ? 'valid' : 'invalid') })
      .catch(() => { if (active) setState('invalid') })
    return () => { active = false }
  }, [token])

  // Remove the token from the address bar immediately (it stays in React state
  // for the fetch calls). Limits shoulder-surfing, history, and accidental copy.
  useEffect(() => {
    if (token) window.history.replaceState(null, '', '/accept-invite')
  }, [token])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`); return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/staff/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, phone, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) { router.replace('/dashboard'); return }
      setError(data.error || 'Could not complete sign-up')
    } catch {
      setError('Network error')
    }
    setLoading(false)
  }

  if (state === 'checking') {
    return (
      <Shell title="Checking your invite…" description="One moment">
        <div className="flex items-center justify-center py-6">
          <Triangle className="size-6 text-foreground animate-pulse" />
        </div>
      </Shell>
    )
  }

  if (state === 'invalid') {
    return (
      <Shell title="Invite unavailable" description="This invite is invalid or has expired">
        <p className="text-[13px] text-muted-foreground text-center py-4">
          Ask your salon admin to send you a new invite link.
        </p>
      </Shell>
    )
  }

  return (
    <Shell title="Set up your account" description="Confirm your details and choose a password">
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-[13px] sm:text-sm">Full name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)}
                 autoComplete="name" autoFocus required className="h-9 sm:h-10 sm:text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-[13px] sm:text-sm">Phone number</Label>
          <Input id="phone" type="tel" placeholder="0788 123 456" value={phone}
                 onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required
                 className="h-9 sm:h-10 sm:text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-[13px] sm:text-sm">New password</Label>
          <div className="relative">
            <Input id="password" type={showPassword ? 'text' : 'password'}
                   placeholder="At least 12 characters" value={password}
                   onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required
                   className="pr-11 md:pr-9 h-9 sm:h-10 sm:text-sm" />
            <Button type="button" variant="ghost" size="icon"
                    className="absolute right-0.5 top-1/2 -translate-y-1/2 size-7 sm:size-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
              {showPassword ? <EyeOff className="size-3.5 sm:size-4" /> : <Eye className="size-3.5 sm:size-4" />}
              <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm" className="text-[13px] sm:text-sm">Confirm password</Label>
          <Input id="confirm" type={showPassword ? 'text' : 'password'} value={confirm}
                 onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required
                 className="h-9 sm:h-10 sm:text-sm" />
        </div>
        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="size-3.5" />
            <AlertDescription className="text-[13px]">{error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" className="w-full h-9 sm:h-10 text-[13px] sm:text-sm font-medium"
                disabled={loading || !name.trim() || !phone.trim() || !password || !confirm}>
          {loading ? 'Setting up…' : 'Create account & sign in'}
        </Button>
      </form>
    </Shell>
  )
}
