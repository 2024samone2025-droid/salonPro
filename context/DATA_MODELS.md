# Data Models — SalonPro

Source of truth: **`prisma/schema.prisma`** (PostgreSQL via Neon serverless adapter). All IDs are `cuid()`; every domain model has `createdAt`/`updatedAt` and a `salonId` FK with `onDelete: Cascade`.

## Entity overview
```
Salon ──┬─< Customer ──< Appointment >── Service
        ├─< Staff ─────< Appointment            │
        ├─< Service                              └── Payment (1:1)
        ├─< Appointment
        ├─< Payment
        └─< User >── Staff (optional link)
```

## Models

### Salon (tenant root)
| Field | Type | Notes |
|---|---|---|
| `id` | String | PK |
| `name` | String | |
| `subdomain` | String | **unique** — tenant resolution |
| `plan` | String | `free` \| `pro` (default `free`) |
| `stripeCustomerId` | String? | |
| `stripeSubscriptionId` | String? | |
| `settings` | Json? | `SalonSettings`: businessHours, slotIntervalMinutes, publicBookingEnabled, currency — read via `parseSalonSettings()` |
| relations | — | customers, staff, services, appointments, payments, users |

### Customer
`name`, `phone`, `notes` (default ''), `salonId`, `appointments[]`. Indexes: `phone`, `name`, `salonId`.

### Staff
`name`, `phone` (''), `role` (`stylist` \| `receptionist`, default `stylist`), `active` (Bool, default true), `salonId`, `appointments[]`, `users[]`. Indexes: `role`, `salonId`.

### Service
`name`, `price` (Float, salon currency), `duration` (Int, minutes), `active` (Bool), `salonId`, `appointments[]`. Indexes: `name`, `salonId`.

### Appointment
| Field | Type | Notes |
|---|---|---|
| `date` | String | `YYYY-MM-DD` (string for easy querying) |
| `startTime` / `endTime` | String | `HH:mm` |
| `status` | String | `booked` \| `confirmed` \| `in_progress` \| `completed` \| `no_show` (default `booked`) |
| `notes` | String | '' |
| FKs | — | `salonId`, `customerId`, `staffId`, `serviceId` (all cascade) |
| `payment` | Payment? | 1:1 |
Indexes: `date`, `status`, `staffId`, `customerId`, `salonId`.

### Payment (1:1 with Appointment)
`status` (`unpaid` \| `partial` \| `paid`, default `unpaid`), `method` (`cash` \| `mtn_momo` \| `airtel_money`, default `cash`), `amount` (Float, default 0), `salonId`, `appointmentId` (**unique**). Indexes: `status`, `method`, `salonId`.

> Note: the DB `Payment.status` comment lists `partial`, while the UI's `PAYMENT_STATUS_CONFIG` (`lib/constants.ts`) keys it `partially_paid`. Reconcile when touching payments (see [TODO.md](./TODO.md)).

### User (auth account)
`name`, `pin` (SHA-256 hash), `role` (`admin` \| `receptionist` \| `stylist`, default `receptionist`), `active` (Bool), `staffId?` (optional link to Staff, `onDelete: SetNull`), `salonId`. Indexes: `role`, `pin`, `salonId`.

## Application-level types (not in DB, but canonical)
| Type | Location | Purpose |
|---|---|---|
| `AppointmentStatus`, `PaymentStatus` | `lib/constants.ts` | status unions + display config |
| `UserRole`, `Permissions`, `ROLE_PERMISSIONS` | `lib/permissions.ts` | role → capability matrix |
| `SalonSettings`, `BusinessHours`, `DayHours`, `SupportedCurrency` | `lib/salon-settings.ts` | the `Salon.settings` JSON shape (currencies: RWF/USD/KES/UGX) |
| `NavItem` | `components/salon/nav-items.ts` | nav config |

## API surface (handlers in `src/app/api/`)
All authed routes scoped by `salonId` via `requireAuth`. Verb convention: `GET` list/filter · `POST` create · `PUT` update (`id` in body) · `DELETE` (`?id=`).

| Route | Purpose |
|---|---|
| `auth/login`, `auth/logout`, `auth/me`, `auth/signup` | session lifecycle (PIN) |
| `customers` | CRUD + `?q=` search; free-plan cap 100 |
| `staff` | CRUD + active filter; free-plan cap 5 |
| `services` | CRUD + active filter |
| `appointments` | CRUD + filters (date/staffId/status/from/to); conflict detection |
| `payments` | GET (status/method filters), POST, PUT |
| `dashboard` | today's aggregated stats |
| `reports` | revenue/top-services/customers/breakdowns (period/from/to) |
| `salon/settings` | read/update `Salon.settings` |
| `users`, `users/[id]`, `users/me/tour-complete` | account management + tour flag |
| `billing/checkout`, `billing/webhook` | **mock** Pro upgrade (no real Stripe) |
| `public/booking/[subdomain]`, `.../slots` | public self-booking (gated by settings) |
| `salons` | salon record |
| `seed` | demo data (8 customers, 4 staff, 8 services, 16 appointments) |

## DB workflow
`npm run db:push` (sync schema) · `db:migrate` (dev migration) · `db:generate` (client) · `db:seed` (Bun seed) · `db:reset` · `db:deploy` (prod migrations). `prisma generate` runs on `postinstall` and in `build`.
