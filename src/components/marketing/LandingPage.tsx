import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Calendar, Users, Scissors, BarChart3, CreditCard, Smartphone } from 'lucide-react'
import MarketingHeader from './MarketingHeader'

const features = [
  {
    icon: Calendar,
    title: 'Appointment Management',
    description: 'Book, reschedule, and track appointments with ease',
    items: ['Visual calendar view', 'Staff availability tracking', 'Automatic reminders'],
  },
  {
    icon: Users,
    title: 'Customer Relationship',
    description: 'Know your clients better',
    items: ['Visit history', 'Preference tracking', 'Quick booking'],
  },
  {
    icon: Scissors,
    title: 'Service Catalog',
    description: 'Manage all your offerings',
    items: ['Pricing in RWF', 'Duration tracking', 'Active/inactive toggle'],
  },
  {
    icon: BarChart3,
    title: 'Smart Reports',
    description: 'Make data-driven decisions',
    items: ['Revenue tracking', 'Top services', 'Payment methods'],
  },
  {
    icon: CreditCard,
    title: 'Rwanda Payments',
    description: 'Local payment methods built-in',
    items: ['MTN Mobile Money', 'Airtel Money', 'Cash payments'],
  },
  {
    icon: Smartphone,
    title: 'Multi-Device Access',
    description: 'Works on any device',
    items: ['Mobile responsive', 'Offline ready', 'Quick PIN login'],
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-background">
      <MarketingHeader />

      <main className="max-w-6xl mx-auto px-4 py-16">
        <section className="text-center mb-16">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Run Your Salon <span className="text-primary">Smarter</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            SalonPro helps Rwandan salons manage appointments, customers, staff, and payments
            all in one place. Grow your business with data-driven insights.
          </p>
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8">Start free trial</Button>
          </Link>
        </section>

        <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <feature.icon className="size-8 text-muted-foreground mb-2" />
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {feature.items.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="size-4 text-muted-foreground" /> {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="text-center mb-16">
          <h2 className="font-display text-3xl font-bold mb-4">Simple Pricing</h2>
          <p className="text-muted-foreground mb-8">Start free, upgrade when you&apos;re ready to grow</p>
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Free Plan</CardTitle>
                <CardDescription>Perfect for small salons getting started</CardDescription>
                <p className="font-display text-3xl font-bold">0 RWF<span className="text-sm font-normal font-sans text-muted-foreground">/month</span></p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-left text-sm mb-6">
                  <li className="flex items-center gap-2"><Check className="size-4 text-muted-foreground" /> Up to 100 customers</li>
                  <li className="flex items-center gap-2"><Check className="size-4 text-muted-foreground" /> Up to 5 staff members</li>
                  <li className="flex items-center gap-2"><Check className="size-4 text-muted-foreground" /> Basic appointment management</li>
                  <li className="flex items-center gap-2"><Check className="size-4 text-muted-foreground" /> Cash payments</li>
                </ul>
                <Link href="/signup" className="block">
                  <Button className="w-full" variant="outline">Get started free</Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle>Pro Plan</CardTitle>
                <CardDescription>For growing salons that need more</CardDescription>
                <p className="font-display text-3xl font-bold tabular-nums">15,000 RWF<span className="text-sm font-normal font-sans text-muted-foreground">/month</span></p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-left text-sm mb-6">
                  <li className="flex items-center gap-2"><Check className="size-4 text-muted-foreground" /> Unlimited customers</li>
                  <li className="flex items-center gap-2"><Check className="size-4 text-muted-foreground" /> Unlimited staff members</li>
                  <li className="flex items-center gap-2"><Check className="size-4 text-muted-foreground" /> Advanced reports</li>
                  <li className="flex items-center gap-2"><Check className="size-4 text-muted-foreground" /> MTN MoMo &amp; Airtel Money</li>
                  <li className="flex items-center gap-2"><Check className="size-4 text-muted-foreground" /> Priority support</li>
                </ul>
                <Link href="/signup" className="block">
                  <Button className="w-full">Start free trial</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="text-center">
          <h2 className="font-display text-3xl font-bold mb-4">Ready to transform your salon?</h2>
          <p className="text-muted-foreground mb-8">Join hundreds of Rwandan salons already using SalonPro</p>
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8">Create your salon</Button>
          </Link>
        </section>
      </main>

      <footer className="border-t py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 SalonPro Rwanda. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
