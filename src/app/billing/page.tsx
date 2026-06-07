'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

export default function BillingPage() {
  const { salon, refreshSession } = useAuth()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('success') === '1') {
        setSuccess(true)
        refreshSession()
      }
    }
  }, [refreshSession])

  const handleUpgrade = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Failed to create checkout session')
      }
    } catch {
      setError('Failed to create checkout session')
    } finally {
      setLoading(false)
    }
  }

  const isPro = salon?.plan === 'pro'

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold mb-2">{salon?.name} Billing</h1>
          <p className="text-muted-foreground">Manage your subscription</p>
        </div>

        {success && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="size-5 text-emerald-600" />
            <span className="text-emerald-800">Your salon has been upgraded to Pro!</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="size-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        <Card className={isPro ? 'border-primary' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Pro Plan
              {isPro && <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Active</span>}
            </CardTitle>
            <CardDescription>For growing salons that need more</CardDescription>
            <p className="text-2xl font-bold">$29/month</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-4">
              <li className="flex items-start gap-2 text-sm">
                <Check className="size-4 text-primary mt-0.5" />
                <span>Unlimited customers</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="size-4 text-primary mt-0.5" />
                <span>Unlimited staff members</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="size-4 text-primary mt-0.5" />
                <span>Advanced reports</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="size-4 text-primary mt-0.5" />
                <span>All payment methods (MTN MoMo & Airtel Money)</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="size-4 text-primary mt-0.5" />
                <span>Priority support</span>
              </li>
            </ul>
            <Button
              className="w-full"
              variant={isPro ? 'outline' : 'default'}
              disabled={isPro || loading}
              onClick={handleUpgrade}
            >
              {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              {isPro ? 'Subscribed' : 'Upgrade Now'}
            </Button>
          </CardContent>
        </Card>
      </div>
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>
    </div>
  )
}