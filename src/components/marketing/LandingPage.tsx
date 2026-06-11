'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import {
  CalendarDays,
  Users,
  Banknote,
  TrendingUp,
  Pencil,
  Smartphone,
  type LucideIcon,
} from 'lucide-react'
import './landing.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
})
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
})

const WHATSAPP_URL = 'https://wa.me/250780000000'

const features: { icon: LucideIcon; title: string; blurb: string; items: string[] }[] = [
  {
    icon: CalendarDays,
    title: 'Appointments',
    blurb: 'Book, reschedule and track every chair from one calendar.',
    items: ['Visual day & week view', 'Staff availability', 'Automatic WhatsApp & SMS reminders'],
  },
  {
    icon: Users,
    title: 'Clients',
    blurb: 'Know every client like a regular — even with 500 of them.',
    items: ['Visit history & preferences', 'Birthday reminders', 'One-tap rebooking'],
  },
  {
    icon: Banknote,
    title: 'Rwanda payments',
    blurb: 'Get paid the way your clients already pay.',
    items: ['MTN Mobile Money', 'Airtel Money', 'Cash, all reconciled daily'],
  },
  {
    icon: TrendingUp,
    title: 'Smart reports',
    blurb: 'See what’s really making you money.',
    items: ['Daily & monthly revenue', 'Top services & stylists', 'Payment method breakdown'],
  },
  {
    icon: Pencil,
    title: 'Service catalog',
    blurb: 'Your full menu, priced and timed.',
    items: ['Prices in RWF', 'Duration per service', 'Seasonal on/off toggle'],
  },
  {
    icon: Smartphone,
    title: 'Any device, anywhere',
    blurb: 'Works on the phone you already have.',
    items: ['Mobile-first design', 'Keeps working offline', 'Quick PIN login for staff'],
  },
]

const mockAppointments = [
  { time: '09:00', name: 'Clarisse U.', detail: 'Box braids · Divine', amount: '15,000 RWF', method: 'MTN MoMo', payClass: 'pay-momo' },
  { time: '11:30', name: 'Sandrine M.', detail: 'Wash & silk press · Aline', amount: '8,000 RWF', method: 'Cash', payClass: 'pay-cash' },
  { time: '14:00', name: 'Eric N.', detail: 'Fade + beard trim · Patrick', amount: '5,000 RWF', method: 'Airtel', payClass: 'pay-airtel' },
]

const faqs = [
  {
    q: 'Does it work when the internet is slow or off?',
    a: 'Yes. SalonPro keeps working offline — you can view today’s bookings and record payments, and everything syncs automatically when your connection returns.',
  },
  {
    q: 'How do I pay for the Pro plan?',
    a: 'With MTN Mobile Money or Airtel Money, directly from the app or by dial code. No bank card is ever required.',
  },
  {
    q: 'Can my staff use it on their own phones?',
    a: 'Yes. Each staff member gets their own PIN login. They see their own schedule, while only you see revenue and reports.',
  },
  {
    q: 'What happens to my data if I stop paying?',
    a: 'Your data always belongs to you. If you downgrade, you keep full access on the Free plan, and you can export your client list and records at any time.',
  },
  {
    q: 'Is it available in Kinyarwanda?',
    a: 'Client reminders can be sent in Kinyarwanda, French or English today, and a full Kinyarwanda interface is on the way.',
  },
]

// Nav CTA swaps to the dashboard for signed-in users (kept from the old MarketingHeader)
function NavCta() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div style={{ width: 110, height: 42 }} aria-hidden="true" />
  }
  if (user) {
    return (
      <Link className="btn btn-gold" href="/dashboard">
        Open dashboard
      </Link>
    )
  }
  return (
    <div className="nav-cta">
      <Link className="btn btn-ghost" href="/login">
        Log in
      </Link>
      <Link className="btn btn-gold" href="/signup">
        Start free
      </Link>
    </div>
  )
}

export default function LandingPage() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in')
            io.unobserve(entry.target)
          }
        }),
      { threshold: 0.12 }
    )
    document.querySelectorAll('.lp .reveal').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div className={`lp ${fraunces.variable} ${jakarta.variable}`}>
      {/* NAV */}
      <nav className="nav">
        <div className="wrap">
          <Link className="logo" href="/">
            <span className="logo-mark">S</span>SalonPro
          </Link>
          <ul className="nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#product">How it works</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>
          <AuthProvider>
            <NavCta />
          </AuthProvider>
        </div>
      </nav>

      {/* HERO */}
      <header className="hero">
        <div className="wrap">
          <div>
            <span className="eyebrow" style={{ color: 'var(--gold)' }}>
              Made for Rwandan salons
            </span>
            <h1>
              Your salon, <em>fully booked</em> and beautifully run.
            </h1>
            <p className="lead">
              Appointments, clients, staff and payments — managed from your phone. SalonPro speaks
              your market: prices in RWF, MTN MoMo &amp; Airtel Money built in, and WhatsApp
              reminders that end no‑shows.
            </p>
            <div className="hero-ctas">
              <Link className="btn btn-gold" href="/signup">
                Create your salon — free
              </Link>
              <a className="btn btn-ghost" href={WHATSAPP_URL}>
                Chat with us on WhatsApp
              </a>
            </div>
            <p className="hero-note">
              Free plan forever for small salons · No card needed · Set up in 10 minutes
            </p>
            <div className="hero-stats">
              <div>
                <b>40%</b>
                <span>fewer no‑shows with reminders</span>
              </div>
              <div>
                <b>RWF</b>
                <span>local pricing &amp; payments</span>
              </div>
              <div>
                <b>10 min</b>
                <span>average setup time</span>
              </div>
            </div>
          </div>

          {/* product mockup */}
          <div
            className="mock"
            role="img"
            aria-label="Preview of the SalonPro dashboard showing today's appointments"
          >
            <div className="mock-bar">
              <i></i>
              <i></i>
              <i></i>
              <span className="mock-title">SalonPro · Umurage Beauty Studio</span>
            </div>
            <div className="mock-body">
              <div className="mock-head">
                <h3>Today — Wednesday</h3>
                <span>6 bookings</span>
              </div>
              {mockAppointments.map((apt) => (
                <div key={apt.time} className={`appt ${apt.payClass}`}>
                  <span className="t">{apt.time}</span>
                  <span className="who">
                    <b>{apt.name}</b>
                    <span>{apt.detail}</span>
                  </span>
                  <span className="pay">
                    <b>{apt.amount}</b>
                    <span>{apt.method}</span>
                  </span>
                </div>
              ))}
              <div className="mock-foot">
                <span>Today’s revenue</span>
                <b>78,500 RWF</b>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* FEATURES */}
      <section className="features" id="features">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow">Everything in one place</span>
            <h2>Built around how salons in Rwanda actually work</h2>
            <p>
              Not a foreign tool with dollars and credit cards bolted on. Every feature was
              designed for your clients, your staff and your payments.
            </p>
          </div>
          <div className="grid-3">
            {features.map((f) => (
              <div key={f.title} className="card reveal">
                <div className="ico">
                  <f.icon size={22} strokeWidth={2} aria-hidden="true" />
                </div>
                <h3>{f.title}</h3>
                <p>{f.blurb}</p>
                <ul>
                  {f.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCT SHOWCASE */}
      <section className="show" id="product">
        <div className="wrap">
          <div className="reveal">
            <span className="eyebrow">End the no‑shows</span>
            <h2>Reminders your clients actually read</h2>
            <p>
              Missed appointments cost Kigali salons hours of empty chairs every week. SalonPro
              automatically sends a friendly WhatsApp or SMS reminder the day before and the
              morning of — in English, French or Kinyarwanda.
            </p>
            <ul className="tick">
              <li>Sent automatically — nothing for you to remember</li>
              <li>Clients confirm or reschedule with one reply</li>
              <li>Freed-up slots offered to your waiting list</li>
            </ul>
            <Link className="btn btn-gold" href="/signup">
              Try reminders free
            </Link>
          </div>
          <div
            className="phone reveal"
            role="img"
            aria-label="Phone showing a WhatsApp appointment reminder from a salon"
          >
            <div className="phone-screen">
              <div className="ph-head">
                <b>Umurage Beauty Studio</b>
                <span>via SalonPro</span>
              </div>
              <div className="msg">
                Muraho Clarisse! 💜 A reminder of your <b>box braids</b> appointment tomorrow at{' '}
                <b>9:00</b> with Divine. Reply <b>1</b> to confirm or <b>2</b> to reschedule.
                <time>18:02</time>
              </div>
              <div className="msg reply">
                1 — Ndaza! See you tomorrow 🙌<time>18:05</time>
              </div>
              <div className="msg">
                Perfect, you’re confirmed. Murakoze! ✨<time>18:05</time>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing" id="pricing">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow">Simple pricing, in francs</span>
            <h2>Start free. Upgrade when you grow.</h2>
            <p>No credit card needed — ever. Pay the Pro plan with MTN MoMo or Airtel Money.</p>
          </div>
          <div className="plans">
            <div className="plan reveal">
              <h3>Free</h3>
              <p className="sub">For small salons getting organised</p>
              <div className="price">
                0 <small>RWF / month</small>
              </div>
              <ul>
                <li>Up to 100 clients</li>
                <li>Up to 5 staff members</li>
                <li>Appointment calendar</li>
                <li>Cash payment tracking</li>
              </ul>
              <Link className="btn btn-ghost" href="/signup">
                Get started free
              </Link>
            </div>
            <div className="plan hot reveal">
              <span className="tag">Most popular</span>
              <h3>Pro</h3>
              <p className="sub">For growing salons that need more</p>
              <div className="price">
                15,000 <small>RWF / month</small>
              </div>
              <ul>
                <li>Unlimited clients &amp; staff</li>
                <li>WhatsApp &amp; SMS reminders</li>
                <li>MTN MoMo &amp; Airtel Money</li>
                <li>Advanced reports</li>
                <li>Priority support on WhatsApp</li>
              </ul>
              <Link className="btn btn-gold" href="/signup">
                Start 30‑day free trial
              </Link>
            </div>
          </div>
          <p className="momo-note">
            ✓ Pay by MoMo dial code or in‑app — cancel anytime, your data stays yours.
          </p>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="quotes" id="quotes">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow">Loved across Kigali</span>
            <h2>Salon owners are saying it best</h2>
          </div>
          <div className="grid-3">
            <div className="card reveal">
              <div className="stars" aria-label="5 out of 5 stars">
                ★★★★★
              </div>
              <p className="quote">
                “Before SalonPro I kept bookings in a notebook and lost clients every week. Now my
                chairs are full and <em>I can see my money clearly</em> — MoMo, Airtel and cash,
                all in one report.”
              </p>
              <div className="person">
                <span className="avatar" style={{ background: 'var(--plum)' }}>
                  JU
                </span>
                <span>
                  <b>Josiane Uwase</b>
                  <span>Umurage Beauty Studio · Kimironko</span>
                </span>
              </div>
            </div>
            <div className="card reveal">
              <div className="stars" aria-label="5 out of 5 stars">
                ★★★★★
              </div>
              <p className="quote">
                “The WhatsApp reminders changed everything. No‑shows dropped almost to zero in the
                first month, and clients love confirming with one reply.”
              </p>
              <div className="person">
                <span className="avatar" style={{ background: 'var(--gold-deep)' }}>
                  PN
                </span>
                <span>
                  <b>Patrick Niyonzima</b>
                  <span>Sharp Cuts Barbershop · Nyamirambo</span>
                </span>
              </div>
            </div>
            <div className="card reveal">
              <div className="stars" aria-label="5 out of 5 stars">
                ★★★★★
              </div>
              <p className="quote">
                “My staff learned it in one afternoon — the PIN login means everyone uses their
                own account on the same tablet. Even when internet drops, it keeps working.”
              </p>
              <div className="person">
                <span className="avatar" style={{ background: 'var(--green)' }}>
                  AM
                </span>
                <span>
                  <b>Aline Mukamana</b>
                  <span>Inzozi Hair &amp; Nails · Remera</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq" id="faq">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow">Questions, answered</span>
            <h2>Frequently asked questions</h2>
          </div>
          <div className="faq-list reveal">
            {faqs.map((faq) => (
              <details key={faq.q}>
                <summary>{faq.q}</summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="cta-final">
        <div className="wrap">
          <h2>Ready to run your salon smarter?</h2>
          <p>Set up your salon in 10 minutes. Free forever for small teams.</p>
          <Link className="btn btn-gold" href="/signup">
            Create your salon — free
          </Link>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <span>© 2026 SalonPro Rwanda · Kigali</span>
          <nav>
            <a href={WHATSAPP_URL}>WhatsApp us</a>
            <a href="mailto:hello@salonpro.rw">hello@salonpro.rw</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </nav>
        </div>
      </footer>

      {/* WhatsApp float */}
      <a className="wa" href={WHATSAPP_URL} aria-label="Chat with SalonPro on WhatsApp">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M16 3C9.4 3 4 8.4 4 15c0 2.6.8 5 2.3 7L4 29l7.2-2.2c1.9 1 4 1.6 6.2 1.6h.6c6.6 0 12-5.4 12-12S22.6 3 16 3zm5.9 17c-.3.8-1.7 1.6-2.3 1.6-.6.1-1.4.1-2.2-.1-.5-.2-1.2-.4-2-.8-3.6-1.5-5.9-5.1-6.1-5.4-.2-.2-1.4-1.9-1.4-3.6s.9-2.6 1.2-2.9c.3-.3.7-.4.9-.4h.7c.2 0 .5-.1.8.6.3.8 1 2.7 1.1 2.9.1.2.2.4 0 .7-.1.2-.2.4-.4.6l-.6.7c-.2.2-.4.4-.2.8.2.4 1 1.7 2.2 2.7 1.5 1.4 2.8 1.8 3.2 2 .4.2.6.1.9-.1.2-.3 1-1.2 1.3-1.6.3-.4.5-.3.9-.2.4.1 2.4 1.1 2.8 1.3.4.2.7.3.8.5.1.2.1 1-.2 1.7z" />
        </svg>
      </a>
    </div>
  )
}
