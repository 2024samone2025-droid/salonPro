'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import LoginPage from '@/components/salon/LoginPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Eye,
  EyeOff,
  AlertCircle,
  Triangle,
  Building2,
  ChevronRight,
  ChevronLeft,
  Users,
} from 'lucide-react'

interface SalonOption {
  id: string
  name: string
  subdomain: string
}

// Owner-flow steps + the apex-only staff redirect helper. (Tenant-host staff use
// the dedicated <LoginPage /> PIN form, rendered outside this Shell.)
type Mode = 'email' | 'password' | 'salon-redirect'

function Shell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-3 sm:p-4 md:p-6">
      <div className="w-full sm:w-[400px] lg:w-[480px]">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center size-10 sm:size-12 rounded-md bg-foreground mb-3 sm:mb-4">
            <Triangle className="size-5 sm:size-6 text-background fill-background" />
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">SalonPro</h1>
          <p className="text-[13px] sm:text-sm text-muted-foreground mt-0.5">Sign in</p>
        </div>
        <Card className="border shadow-sm">
          <CardHeader className="text-center pb-2 pt-4 sm:pt-5 px-4 sm:px-6">
            <CardTitle className="text-[15px] sm:text-base font-medium">{title}</CardTitle>
            <CardDescription className="text-[13px] sm:text-sm">{description}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2 pb-4 sm:pb-5 px-4 sm:px-6">{children}</CardContent>
        </Card>
        <p className="text-center text-[11px] text-muted-foreground/30 mt-4 sm:mt-6 font-mono">
          © {new Date().getFullYear()} SalonPro
        </p>
      </div>
    </div>
  )
}

// Unified, email-first login shown on every host. Owners sign in with email +
// password (then pick a salon → cross-subdomain handoff); team members sign in
// with name + PIN. The PIN path is always one click away. The email step makes NO
// backend call — credentials are only verified at /api/owner/login, which fails
// generically, so the screen never reveals whether an email exists.
export default function UnifiedLogin({ subdomain }: { subdomain: string | null }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const onTenantHost = !!subdomain

  // Tenant host defaults to the staff PIN form (front-desk is the heavy user
  // there); the apex defaults to owner email-first.
  const [staffMode, setStaffMode] = useState(onTenantHost)
  const [mode, setMode] = useState<Mode>('email')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [salonInput, setSalonInput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [salons, setSalons] = useState<SalonOption[] | null>(null) // non-null once authenticated
  const [redirecting, setRedirecting] = useState(false)

  const goToSalon = async (salonId: string) => {
    setRedirecting(true)
    setError('')
    try {
      const res = await fetch('/api/owner/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId }),
      })
      const data = await res.json()
      if (res.ok && data.redirect) {
        window.location.href = data.redirect
        return
      }
      setError(data.error || 'Could not open that salon')
    } catch {
      setError('Network error')
    }
    setRedirecting(false)
  }

  const handleSalons = (list: SalonOption[]) => {
    setSalons(list)
    if (list.length === 1) goToSalon(list[0].id) // single salon → straight in
  }

  // Already-authenticated staff hitting /login on their host → straight to the app.
  // (Preserve ?salon= so dev-mode tenancy survives the redirect.)
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(`/dashboard${window.location.search}`)
    }
  }, [user, authLoading, router])

  // Restore an existing root-owner session (e.g. on reload) without re-auth.
  useEffect(() => {
    let active = true
    fetch('/api/owner/me')
      .then(async (res) => {
        if (!active || !res.ok) return
        const data = await res.json()
        if (data.salons?.length) handleSalons(data.salons)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/owner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (res.ok) {
        handleSalons(data.salons || [])
      } else {
        setError(data.error || 'Invalid credentials')
      }
    } catch {
      setError('Network error')
    }
    setLoading(false)
  }

  const handleStaffRedirect = (e: React.FormEvent) => {
    e.preventDefault()
    const sub = salonInput.trim().toLowerCase()
    if (!sub) return
    // The apex has no salon context; send the team member to their salon's host
    // to finish with name + PIN. window.location.host is the apex here.
    window.location.href = `${window.location.protocol}//${sub}.${window.location.host}/login`
  }

  // ── Staff PIN path (tenant host only) ──────────────────────────────────────
  if (staffMode) {
    return <LoginPage onSwitchToOwner={() => setStaffMode(false)} />
  }

  // ── Redirecting into a salon ───────────────────────────────────────────────
  if (redirecting) {
    return (
      <Shell title="Opening your salon…" description="One moment">
        <div className="flex items-center justify-center py-6">
          <Triangle className="size-6 text-foreground animate-pulse" />
        </div>
      </Shell>
    )
  }

  // ── Salon picker (or empty state) once an owner is authenticated ───────────
  if (salons !== null) {
    return (
      <Shell title="Choose a salon" description="Select which salon to open">
        {error && (
          <Alert variant="destructive" className="py-2 mb-3">
            <AlertCircle className="size-3.5" />
            <AlertDescription className="text-[13px]">{error}</AlertDescription>
          </Alert>
        )}
        {salons.length === 0 ? (
          <p className="text-[13px] text-muted-foreground text-center py-4">
            No salons are linked to this account yet.
          </p>
        ) : (
          <div className="space-y-1.5">
            {salons.map((salon) => (
              <Button
                key={salon.id}
                type="button"
                variant="outline"
                className="h-auto min-h-[48px] w-full justify-between px-3 py-2 text-left font-normal"
                onClick={() => goToSalon(salon.id)}
              >
                <span className="flex items-center gap-2.5">
                  <Building2 className="size-4 text-muted-foreground" />
                  <span>
                    <span className="block text-[13px] sm:text-sm font-medium leading-tight">{salon.name}</span>
                    <span className="block text-[11px] sm:text-xs text-muted-foreground leading-tight font-mono">
                      {salon.subdomain}
                    </span>
                  </span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Button>
            ))}
          </div>
        )}
      </Shell>
    )
  }

  // ── Apex staff helper: "Team member?" → go to your salon's host ────────────
  if (mode === 'salon-redirect') {
    return (
      <Shell title="Sign in to your salon" description="Team members sign in from their salon's web address">
        <form onSubmit={handleStaffRedirect} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="salon" className="text-[13px] sm:text-sm">Your salon&apos;s address</Label>
            <div className="flex items-center gap-1.5">
              <Input
                id="salon"
                type="text"
                placeholder="yoursalon"
                value={salonInput}
                onChange={(e) => setSalonInput(e.target.value)}
                autoFocus
                required
                className="h-9 sm:h-10 text-[13px] sm:text-sm"
              />
              <span className="text-[13px] text-muted-foreground font-mono whitespace-nowrap">.{typeof window !== 'undefined' ? window.location.host : ''}</span>
            </div>
          </div>
          <Button type="submit" className="w-full h-9 sm:h-10 text-[13px] sm:text-sm font-medium" disabled={!salonInput.trim()}>
            Continue
          </Button>
        </form>
        <Button
          type="button"
          variant="ghost"
          className="mt-2 w-full h-8 text-[13px] text-muted-foreground hover:text-foreground font-normal"
          onClick={() => { setMode('email'); setError('') }}
        >
          <ChevronLeft className="size-3.5 mr-1" /> Back to owner sign in
        </Button>
      </Shell>
    )
  }

  // ── Owner password step ────────────────────────────────────────────────────
  if (mode === 'password') {
    return (
      <Shell title="Enter your password" description={email}>
        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-[13px] sm:text-sm">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-9 h-9 sm:h-10 text-[13px] sm:text-sm"
                autoComplete="current-password"
                autoFocus
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0.5 top-1/2 -translate-y-1/2 size-7 sm:size-8 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-3.5 sm:size-4" /> : <Eye className="size-3.5 sm:size-4" />}
                <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="size-3.5" />
              <AlertDescription className="text-[13px]">{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full h-9 sm:h-10 text-[13px] sm:text-sm font-medium"
            disabled={loading || !password}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>
        <Button
          type="button"
          variant="ghost"
          className="mt-2 w-full h-8 text-[13px] text-muted-foreground hover:text-foreground font-normal"
          onClick={() => { setMode('email'); setPassword(''); setError('') }}
        >
          <ChevronLeft className="size-3.5 mr-1" /> Change email
        </Button>
      </Shell>
    )
  }

  // ── Owner email step (default front door) ──────────────────────────────────
  return (
    <Shell title="Sign in to your account" description="Enter your email to continue">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!email.trim()) return
          setError('')
          setMode('password')
        }}
        className="space-y-3"
      >
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[13px] sm:text-sm">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            autoFocus
            required
            className="h-9 sm:h-10 text-[13px] sm:text-sm"
          />
        </div>
        <Button type="submit" className="w-full h-9 sm:h-10 text-[13px] sm:text-sm font-medium" disabled={!email.trim()}>
          Continue
        </Button>
      </form>

      <Button
        type="button"
        variant="ghost"
        className="mt-3 w-full h-9 text-[13px] sm:text-sm text-muted-foreground hover:text-foreground font-normal"
        onClick={() => {
          setError('')
          // Tenant host: the salon is known, go straight to the PIN form.
          // Apex: ask which salon first.
          if (onTenantHost) setStaffMode(true)
          else setMode('salon-redirect')
        }}
      >
        <Users className="size-3.5 mr-1.5" /> Team member? Sign in with PIN
      </Button>
    </Shell>
  )
}
