'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Triangle, AlertCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { ThemeToggle } from '@/components/theme-toggle'

export default function SalonSignupPage() {
  const [salonName, setSalonName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminPin, setAdminPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const res = await fetch('/api/salons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonName, subdomain, adminName, adminPin }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create salon')
      } else {
        setSuccess(`Salon created! Redirecting to your salon...`)
        if (data.token) {
          localStorage.setItem('salonpro_token', data.token)
        }
        setTimeout(() => {
          window.location.href = `/?salon=${data.salon.subdomain}`
        }, 1000)
      }
    } catch {
      setError('An error occurred')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

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
            <CardDescription>Set up your salon and admin account</CardDescription>
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
                    required
                  />
                  <span className="text-sm text-muted-foreground">.salonpro.com</span>
                </div>
              </div>

              <div>
                <Label htmlFor="adminName">Admin Name</Label>
                <Input
                  id="adminName"
                  placeholder="Admin User"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="adminPin">Admin PIN</Label>
                <Input
                  id="adminPin"
                  type="password"
                  placeholder="4-6 digit PIN"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  maxLength={6}
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
                <Alert className="border-emerald-200 bg-emerald-50">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading || !salonName || !subdomain || !adminName || !adminPin}>
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