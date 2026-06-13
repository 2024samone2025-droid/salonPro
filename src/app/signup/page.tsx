'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Triangle, AlertCircle, Loader2, Check } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { validateSubdomain, SUBDOMAIN_MAX_LENGTH } from '@/lib/constants'

type SubStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken'

export default function SalonSignupPage() {
  const [salonName, setSalonName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [subStatus, setSubStatus] = useState<SubStatus>('idle')
  const [subMessage, setSubMessage] = useState('')

  // Live subdomain availability: validate locally first (instant), then
  // debounce a server check. Cleanup aborts the in-flight request and clears
  // the timer on every keystroke, so only the latest value's result is applied.
  useEffect(() => {
    if (!subdomain) {
      setSubStatus('idle')
      setSubMessage('')
      return
    }

    const local = validateSubdomain(subdomain)
    if (!local.valid) {
      setSubStatus('invalid')
      setSubMessage(local.error ?? 'Invalid subdomain')
      return
    }

    setSubStatus('checking')
    setSubMessage('')
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/salons?subdomain=${encodeURIComponent(subdomain)}`, {
          signal: controller.signal,
        })
        const data = await res.json()
        if (data.available) {
          setSubStatus('available')
          setSubMessage('Available')
        } else {
          setSubStatus('taken')
          setSubMessage(data.reason || 'Already taken')
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setSubStatus('idle')
          setSubMessage('')
        }
      }
    }, 450)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [subdomain])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const res = await fetch('/api/salons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonName, subdomain, ownerName, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create salon')
      } else {
        // data.redirect is the single-use exchange URL on the new subdomain; it
        // sets the owner session cookie and lands on /dashboard logged in.
        setSuccess('Salon created! Redirecting to your salon…')
        setTimeout(() => {
          window.location.href = data.redirect
        }, 1000)
      }
    } catch {
      setError('An error occurred')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-12 rounded-md bg-foreground mb-4">
            <Triangle className="size-6 text-background fill-background" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">SalonPro</h1>
          <p className="text-sm text-muted-foreground mt-1">Create your salon account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Salon</CardTitle>
            <CardDescription>Set up your salon and owner account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="salonName">Salon Name</Label>
                <Input
                  id="salonName"
                  placeholder="My Salon"
                  value={salonName}
                  onChange={(e) => setSalonName(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="subdomain">Subdomain</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="subdomain"
                    placeholder="mysalon"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    maxLength={SUBDOMAIN_MAX_LENGTH}
                    aria-invalid={subStatus === 'invalid' || subStatus === 'taken'}
                    required
                  />
                  <span className="text-sm text-muted-foreground">.salonpro.me</span>
                </div>
                {subStatus !== 'idle' && (
                  <p
                    className={cn(
                      'mt-1.5 flex items-center gap-1 text-xs',
                      subStatus === 'checking' && 'text-muted-foreground',
                      subStatus === 'available' && 'text-success',
                      (subStatus === 'invalid' || subStatus === 'taken') && 'text-destructive'
                    )}
                  >
                    {subStatus === 'checking' && <Loader2 className="size-3 animate-spin" />}
                    {subStatus === 'available' && <Check className="size-3" />}
                    {(subStatus === 'invalid' || subStatus === 'taken') && <AlertCircle className="size-3" />}
                    {subStatus === 'checking' ? 'Checking availability…' : subMessage}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="ownerName">Your Name</Label>
                <Input
                  id="ownerName"
                  placeholder="Jane Doe"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-success/30 bg-success/10 text-success">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !salonName || !ownerName || !email || password.length < 8 || subStatus !== 'available'}
              >
                {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Create Salon
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}