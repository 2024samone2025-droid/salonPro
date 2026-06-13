# Data Models — SalonPro

Source of truth: **`prisma/schema.prisma`** (PostgreSQL via Neon serverless adapter). All IDs are `cuid()`; every domain model has `createdAt`/`updatedAt` and a `salonId` FK with `onDelete: Cascade`.

## Entity overview
```
Owner >──< Salon   (via OwnerSalon join; global owner identity, admin per link)
            │
Salon ──┬─< Customer ──< Appointment >── Service
        ├─< Staff ─────< Appointment            │
        ├─< Service                              └── Payment (1:1)
        ├─< Appointment
        ├─< Payment
        └─< User >── Staff (optional link)      (per-salon staff auth)

OneTimeToken   standalone — single-use owner cross-domain login handoff
```

**Two auth identities:** `Owner` (global, email+password, admin via `OwnerSalon`) vs `User` (per-salon staff, email+password). Both use scrypt; PINs were retired. See ARCHITECTURE.md → Authentication.

## Models

### Salon (tenant root)
| Field | Type | Notes |
|---|---|---|
| `id` | String | PK |
| `name` | String | |
| `subdomain` | String | **unique** — tenant resolution. Rules below. |
| `plan` | String | `free` \| `pro` (default `free`) |
| `stripeCustomerId` | String? | |
| `stripeSubscriptionId` | String? | |
| `settings` | Json? | `SalonSettings`: businessHours, slotIntervalMinutes, publicBookingEnabled, currency — read via `parseSalonSettings()` |
| relations | — | customers, staff, services, appointments, payments, users, owners (OwnerSalon) |

#### Subdomain rules (single source of truth: `src/lib/constants.ts`)
A salon's `subdomain` is validated by **`validateSubdomain()`** in `lib/constants.ts` — the one place these rules live, shared by the signup page, the availability endpoint (`GET /api/salons?subdomain=`), and the create endpoint (`POST /api/salons`). The module is client-safe, so the UI and the API can never disagree.

- **Charset**: lowercase `a–z`, digits `0–9`, hyphen. Must start and end alphanumeric (no leading/trailing hyphen). Pattern: `^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$`.
- **Length**: `SUBDOMAIN_MIN_LENGTH` 3 … `SUBDOMAIN_MAX_LENGTH` 30.
- **Reserved**: not in `RESERVED_SUBDOMAINS` (infra/product names — `www`, `api`, `app`, `admin`, `billing`, `salonpro`, … ~35 total). `demo` is intentionally **not** reserved (legitimate seed tenant; the unique constraint already protects it).
- **Uniqueness / race**: the DB `@unique` constraint is authoritative. `POST /api/salons` keeps a fast pre-check for a friendly 409, and also catches Prisma **P2002** on `subdomain` (and on owner `email`) → 409 (prevents the two-simultaneous-signups race from surfacing as a 500).

When adding a reserved name or changing the rules, edit `RESERVED_SUBDOMAINS` / `validateSubdomain()` in `lib/constants.ts` and update this section.

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
`status` (`unpaid` \| `partial` \| `paid`, default `unpaid`), `method` (`cash` \| `mtn_momo` \| `airtel_money`, default `cash`), `amount` (Float, default 0), `salonId`, `appointmentId` (**unique**). Indexes: `status`, `method`, `salonId`. (`PAYMENT_STATUS_CONFIG` in `lib/constants.ts` is keyed `partial` to match.)

### User (per-salon staff auth)
`name`, `email` (lowercased), `passwordHash` (**scrypt** `salt:hash`, `lib/password.ts`), `role` (`admin` \| `receptionist` \| `stylist`, default `receptionist`), `active` (Bool), `tourCompleted` (Bool), `staffId?` (optional link to Staff, `onDelete: SetNull`), `salonId`. **`@@unique([salonId, email])`** — email is the login handle, unique within a salon. Indexes: `role`, `salonId`. Belongs to exactly one salon; login is email + password at the tenant host (`/api/auth/login`). PINs were retired.

### Owner (global owner identity)
| Field | Type | Notes |
|---|---|---|
| `id` | String | PK |
| `email` | String | **unique**, stored lowercased — the global login handle |
| `passwordHash` | String | **scrypt** `salt:hash` (`lib/password.ts`) — same scheme as staff `User` |
| `name` | String | |
| `mustResetPassword` | Boolean | default false. Set by the backfill script; **enforcement deferred** — currently an unenforced marker (login works with the temp password). |
| relations | — | `salons` (OwnerSalon[]) |

An owner sits **above** `User` and carries admin rights to each linked salon **directly** — it does not need a `User` row. Sign-in: email+password at the root host → exchange handoff to a subdomain (see ARCHITECTURE.md).

### OwnerSalon (owner ↔ salon membership)
`ownerId` (→ Owner, cascade), `salonId` (→ Salon, cascade), `createdAt`. **`@@unique([ownerId, salonId])`**, index on `salonId`. One owner may run several salons; one salon may have several owners. This link is what grants an owner admin to a salon (verified per request by `requireAuth`).

### OneTimeToken (owner login handoff nonce)
`id` (PK = the `jti` carried in the signed exchange token), `ownerId`, `salonId`, `expiresAt`, `consumedAt?`, `createdAt`. Index on `expiresAt`. Single-use: `/api/auth/exchange` consumes it atomically (`updateMany` guarded by `consumedAt: null` + unexpired) before setting the owner session cookie. 60s TTL.

## Application-level types (not in DB, but canonical)
| Type | Location | Purpose |
|---|---|---|
| `AppointmentStatus`, `PaymentStatus` | `lib/constants.ts` | status unions + display config |
| `UserRole`, `Permissions`, `ROLE_PERMISSIONS` | `lib/permissions.ts` | role → capability matrix |
| `SalonSettings`, `BusinessHours`, `DayHours`, `SupportedCurrency` | `lib/salon-settings.ts` | the `Salon.settings` JSON shape (currencies: RWF/USD/KES/UGX) |
| `NavItem` | `components/salon/nav-items.ts` | nav config |

## API surface (handlers in `src/app/api/`)
All authed routes scoped by `salonId` via `requireAuth` (salonId from the Host, not the body/token). Verb convention: `GET` list/filter · `POST` create · `PUT` update (`id` in body) · `DELETE` (`?id=`).

| Route | Purpose |
|---|---|
| `auth/login`, `auth/logout`, `auth/me` | staff session lifecycle (email + password), host-aware |
| `auth/exchange` | consume single-use owner token (on subdomain) → set owner session cookie |
| `auth/signup` | add a staff `User` to the current salon (requires auth) |
| `owner/login`, `owner/me`, `owner/select` | owner email/password login + salon picker + mint exchange token (root host) |
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
| `salons` | create salon: unauth → new `Owner`+`Salon`+link; authed owner → link only; **staff → 403**. GET = subdomain availability |
| `seed` | demo data (8 customers, 4 staff, 8 services, 16 appointments) |

## DB workflow
`npm run db:push` (sync schema — **this repo's workflow**; migrations are baselined, so `db:migrate`/`migrate dev` would offer a destructive reset) · `db:generate` (client) · `db:seed` · `db:reset` · `db:deploy`. `prisma generate` runs on `postinstall` and in `build`. One-off scripts (e.g. `scripts/backfill-owners.ts`) run via `npx tsx <script>` (no bun needed).
