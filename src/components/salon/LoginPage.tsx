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
import { Sparkles, Eye, EyeOff, LogIn, AlertCircle, Loader2, Shield, CalendarDays, Scissors } from 'lucide-react'

const demoAccounts = [
  { name: 'Admin', pin: '1234', role: 'Admin', description: 'Full access to everything', icon: Shield, accent: 'emerald' },
  { name: 'Alice', pin: '5678', role: 'Receptionist', description: 'Appointments & customers', icon: CalendarDays, accent: 'violet' },
  { name: 'Marie', pin: '9012', role: 'Stylist', description: 'Own appointments only', icon: Scissors, accent: 'teal' },
] as const

export default function LoginPage() {
  const { login } = useAuth()
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

  const fillDemo = (demoName: string, demoPin: string) => {
    setName(demoName)
    setPin(demoPin)
    setError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-teal-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 shadow-lg shadow-emerald-200/50 mb-4">
            <Sparkles className="size-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-900 to-teal-800 bg-clip-text text-transparent">
            SalonPro
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Rwanda — Salon Management System
          </p>
        </div>

        <Card className="shadow-xl border-emerald-100/80">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access the system</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Username</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin">PIN</Label>
                <div className="relative">
                  <Input
                    id="pin"
                    type={showPin ? 'text' : 'password'}
                    placeholder="Enter your PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="pr-10 h-11"
                    autoComplete="current-password"
                    maxLength={6}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPin(!showPin)}
                    tabIndex={-1}
                  >
                    {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    <span className="sr-only">{showPin ? 'Hide PIN' : 'Show PIN'}</span>
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white h-11 font-medium"
                disabled={loading || !name || !pin}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="size-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6">
              <Separator className="mb-4" />
              <p className="text-xs text-muted-foreground text-center mb-3">
                Quick access with demo accounts
              </p>
              <div className="space-y-2">
                {demoAccounts.map((account) => {
                  const Icon = account.icon
                  return (
                    <Button
                      key={account.name}
                      type="button"
                      variant="outline"
                      className="w-full justify-between h-auto py-2.5 px-3 text-left font-normal"
                      onClick={() => fillDemo(account.name, account.pin)}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{account.role}</p>
                          <p className="text-xs text-muted-foreground">{account.description}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded font-mono">
                        {account.pin}
                      </span>
                    </Button>
                  )
                })}
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-center pb-4">
            <p className="text-xs text-muted-foreground/60">
              Secure PIN-based access
            </p>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-muted-foreground/40 mt-6">
          &copy; 2025 SalonPro Rwanda
        </p>
      </div>
    </div>
  )
}
