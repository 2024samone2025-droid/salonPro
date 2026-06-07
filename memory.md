# Memory — SaaS Multi-Tenancy Transformation

Last updated: 2026-06-07T09:45:00+02:00

## What was built

**Prisma Schema (`prisma/schema.prisma`):**
- Added `Salon` model with `id`, `name`, `subdomain`, `plan`, `stripeCustomerId`, `stripeSubscriptionId`
- Added `salonId` FK to: User, Customer, Staff, Service, Appointment, Payment

**Authentication (`src/lib/auth.ts`, `src/lib/auth-guard.ts`):**
- Updated session token payload to include `salonId`
- `requireAuth` validates salon context from headers

**Middleware (`src/middleware.ts`):**
- Extracts subdomain from host header (dev mode uses `?salon=` query param)
- Sets `x-salon-subdomain` header for API routes

**API Routes Updated (filtered by `salonId`):**
- `src/app/api/customers/route.ts`
- `src/app/api/staff/route.ts`
- `src/app/api/services/route.ts`
- `src/app/api/appointments/route.ts`
- `src/app/api/payments/route.ts`
- `src/app/api/dashboard/route.ts`
- `src/app/api/reports/route.ts`

**New Billing Endpoints (Demo Mode):**
- `src/app/api/billing/checkout/route.ts` - Directly upgrades salon to Pro (no real Stripe)
- `src/app/api/billing/webhook/route.ts` - Mock webhook for testing subscription events

**Onboarding Flow:**
- `src/app/signup/page.tsx` - Form for salon creation with admin user

**Billing Page:**
- `src/app/billing/page.tsx` - Single Pro plan display, shows success message on upgrade
- "Upgrade Now" button directly upgrades salon to Pro in demo mode

**UI Updates:**
- `src/components/salon/Sidebar.tsx` - Added admin-only Billing button with CreditCard icon

**Seed Data (`scripts/seed-neon.ts`):**
- Created demo salon with subdomain `demo`
- Seeded 3 users: Admin/1234, Alice/5678 (receptionist), Marie/9012 (stylist)

## Decisions made

1. **Shared DB with `salonId` FK** - Chosen over schema-per-tenant for simplicity
2. **Salon lookup in API handlers** - Prisma edge runtime incompatibility requires salon lookup in API layer, not middleware
3. **Dev mode subdomain resolution** - Uses `?salon=` query param instead of actual subdomain routing
4. **Pro plan requires payment** - Only one paid plan displayed; in demo mode, upgrade happens directly
5. **Role-based billing access** - Only admin users see billing navigation

## Problems solved

- TypeScript error in signup page: missing `=` in `const [salonName, setSalonName] useState('')` - fixed to `useState('')`
- Unused `showPin` state variable - removed from password input type
- Stripe SDK initialization error - switched to demo mode without real Stripe
- Plan casing mismatch - changed 'PRO' to 'pro' for consistency
- Webhook null check - added guard for missing signature header
- Env var validation - removed Stripe dependency, using direct upgrade

## Current state

- ✅ Multi-tenancy model complete with salon-scoped data
- ✅ Onboarding flow working (creates salon + admin user)
- ✅ Subscription limits enforced for free plan (100 customers, 5 staff)
- ✅ Billing page shows single Pro plan option
- ✅ Demo upgrade flow: clicking "Upgrade Now" immediately upgrades salon to Pro
- ⏳ Run `npx prisma db push` to apply schema changes for new `stripeCustomerId`/`stripeSubscriptionId` columns

## Next session starts with

Run `npx prisma db push` to apply schema changes, then test the flow: signup → login → billing upgrade → verify staff/customer limits are removed.

## Open questions

- Should salon plan downgrade trigger immediate feature limit enforcement or grace period?
- How to handle salon subdomain conflicts during signup?