'use client'

import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from 'lucide-react'

export default function BillingPage() {
  const { salon } = useAuth()
  const isPro = salon?.plan === 'pro'

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold mb-2">{salon?.name} Billing</h1>
        <p className="text-muted-foreground">Manage your subscription</p>
      </div>

      <Card className={isPro ? 'border-primary' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Pro Plan
            {isPro && <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Active</span>}
          </CardTitle>
          <CardDescription>For growing salons that need more</CardDescription>
          <p className="text-2xl font-bold tabular-nums">15,000 RWF<span className="text-sm font-normal text-muted-foreground">/month</span></p>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start gap-2 text-sm">
              <Check className="size-4 text-muted-foreground mt-0.5" />
              <span>Unlimited customers</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <Check className="size-4 text-muted-foreground mt-0.5" />
              <span>Unlimited staff members</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <Check className="size-4 text-muted-foreground mt-0.5" />
              <span>Advanced reports</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <Check className="size-4 text-muted-foreground mt-0.5" />
              <span>All payment methods (MTN MoMo & Airtel Money)</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <Check className="size-4 text-muted-foreground mt-0.5" />
              <span>Priority support</span>
            </li>
          </ul>
          <Button className="w-full" variant="outline" disabled>
            {isPro ? 'Subscribed' : 'Contact us to upgrade'}
          </Button>
          {!isPro && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Upgrades are handled by SalonPro — contact us to move to Pro.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
