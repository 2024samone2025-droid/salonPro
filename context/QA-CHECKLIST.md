# QA Checklist — Manual Production-Readiness Gate

The human-in-the-loop half of the [verification loop](./VERIFICATION.md). Automated
jsdom tests (`npm run verify`) prove components call the right endpoints with the
right payloads; this checklist proves the **full journeys actually work end to end
in a real browser** — the things we deliberately don't automate (real-browser
flows, multi-step wizards, visual/display screens).

Run before shipping. Each item is **action → expected result**. Tick `[x]` as you go.
Use the demo accounts (all password `demo1234`): owner at the apex host, staff at
their salon's address.

> Legend: ⚙️ = also has automated coverage (component test) · 👁️ = display/visual,
> confirm it renders real data (no placeholders).

---

## 1. Auth & onboarding

- [ ] **Owner login (apex)** ⚙️ — at the apex host, sign in with owner email+password → lands on the **salon picker** (or straight into the salon if only one). Wrong password → generic "Invalid credentials" (never reveals if the email exists).
- [ ] **Salon picker → handoff** — choose a salon → redirected into that salon's dashboard on its own subdomain, still signed in.
- [ ] **Staff login (tenant host)** ⚙️ — at a salon's address, staff sign in → dashboard. "Team member?" link from apex points here.
- [ ] **Signup** — create a new salon (name + subdomain + owner) → salon created, signed in. Taken subdomain → clear error.
- [ ] **Accept invite** — open an invite link → set name/phone/password → signed in. Reusing a consumed/expired token → rejected.
- [ ] **Forced password reset** — a staff member with `mustResetPassword` is forced to change it on first login.
- [ ] **Logout** — signs out and protected routes redirect to login.

## 2. Owner / admin (salon app)

- [ ] **Dashboard** 👁️ — loads real stats (today's revenue, appointments, etc.); numbers match the data, money is formatted in the salon's currency. No skeleton stuck, no zeros-that-should-have-data.
- [ ] **Customers — list/search** ⚙️ — list loads; search by name/phone narrows it; empty search term shows all.
- [ ] **Customers — create** ⚙️ — add with name+phone → appears in list; phone normalized to `+250…`; missing name/phone is blocked with a toast.
- [ ] **Customers — edit** — open a customer, change details, save → persists after refresh.
- [ ] **Services — create/edit** ⚙️ — add a service (name/price/duration) → appears; invalid price/duration blocked. Edit persists.
- [ ] **Services — activate/deactivate** — toggle a service → status flips; deactivated services don't appear on the public booking page.
- [ ] **Staff — edit** ⚙️ — open a staff card, edit name/role/availability, save → persists. (Staff are **added in Settings → Users**, not here.)
- [ ] **Staff — activate/deactivate** — toggle → status flips; inactive staff don't take bookings.
- [ ] **Appointments — view** 👁️ — calendar/timeline loads real appointments in the right slots.
- [ ] **Appointments — create** — book an appointment (customer + service + staff + time) → shows on the timeline; double-booking a taken slot is prevented.
- [ ] **Appointments — status** — mark complete/cancelled → reflected; completed feeds revenue/reports.
- [ ] **Reports** 👁️ — change the date range → figures update; totals reconcile with appointments/payments.
- [ ] **Settings — salon** — edit name / booking rules / **business hours**, save → "Salon settings saved"; reload shows the saved values; grid hours update.
- [ ] **Settings — booking link** — copy the public booking URL → opens this salon's booking page.
- [ ] **Settings — users** — provision a staff user / send an invite → appears in Staff automatically.
- [ ] **Billing (tenant view)** ⚙️👁️ — shows current plan, payment history, and summary. **No self-upgrade button** (billing is manual via the operator console).
- [ ] **Permissions** ⚙️ — a view-only role sees data but **no** create/edit/delete controls (e.g. no "Add customer", no "Add Service").
- [ ] **Suspended salon** — a suspended salon shows the suspended notice and blocks the app + public booking.

## 3. Operator console

- [ ] **Directory** ⚙️ — all tenant salons listed (owner email **masked**); search by name/subdomain and the Active/Suspended filters work; each row links to the salon detail.
- [ ] **Salon detail** 👁️ — plan, status, payment history, owner contact all load.
- [ ] **Reveal owner contact** ⚙️ — "Reveal" unmasks name+email and writes one `REVEAL_PII` audit row; "Hide" re-masks **without** a second log; re-reveal reuses the value (still one log).
- [ ] **Record payment** ⚙️ — record a payment → salon goes to Pro, paid period extends, payment shows in history. Amount ≠ Pro price soft-warns ("Differs…", button → "Record anyway") but still allows it.
- [ ] **Change plan** ⚙️ — comp to Pro / force to Free with a reason → applies immediately, audit row written.
- [ ] **Set subscription status** ⚙️ — set e.g. CANCELED with a reason → status label updates; **access is unchanged** (status ≠ suspension).
- [ ] **Suspend / reactivate** ⚙️ — requires a reason; suspend blocks the salon's app + booking (no data deleted); reactivate restores access. Both audited.
- [ ] **Operator access control** — a non-operator cannot reach `/operator` or the operator APIs.

## 4. Public booking (customer, no login)

- [ ] **Load** ⚙️ — open `/book/<subdomain>` → salon name/logo + bookable services load. Unknown subdomain → "Salon not found".
- [ ] **Full booking flow** — pick service → staff → date → an available time → enter name+phone → confirm → confirmation screen with the right details. Phone validation works.
- [ ] **Slot accuracy** — already-booked times and out-of-business-hours times are not offered; the new booking appears in the salon's admin appointments.
- [ ] **Closed day / no services** — a day off or a salon with no bookable services is handled gracefully (no empty/broken UI).

---

## Notes

- Found a bug? If it's a wiring/logic issue reproducible without a browser, add a
  failing component test (`*.test.tsx`) so `npm run verify` catches it next time,
  then fix it. Visual/flow-only issues live here.
- `⚙️` items have a safety net in `npm run verify`; the rest rely on this pass.
