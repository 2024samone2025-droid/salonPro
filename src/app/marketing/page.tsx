import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Triangle, Calendar, Users, Scissors, BarChart3, CreditCard } from 'lucide-react'

export const metadata = {
  title: 'SalonPro Rwanda - Salon Management System',
  description: 'Professional salon management system for Rwanda. Manage appointments, customers, staff, and payments.',
}

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-sidebar-accent">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-md bg-primary">
              <Triangle className="size-5 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="text-xl font-semibold">SalonPro</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/signup">
              <Button variant="ghost">Sign Up</Button>
            </Link>
            <Link href="/">
              <Button>Login</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-16">
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Run Your Salon <span className="text-primary">Smarter</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            SalonPro helps Rwandan salons manage appointments, customers, staff, and payments
            all in one place. Grow your business with data-driven insights.
          </p>
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8">Start Free Trial</Button>
          </Link>
        </section>

        <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <Card>
            <CardHeader>
              <Calendar className="size-8 text-primary mb-2" />
              <CardTitle>Appointment Management</CardTitle>
              <CardDescription>Book, reschedule, and track appointments with ease</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> Visual calendar view</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> Staff availability tracking</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> Automatic reminders</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="size-8 text-primary mb-2" />
              <CardTitle>Customer Relationship</CardTitle>
              <CardDescription>Know your clients better</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> Visit history</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> Preference tracking</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> Quick booking</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Scissors className="size-8 text-primary mb-2" />
              <CardTitle>Service Catalog</CardTitle>
              <CardDescription>Manage all your offerings</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> Pricing in RWF</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> Duration tracking</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> Active/inactive toggle</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="size-8 text-primary mb-2" />
              <CardTitle>Smart Reports</CardTitle>
              <CardDescription>Make data-driven decisions</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> Revenue tracking</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> Top services</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> Payment methods</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CreditCard className="size-8 text-primary mb-2" />
              <CardTitle>Rwanda Payments</CardTitle>
              <CardDescription>Local payment methods built-in</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> MTN Mobile Money</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> Airtel Money</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> Cash payments</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Calendar className="size-8 text-primary mb-2" />
              <CardTitle>Multi-Device Access</CardTitle>
              <CardDescription>Works on any device</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> Mobile responsive</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> Offline ready</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> Quick PIN login</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <section className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Simple Pricing</h2>
          <p className="text-muted-foreground mb-8">Start free, upgrade when you're ready to grow</p>
          <div className="max-w-md mx-auto">
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle>Free Plan</CardTitle>
                <CardDescription>Perfect for small salons getting started</CardDescription>
                <p className="text-3xl font-bold">RWF 0<span className="text-sm font-normal text-muted-foreground">/month</span></p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-left mb-6">
                  <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> Up to 100 customers</li>
                  <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> Up to 5 staff members</li>
                  <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> Basic appointment management</li>
                  <li className="flex items-center gap-2"><Check className="size-4 text-primary" /> Cash payments</li>
                </ul>
                <Link href="/signup" className="w-full">
                  <Button className="w-full" variant="outline">Get Started</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to transform your salon?</h2>
          <p className="text-muted-foreground mb-8">Join hundreds of Rwandan salons already using SalonPro</p>
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8">Create Your Salon</Button>
          </Link>
        </section>
      </main>

      <footer className="border-t py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 SalonPro Rwanda. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}