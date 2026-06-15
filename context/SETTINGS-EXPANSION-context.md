# Settings Expansion — Build Plan (SOURCE OF TRUTH)

> **Status:** Approved 2026-06-15. This doc is the authoritative plan for the settings
> expansion work. The reference catalog in `Salon-settings-context.md` is aspirational;
> **this file** says what we actually build and what we deliberately defer. When the two
> disagree, this file wins. Update this file if scope changes.

## Guiding principle
Build only **honorable** settings: either (a) pure stored data we display, or (b) a setting
that wires into an engine that already exists. Anything with no engine/infra behind it is
**explicitly deferred** — we do not ship dead toggles.

## Vocabulary (aligned to the codebase, not the reference doc)
- **Salon** = the tenant (Host-resolved). Not "tenant."
- **Roles** = `admin / receptionist / stylist` + global `Owner`. **No `manager`, no per-user permission toggles.**
- **Salon settings** = the typed `SalonSettings` JSON blob (`lib/salon-settings.ts`), extended in place. **Not** a key-value table.
- **Account settings** = NEW per-user JSON blob on `User` and `Owner`, distinct from the admin-only salon Settings screen.

## Decisions (locked)
1. **User-settings storage** → `settings Json?` on **both** `User` and `Owner`, read through a shared typed parser mirroring `parseSalonSettings()`. No new tables.
2. **Inert settings** → build only what we can honor now; defer the rest.
3. **Role model** → unchanged. Staff-depth (manager, per-user perms, pay/commission, performance targets) **deferred entirely**.
4. **Personal-settings IA** → a separate **Account** route/screen reachable by all roles (incl. owners), distinct from the admin-only Settings screen.
5. **Theme** → server `settings.theme` is source of truth; `localStorage` stays only as the pre-auth paint cache; sync on login and on change.

## Assumptions (flag if wrong before relying on them)
- **No blob/file-upload infra** → logo + profile photo are **URL string inputs**, not uploads. Upload deferred.
- **No i18n, no real timezone handling** → `preferred_language` and `timezone` deferred (would be dead data).
- **No email infra** → email-change-with-reverification deferred. Password change **reuses existing** `/api/auth/change-password` (staff); owners manage theirs at the apex.
- **Cancellation window** honored only if a cancel/reschedule action exists to gate it; otherwise deferred with the other booking-rule items.
- Profile fields use **Rwanda-appropriate** shapes (district not state/zip, TIN not EIN, WhatsApp in social links).
- Own branch **off `main`**; keep separate from the unrelated uncommitted `feat/activity-log` changes (`memory.md`, `src/lib/auth.ts`). **Incremental commits, one per change.** `db:push` (not migrations) syncs new columns.

## Deferred (NOT building now — do not stub)
No-show fees · deposits · require-card-on-file · 2FA · active sessions · OAuth linking ·
notification channels/templates/reminders · marketing/integrations · inventory · packages/
memberships/loyalty · promotions · tax/invoice/receipts · manager role · per-user permissions ·
commission/pay/payroll · performance targets · multi-location · audit-log settings ·
email change · file uploads · i18n language · timezone.

---

## Phase 1 — Salon profile (smallest, lowest risk)
Extends the existing salon settings blob; admin-only via existing `/api/salon/settings`.
1. Extend `SalonSettings` in `lib/salon-settings.ts`: add `profile` sub-object
   (`logoUrl?`, `phone?`, `websiteUrl?`, `address?` {street, city, district, country},
   `socialLinks?` {instagram, facebook, tiktok, whatsapp}, `tinNumber?`, `licenseNumber?`).
   Update `DEFAULT_SETTINGS`, `parseSalonSettings` (validate/whitelist each), `validateSettingsPatch`.
2. Confirm/extend the PATCH deep-merge in `api/salon/settings/route.ts` for the new nested
   object (client sends full `profile`; special-case it like `businessHours`).
3. Add a "Business profile" section to `SalonSettingsTab.tsx` (existing primitives + tokens). Commit.

## Phase 2 — Account area (the structural one)
4. Schema: add `settings Json?` to `User` and `Owner`; `npm run db:push`; `db:generate`.
5. New `lib/user-settings.ts`: `UserSettings` type + `parseUserSettings()` + `validateUserSettingsPatch()`.
   - profile: `jobTitle`, `bio`, `photoUrl`
   - appPreferences (honored now): `theme`, `calendarDefaultView`
   - `displayName` maps to the real `name` column, NOT the blob.
   - **DEFERRED from appPreferences** (no clean read-site → would be dead toggles):
     `defaultLandingView` (login hardcodes `/dashboard`; pref unknown until /me resolves),
     `timeFormat`, `firstDayOfWeek` (broad cross-app formatting wiring). Revisit when wired.
6. New `app/api/me/settings/route.ts` (GET/PATCH) branching on `auth.kind` — staff → `User`,
   owner → `Owner` — mirroring `/api/auth/me`. Updates `name` + `settings`.
7. New `(app)/account/page.tsx` + `components/salon/AccountView.tsx`, **ungated** (all roles + owners).
   Surface: profile fields, app preferences, and the existing staff password-change for staff users.
8. Theme wiring: AccountView writes theme to server + localStorage; `/api/auth/me` load hydrates
   localStorage from server theme; bootstrap script keeps reading localStorage for instant paint.
9. Nav entry in `nav-items.ts` (display-only). Honor `defaultLandingView` / `calendarDefaultView` /
   `timeFormat` / `firstDayOfWeek` at their read-sites. Commit per change.

## Phase 4 — Staff weekly availability (catalog §4.1, core) — DONE (uncommitted)
Per-stylist weekly working hours, keyed to the **Staff roster entry** (NOT User — the
booking engine + appointments are Staff-keyed, and stylists may have no User account).
Catalog §4.1 adapted: `user_id` → `Staff`; relational table → JSON field (consistent with
how businessHours is stored). Scope = core weekly template only. **Deferred:** time-off
approval workflow, recurring breaks, max-per-day, effective-date, staff self-service editing.
- `Staff.availability Json?` (db:push). null = follows salon hours (no behavior change).
- `lib/staff-availability.ts`: `StaffAvailability` (reuses `DayHours`), `parseStaffAvailability`
  (→ null when unset/incomplete), `validateStaffAvailability`, `availabilityFromBusinessHours`.
- Staff `PUT` validates `availability`; also **closed a pre-existing cross-tenant hole**
  (update was `where:{id}` with no salon scope) via an ownership guard.
- Slot engine intersects salon hours ∩ stylist availability in BOTH the `slots` route and
  the public booking `POST` (unset → salon hours).
- StaffView edit dialog: "Custom working hours" toggle + 7-day grid (stylists only; seeds
  from salon business hours).

## Phase 6 — Services depth (catalog §3.3 Service Catalog) — DONE (uncommitted)
Add three honorable fields to `Service`, each wired to an existing engine (no dead data):
- `category String @default("")` — groups the catalog (shown/grouped in ServicesView).
- `description String @default("")` — client-facing; surfaced on the public booking page.
- `onlineBookable Boolean @default(true)` — filters the public booking surface (in-store-only
  services are hidden from / rejected by online booking but still bookable at the front desk).
**Deferred (catalog §3.3, no engine yet):** per-staff pricing, peak pricing, deposits, packages,
memberships, loyalty, promotions, service image upload, per-location overrides.
1. Schema: add the 3 fields to `Service` (all defaulted → no backfill). db:push.
2. Services API: POST/PUT accept the new fields; **whitelist editable fields + close pre-existing
   tenancy holes** (PUT/DELETE were `where:{id}` unscoped; POST unvalidated) — same hardening as
   the staff PUT. Validate price ≥ 0, duration > 0.
3. Engine: public booking GET filters `onlineBookable: true` + returns `description`/`category`;
   slots route + public POST service lookups require `onlineBookable: true` (server-side).
4. UI: ServicesView add/edit form gains category + description + online-bookable toggle;
   BookingFlow shows the description under each service name.

## Phase 5 — Days off (salon-wide + per-stylist closures) — DONE (uncommitted)
Admin-recorded whole-day closures that block online booking and are written to the activity
log. Covers catalog §3.1 `holiday_schedule` + §4.1 `time_off`, UNIFIED into one model.
**Decision:** a single relational `DayOff` model with a **nullable `staffId`** — null = whole
salon closed (public holiday); set = just that stylist is off. (Deliberately relational, NOT
JSON like Phase 4 — this is an unbounded dated list queried by date overlap; settings-JSON
holidays idea was rejected.) No approval workflow (admin sets it, immediately authoritative).
**Scope now:** whole-day only, single date per entry, admin-gated, scope picker = Whole salon
+ active stylists only. **Deferred:** partial-day windows, half-day custom hours, multi-day
ranges, staff self-service.
1. Schema: `DayOff { id, date (YYYY-MM-DD), reason, salonId, staffId?, createdAt }`,
   `@@index([salonId, date])` + `@@index([staffId])`, cascade from Salon AND Staff. db:push.
2. API `app/api/day-offs/route.ts`: GET (salon-scoped, joins staff name), POST (validate date +
   staffId-belongs-to-salon), DELETE (?id=). Admin-gated; each mutation → logActivity.
3. Engine: slots route + public POST run one query
   `findFirst({ salonId, date, OR: [{ staffId: null }, { staffId }] })` → closed → no slots / 400.
4. UI: `SalonClosures.tsx` (day-offs + active stylists) — list of upcoming/past with remove +
   add form (date, scope picker, reason). Rendered as a card in the Salon settings tab.

## Phase 3 — Booking rules — DONE
Scope: **public/customer-facing online booking only** — NOT the internal front-desk
appointments route (applying buffers/lead-time there would block deliberate back-to-back
booking, surprising staff). `cancellationWindowHours` **deferred** (no public cancel path).
10. `SalonSettings.bookingRules` sub-object: `minLeadTimeHours`, `maxAdvanceDays`,
    `bufferBeforeMinutes`, `bufferAfterMinutes`. Defaults preserve current behaviour
    (0 lead / 0 buffers / 365-day window). Parsed with clamp; validated at write time
    against `BOOKING_RULE_BOUNDS`. Deep-merged in the settings PATCH.
11. Wired into both public surfaces:
    - `slots` route: advance-window caps the date; lead-time filters each candidate by
      real timestamp; buffers widen the candidate span ([start−before, end+after]) when
      testing overlap against existing appointments.
    - public booking `POST`: same lead-time + advance-window guards (server-side, since a
      client could POST directly); buffers widen the conflict query window via `toClock()`.
12. "Booking rules" card added to `SalonSettingsTab.tsx` (4 numeric inputs, copy notes it
    only affects online bookings).
