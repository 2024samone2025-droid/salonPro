'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Loader2 } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    description: 'Perfect for small salons getting started',
    features: [
      'Up to 100 customers',
      'Up to 5 staff members',
      'Basic appointment management',
      'RWF payments',
    ],
    current: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29/month',
    description: 'For growing salons that need more',
    features: [
      'Unlimited customers',
      'Unlimited staff',
      'Advanced reports',
      'MTN MoMo & Airtel Money payments',
      'Priority support',
    ],
    current: false,
  },
]

export default function BillingPage() {
  const { salon } = useAuth()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') return
    setLoadingPlan(planId)
    // TODO: Integrate with Stripe
    alert('Stripe integration coming soon! Contact support to upgrade your plan.')
    setLoadingPlan(null)
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto pt-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold mb-2">{salon?.name} Billing</h1>
          <p className="text-muted-foreground">Manage your subscription</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = salon?.plan === plan.id
            return (
              <Card key={plan.id} className={isCurrent ? 'border-primary' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {plan.name}
                    {isCurrent && <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Current</span>}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <p className="text-2xl font-bold">{plan.price}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="size-4 text-primary mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={isCurrent ? 'outline' : 'default'}
                    disabled={isCurrent || loadingPlan === plan.id}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {loadingPlan === plan.id ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                    {isCurrent ? 'Current Plan' : 'Upgrade to Pro'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>
    </div>
  )
}