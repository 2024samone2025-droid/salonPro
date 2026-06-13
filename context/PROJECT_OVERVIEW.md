# Project Overview — SalonPro

## What this app is
**SalonPro** is a multi-tenant SaaS for **salon management in Rwanda / East Africa**. Each salon (tenant) gets its own subdomain and manages appointments, customers, staff, services, payments, and reports. It targets front-desk staff and owners on mid-range Android phones and a shared desktop, so the UI is mobile-first, touch-friendly, and tolerant of poor connectivity.

Character: **boutique, not bank** — warm neutrals with a single pink accent. See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).

## Core capabilities (built today)
- **Appointments** — day/week calendar, booking, status flow (booked → confirmed → in_progress → completed / no_show), conflict detection.
- **Customers (CRM)** — profiles, phone, notes, visit/service history.
- **Staff** — roster, roles (stylist / receptionist), active toggle, optional linked user account.
- **Services** — catalog with price + duration, active toggle.
- **Payments** — status (unpaid/partial/paid), method (cash / MTN MoMo / Airtel Money), amount; one payment per appointment.
- **Dashboard** — today's stats + upcoming appointments.
- **Reports** — revenue charts, top services/customers, payment & status breakdowns (recharts).
- **Public self-booking** — `/book/[subdomain]` flow gated by salon settings (business hours, slot interval, on/off toggle).
- **Settings** (admin) — salon profile, per-day business hours, booking prefs, currency; user accounts + role matrix.
- **Billing** — Free vs Pro plan; Pro = **15,000 RWF/month**. Stripe is currently **mock/demo** (no real charges).
- **Product tour** — Driver.js guided onboarding.
- **Marketing landing** at `/` — plum/gold "imigongo" theme, intentionally separate from the app theme.

## Tech stack
| Area | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router) | ^15.5.19 |
| Language | TypeScript | ^5 |
| React | React | 18.3.1 |
| Styling | Tailwind CSS | ^3.4.19 |
| UI kit | shadcn/ui (new-york, Radix primitives) | — |
| Icons | lucide-react | ^0.577 |
| ORM / DB | Prisma + Neon serverless Postgres | ^6.19 |
| Client state | Zustand | ^5.0 |
| Forms | react-hook-form + zod | ^7.77 / ^4.4 |
| Toasts | sonner | ^2.0 |
| Charts | recharts | ^2.15 |
| Animation | framer-motion | ^12 |
| Tour | driver.js | — |
| Payments | stripe (mock for now) | ^22 |
| Runtime tooling | Bun (seed script), npm (install/dev) | — |

## Running it
- `npm run dev` — dev server on port 3000 (logs to `dev.log`). **Do not start this from an agent.**
- `npm run build` — `prisma generate && next build`.
- `npm run db:push` / `db:migrate` / `db:seed` — Prisma schema + Neon seed (seed uses Bun).
- Env: see `.env.example` (needs `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, Stripe keys).

## Tenancy & demo access
- Salon resolved from **subdomain**; in dev use `?salon=<subdomain>` (e.g. `?salon=demo`). Resolved in `src/middleware.ts`.
- Demo seed users (name / PIN): **Admin / 1234**, **Alice / 5678**, **Marie / 9012** on salon `demo`.

## Status, known gaps & open questions
Carried from prior worklogs (consolidated here so they aren't lost):
- **Stripe is mocked** — real integration pending: create the 15,000 RWF price (zero-decimal currency), webhook, downgrade grace period.
- **Marketing ↔ product gap** — landing promises features not yet built: WhatsApp/SMS reminders, offline mode, birthday reminders, data export, 30-day Pro trial. Decide: build vs soften copy.
- **Landing placeholders** — WhatsApp number is `wa.me/250780000000` (`WHATSAPP_URL` in `LandingPage.tsx`); `/privacy` + `/terms` links have no pages.
- **Responsive** — icon-rail sidebar (768–1024px) and mobile booking FAB still pending.
- **Signup** — subdomain conflict handling on salon creation.
- Product scope / roadmap backlog: see [TODO.md](./TODO.md) (seeded from the original `must-have.md` MVP list).

## Source-of-truth docs
- Product/UX specs: **`specs/ui/`** (`design-system.md`, `app-shell.md`, `routes.md`) and `specs/product-tour-plan.md` — authoritative for design intent.
- This `/context/` folder: the engineering quick-reference distilled from the live code.
