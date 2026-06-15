# SalonPro — Staff-Invite Onboarding · Context / Handoff

Use this to resume cold. It captures the architecture facts, locked decisions,
the approved implementation, the 5 corrections still pending, and next steps.

---

## 1. Goal

An admin/owner creates a staff member who starts **inactive with no usable
password**, and gets a **single one-time link** to deliver manually (WhatsApp,
SMS, in person — anywhere). The invitee opens the link, confirms identity with
**name + phone**, sets a password (≥12 chars), and is signed in on the correct
tenant host. No existing login/token/cookie logic is modified — only reused.

**Security boundary = the 256-bit random token in the link.** Name+phone is a
rate-limited *confirmation layer*, not the boundary.

---

## 2. Architecture facts that constrain the design (SalonPro)

- Next.js ^15.5.19, App Router. Custom auth (no NextAuth/Clerk).
- Sessions: HMAC-signed JSON in an httpOnly cookie `salonpro_session`,
  **host-scoped (no Domain attr)**, 7-day expiry. Minted via `createSessionToken`.
- Passwords: scrypt via `lib/password.ts` (`hashPassword`, `verifyPassword`,
  format `salt$hash`). `verifyPassword` returns **false** on empty/malformed
  stored hash (does not throw) — this is what makes the sentinel safe.
- Tenancy = **subdomain**. `middleware.ts` extracts the label →
  `x-salon-subdomain` header (`SALON_SUBDOMAIN_HEADER`). Salon resolved in Node
  via `db.salon.findUnique({ where: { subdomain } })`. Salon comes from the
  **Host, never the token** (`SessionUser` omits salonId).
- `requireAuth(req, 'canManageStaff')` gates API routes; returns
  `{ authorized, error, user, salonId }`. `permissions.canManageStaff` is true
  for `admin` only. **Owners** pass `requireAuth` as `kind:'owner'` with
  `ROLE_PERMISSIONS.admin`, so owners can invite too (intended).
- `User` model: per-salon login identity, `@@unique([salonId, email])`,
  `passwordHash NOT NULL`, login = `findFirst({ salonId, email, active:true })` +
  `verifyPassword`. The same email may be staff at more than one salon.
- Owner cross-domain handoff uses a replay-safe single-use nonce
  (`updateMany where consumedAt:null → set consumedAt`). The accept flow reuses
  this exact pattern.
- Env constraints: **serverless Neon/Vercel** (no shared in-memory store);
  **libphonenumber-js NOT installed**; no audit table.

---

## 3. Decisions locked

1. **Pre-acceptance password** → `passwordHash: ''` sentinel. `verifyPassword`
   returns false on it → login impossible until accept. No schema-nullability,
   no login change. Activation must set `passwordHash` AND `active:true` in the
   **same** update.
2. **Email** → **required** at invite (it's the future login identifier;
   nullable = permanent lockout after session expiry). Uniqueness scoped to
   `{ salonId, email }`.
3. **Phone** → lightweight `normalizePhone`: bare/0-prefixed → Rwanda `+250`;
   `+<cc>` passes through. Stored E.164. No new dependency.
4. **Rate limiting** → durable DB limiter only: `StaffInvite.attempts` +
   `lockedUntil` (5 mismatches → 15-min lock), enforced server-side in the accept
   route. IP captured for audit only (in-memory IP throttle is useless on
   serverless). Token (256-bit, hashed at rest, single-use) is the real boundary.
5. **Owners-with-admin may invite.** Audit = structured `console.info`
   (event, actorId, salonId, userId, ISO timestamp). **Raw token never logged.**
6. **Staff member = a `User` row only** (login identity); `staffId` left null,
   `Staff` scheduling record linked later by an admin.
7. **`mustResetPassword` stays false** for invited users — the token flow already
   forces them to set their own password.
8. Constants: invite TTL 72h · lock 15m · max attempts 5 · min password 12.

---

## 4. Files (8) — diffs drafted, NOT yet applied

1. `prisma/schema.prisma` — add `phone String?` to `User`; add `invite
   StaffInvite?` back-relation; add `StaffInvite` model (`tokenHash @unique`,
   `userId @unique`, `attempts`, `lockedUntil`, `expiresAt`, `consumedAt`,
   `onDelete: Cascade`). Redundant `@@index([tokenHash])` dropped (the `@unique`
   already creates it).
2. Prisma migration (AddColumn phone; CreateTable StaffInvite; unique indexes; FK).
3. `src/lib/invite.ts` — `generateInviteToken` (32 random bytes base64url),
   `hashInviteToken` (sha256 hex), `buildAcceptUrl` (mirrors `buildExchangeUrl`),
   `normalizePhone`, `constantTimeEqual`.
4. `src/app/api/staff/invite/route.ts` — `POST` create (auth+canManageStaff,
   validate, uniqueness, create User+invite, return `{ acceptUrl }`, audit) and
   `GET ?token=` validity probe (returns only `{ valid }`, no PII/enumeration).
5. `src/app/api/staff/invite/accept/route.ts` — resolve salon from host, load
   invite, generic-invalid checks, constant-time name+phone, attempts/lock,
   password length, atomic consume, activate user, mint session cookie, audit.
6. `src/app/api/staff/invite/revoke/route.ts` — revoke; optional `rotate` issues
   a fresh token + 72h expiry + resets attempts/lock; old link dies.
7. `src/app/accept-invite/page.tsx` — server page, reads `?token`, renders form.
8. `src/app/accept-invite/AcceptInviteForm.tsx` — client form (name, phone,
   password+confirm, `autoComplete="new-password"`), generic errors, redirect to
   `/dashboard` on success. Uses existing shadcn components / design tokens.

---

## 5. CORRECTIONS PENDING (must apply before writing files)

These were sent to the agent. Status = awaiting revised diffs + approval.

1. **Accept route must be atomic.** Hash password BEFORE the consume; wrap
   consume + `user.update({ passwordHash, active:true })` in one
   `db.$transaction`, roll back if `consumed.count === 0`. As drafted they were
   two separate awaits with hashing after consume → dead-state lockout risk.
   ⚠ Verify Neon driver supports interactive transactions (Pool/WebSocket or
   Prisma Neon adapter — raw HTTP `neon()` does NOT). If HTTP-only, need an
   alternative.
2. **Atomic attempts increment** → `attempts: { increment: 1 }` (was
   read-then-write `invite.attempts + 1`).
3. **`normalizePhone` bug** — the `+` branch returns a *boolean* instead of the
   E.164 string. Fix: `return ... ? '+' + digits : null`. Ensure admin
   `0788123456` and staff `+250788123456` normalize to the SAME string (else
   self-lockout).
4. **Token-in-URL hygiene** — add `Referrer-Policy: no-referrer` for
   `/accept-invite`, and `history.replaceState(null,'','/accept-invite')` after
   reading the token (keep token in React state).
5. **Confirm** activation update sets BOTH `passwordHash` AND `active:true`
   (diff was truncated there).

---

## 6. Remaining steps (order)

1. Agent applies the 5 corrections → returns revised diffs.
2. Review & approve revised diffs.
3. Apply: write all 8 files.
4. Run Prisma migrate + generate (decide `migrate dev` vs `migrate deploy` and
   which env). Do not touch the running dev server.
5. Manual test: create invite → open link → wrong name/phone × N (lock) →
   correct → set password → land on /dashboard → confirm normal email+password
   login works afterward.
6. Build the admin **"Create invite" UI** (button/dialog in staff settings) —
   deferred on purpose; not security-critical. Shows the `acceptUrl` once with a
   copy button; offer "revoke / resend (rotate)".

---

## 7. Deferred / future (not in this scope)

- **SMS OTP** upgrade: replace "knows name+phone" with "controls the phone"
  (Twilio/Vonage). Slots onto the same structure. Needs a provider + cost.
- **IP/global rate limiting** (needs Redis or similar) — share with the deferred
  owner-login limiter.
- **Reactivation** of a previously-deactivated user (currently a new invite to an
  existing email hits 409 → use revoke+rotate).
- Minor codebase note: `verifySessionToken` uses `!==` instead of
  `timingSafeEqual` (low risk for HMAC verify, inconsistent with `password.ts`).
- Separate the login UX change already agreed earlier: merge the two-step
  email→password screen in `UnifiedLogin.tsx` into one form (keep the
  `salon-redirect` "Team member?" helper; reduce `mode` to
  `'login' | 'salon-redirect'`). Independent of onboarding.