# SalonPro — Activity Log (Phase 2) · Context / Handoff

Use this to resume cold. It captures the goal, the locked decisions from the
architect session, the data model, the capture points, and the build order.
This is the **spec** the owner asked to lock before any code.

---

## 1. Goal

Give the owner **operational transparency**: a feed of "who did what, when"
inside their salon — who confirmed an appointment, who took a payment, who added
a team member. Append-only, written as the actions happen, read by admins/owners
on a dedicated **Activity** page.

This is an *owner-transparency* feed, **not** a compliance/legal audit and **not**
a developer/debug log. A rare missing row is acceptable; never block a real action
to write one.

---

## 2. Language (agreed)

- **Activity log** — append-only record of meaningful business actions, surfaced
  to the owner.
- **Actor** — who acted. Either a staff `User` (admin/receptionist/stylist) **or**
  an `Owner` (no `User` row). Stored as a **denormalized snapshot** (type + id +
  name + role at the time), never an FK — so the trail survives renames/deletes.
- **Event / activity** — one logged action = one row (action type, target,
  human-readable summary, optional metadata).
- **Surface to the owner** — a dedicated admin/owner-only Activity page, near
  Reports, rendered as a reverse-chronological feed.

---

## 3. Decisions locked

1. **Scope (v1)** — log:
   - **Appointments**: created · status changed · deleted
   - **Payments**: recorded · updated
   - **Staff & users**: user added · user updated (deactivate / role change) ·
     staff added / updated / removed
   - **Deferred** (same mechanism, add later): logins, customer CRUD, service edits.
2. **Capture** — explicit `logActivity()` helper called inside each mutation
   route. No middleware/wrapper magic; matches the hand-written-handler idiom.
3. **Durability** — **best-effort**. The log write is *awaited* (serverless can't
   reliably fire-and-forget) but wrapped in try/catch. A logging failure emits a
   `console.error` and the business action still succeeds. **Never** put the log
   write in the same transaction as the mutation.
4. **Visibility** — admin + owner only (owners resolve to `admin` via
   `requireAuth`), same gating as Settings. Gated by a new
   `canViewActivityLog` permission (admin-only).
5. **Row shape** — store structured fields **and** a human-readable summary built
   at write-time. Renders with no joins; survives deleted targets; structured
   fields enable future filtering/deep-links.

---

## 4. Data model — `ActivityLog`

```
model ActivityLog {
  id         String   @id @default(cuid())
  salonId    String                          // tenant scope (cascade)
  actorType  String                          // 'staff' | 'owner'
  actorId    String                          // User.id or Owner.id (NOT an FK)
  actorName  String                          // snapshot at write-time
  actorRole  String                          // snapshot: admin | receptionist | stylist | owner
  action     String                          // e.g. 'appointment.confirmed' (see ACTIVITY_ACTIONS)
  targetType String?                         // 'appointment' | 'payment' | 'user' | 'staff'
  targetId   String?
  summary    String                          // human-readable sentence, built at write-time
  metadata   Json?                           // optional details: { from, to } | { amount, method } | ...
  createdAt  DateTime @default(now())

  salon Salon @relation(fields: [salonId], references: [id], onDelete: Cascade)

  @@index([salonId, createdAt])
}
```
- `Salon` gets an `activityLogs ActivityLog[]` back-relation.
- Sync via **`npm run db:push`** + `db:generate` (this repo's workflow — migrations
  are baselined; `migrate dev` would offer a destructive reset).
- Retention: unbounded in v1; feed is cursor-paginated. A purge/retention job is
  future work.

---

## 5. Helper — `src/lib/activity.ts`

- `ACTIVITY_ACTIONS` — constant map of action keys → labels (display + filtering).
- `logActivity(auth, { action, targetType, targetId, summary, metadata })`:
  - reads the actor snapshot from `auth.user` (`kind`→actorType, id, name, role;
    owners → actorRole `'owner'`),
  - inserts the row, **awaited inside try/catch**; on failure `console.error` and
    return (never throw).
- Per-type metadata convention:
  - appointment status → `{ from, to }`; summary names the customer + status.
  - payment → `{ amount, method, status }`.
  - user/staff → `{ role, name }` (+ `{ from, to }` for role changes).

---

## 6. Capture points (routes to instrument)

| Route | Verb | Action(s) |
|---|---|---|
| `api/appointments` | POST | `appointment.created` |
| `api/appointments` | PUT | `appointment.status_changed` (only when status changes) / `appointment.updated` |
| `api/appointments` | DELETE | `appointment.deleted` |
| `api/payments` | POST | `payment.recorded` |
| `api/payments` | PUT | `payment.updated` |
| `api/users` | POST | `user.added` |
| `api/users/[id]` | PATCH | `user.updated` (deactivate / role change / edit) |
| `api/staff` | POST/PUT/DELETE | `staff.added` / `staff.updated` / `staff.removed` |

Note: the owner-provisioned onboarding auto-creates a `Staff` slot inside the
`api/users` POST transaction — log the **user.added** event (the staff slot is an
implementation detail of that one action, not a second event).

---

## 7. Read surface

- **API** `src/app/api/activity/route.ts` — `GET`, `requireAuth(req,
  'canViewActivityLog')`, scoped by `auth.salonId`, `orderBy createdAt desc`,
  cursor pagination (`?cursor=&take=`).
- **Page** `src/app/(app)/activity/page.tsx` — thin wrapper → `ActivityView`.
- **View** `src/components/salon/ActivityView.tsx` — client; fetches its own data;
  reverse-chron feed grouped by day; design tokens only; sonner for errors;
  access-gated on `permissions?.canViewActivityLog`.
- **Nav** add to `nav-items.ts` with `roles: ['admin']` (covers owners).

---

## 8. Build order

1. `ActivityLog` model + `Salon` back-relation → `db:push` + `db:generate`.
2. `lib/activity.ts` (`ACTIVITY_ACTIONS` + `logActivity`).
3. `canViewActivityLog` in `Permissions` / `ROLE_PERMISSIONS` (admin-only) +
   `PERMISSION_MATRIX_ROWS`.
4. Instrument the routes in §6.
5. `GET /api/activity`.
6. Activity page + view + nav entry.
7. `tsc --noEmit`; user verifies in browser (no automation, per project rules).

Commit incrementally per step (commit-after-every-change convention).

---

## 9. Deferred / future

- Logins, customer CRUD, service edits (same mechanism).
- Filtering by actor / action type / date range; deep-links from a row to its
  target record.
- Retention/purge job (table is unbounded in v1).
- Per-record history view (rejected for v1 in favor of the central feed).
</content>
</invoke>
