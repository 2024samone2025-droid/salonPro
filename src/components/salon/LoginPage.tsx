'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-teal-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-200 mb-4">
            <Sparkles className="size-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-emerald-900">SalonPro</h1>
          <p className="text-sm text-emerald-600/70 mt-1">Rwanda — Salon Management System</p>
        </div>

        <Card className="shadow-xl border-emerald-100">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-lg">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Username</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>

              <div>
                <Label htmlFor="pin">PIN</Label>
                <div className="relative mt-1">
                  <Input
                    id="pin"
                    type={showPin ? 'text' : 'password'}
                    placeholder="Enter your PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="pr-10"
                    autoComplete="current-password"
                    maxLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPin(!showPin)}
                  >
                    {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11"
                disabled={loading || !name || !pin}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn className="size-4" />
                    Sign In
                  </div>
                )}
              </Button>
            </form>

            {/* Demo credentials hint */}
            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center mb-3">Demo Accounts</p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => { setName('Admin'); setPin('1234') }}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-emerald-900">Admin</p>
                    <p className="text-xs text-emerald-600/70">Full access to everything</p>
                  </div>
                  <span className="text-xs text-muted-foreground bg-white px-2 py-1 rounded border">PIN: 1234</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setName('Alice'); setPin('5678') }}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg border border-purple-200 bg-purple-50/50 hover:bg-purple-50 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-purple-900">Receptionist</p>
                    <p className="text-xs text-purple-600/70">Appointments & customers</p>
                  </div>
                  <span className="text-xs text-muted-foreground bg-white px-2 py-1 rounded border">PIN: 5678</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setName('Marie'); setPin('9012') }}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg border border-teal-200 bg-teal-50/50 hover:bg-teal-50 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-teal-900">Stylist</p>
                    <p className="text-xs text-teal-600/70">Own appointments only</p>
                  </div>
                  <span className="text-xs text-muted-foreground bg-white px-2 py-1 rounded border">PIN: 9012</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground/50 mt-6">
          © 2025 SalonPro Rwanda — Secure PIN-based access
        </p>
      </div>
    </div>
  )
}
