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

## Phase 3 — Booking rules
10. Extend `SalonSettings`: `minBookingLeadTimeHours`, `maxBookingAdvanceDays`, `bufferBeforeMinutes`,
    `bufferAfterMinutes` (+ `cancellationWindowHours` only if a cancel path exists). Update parser/validators.
11. Wire into the engine: lead-time + advance-window filter generated slots in
    `api/public/booking/[subdomain]/slots`; buffers extend the effective span in appointment conflict detection.
12. Add a "Booking rules" section to `SalonSettingsTab.tsx`. Commit.
