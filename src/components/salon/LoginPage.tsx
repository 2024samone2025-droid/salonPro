'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Eye, EyeOff, AlertCircle, Shield, CalendarDays, Scissors, Triangle } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

export default function LoginPage() {
  const { login, salon } = useAuth()
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(name, pin)
    if (!result.success) {
      setError(result.error || 'Invalid credentials')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-3 sm:p-4 md:p-6 relative">
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
        <ThemeToggle />
      </div>

      <div className="w-full sm:w-[400px] lg:w-[480px]">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center size-10 sm:size-12 rounded-md bg-foreground mb-3 sm:mb-4">
            <Triangle className="size-5 sm:size-6 text-background fill-background" />
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{salon?.name || 'SalonPro'}</h1>
          <p className="text-[13px] sm:text-sm text-muted-foreground mt-0.5">Salon Management System</p>
        </div>

        <Card className="border shadow-sm">
          <CardHeader className="text-center pb-2 pt-4 sm:pt-5 px-4 sm:px-6">
            <CardTitle className="text-[15px] sm:text-base font-medium">Sign in to your account</CardTitle>
            <CardDescription className="text-[13px] sm:text-sm">Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent className="pt-2 pb-4 sm:pb-5 px-4 sm:px-6">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-[13px] sm:text-sm">Username</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                  className="h-9 sm:h-10 text-[13px] sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pin" className="text-[13px] sm:text-sm">PIN</Label>
                <div className="relative">
                  <Input
                    id="pin"
                    type={showPin ? 'text' : 'password'}
                    placeholder="Enter your PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="pr-9 h-9 sm:h-10 text-[13px] sm:text-sm"
                    autoComplete="current-password"
                    maxLength={6}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0.5 top-1/2 -translate-y-1/2 size-7 sm:size-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPin(!showPin)}
                    tabIndex={-1}
                  >
                    {showPin ? <EyeOff className="size-3.5 sm:size-4" /> : <Eye className="size-3.5 sm:size-4" />}
                    <span className="sr-only">{showPin ? 'Hide PIN' : 'Show PIN'}</span>
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
                disabled={loading || !name || !pin}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-4 sm:mt-5">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-[11px] sm:text-xs uppercase tracking-wider">
                  <span className="bg-card px-2 text-muted-foreground">Demo accounts</span>
                </div>
              </div>
              <div className="mt-2.5 sm:mt-3 space-y-1.5">
                {[
                  { name: 'Admin', pin: '1234', role: 'Admin', description: 'Full access to everything', icon: Shield },
                  { name: 'Alice', pin: '5678', role: 'Receptionist', description: 'Appointments & customers', icon: CalendarDays },
                  { name: 'Marie', pin: '9012', role: 'Stylist', description: 'Own appointments only', icon: Scissors },
                ].map((account) => {
                  const Icon = account.icon
                  return (
                    <button
                      key={account.name}
                      type="button"
                      className="w-full flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-md text-left font-normal hover:bg-muted/50 transition-colors border border-transparent hover:border-border min-h-[44px]"
                      onClick={() => { setName(account.name); setPin(account.pin); setError('') }}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="size-3.5 sm:size-4 text-muted-foreground" />
                        <div>
                          <p className="text-[13px] sm:text-sm font-medium leading-tight">{account.role}</p>
                          <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight">{account.description}</p>
                        </div>
                      </div>
                      <span className="text-[11px] sm:text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                        {account.pin}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-center pb-3 sm:pb-4 pt-0">
            <p className="text-[11px] text-muted-foreground/50 font-mono">PIN-based authentication</p>
          </CardFooter>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground/30 mt-4 sm:mt-6 font-mono">© 2025 SalonPro</p>
      </div>
    </div>
  )
}