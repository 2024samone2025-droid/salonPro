# TODO — SalonPro

Template — fill in the product/roadmap sections. The cleanup backlog at the bottom is seeded from the initial audit so nothing gets lost; tick items off as you go.

## Now (in progress)
- _…_

## Next (this milestone)
- _…_

## Later / backlog
- _…_

## Ideas / parking lot
- _…_

---

## Cleanup backlog (from initial /context audit — 2026-06-13)

Done 2026-06-13:
- [x] **Retired legacy toast system.** Deleted `hooks/use-toast.ts` + `ui/toast.tsx` + `ui/toaster.tsx` and removed the radix `<Toaster>` mount from root `app/layout.tsx`. sonner remains, mounted in `(app)/layout.tsx` + `BookingFlow.tsx`.
- [x] **Deleted dead `src/lib/prisma.ts`** (empty; real client is `lib/db.ts`).
- [x] **Amended `specs/ui/design-system.md`** with the 2026-06-13 row (light restored, toggle re-added, Poppins).
- [x] **Reconciled payment status naming** — `PAYMENT_STATUS_CONFIG` key `partially_paid` → `partial` to match the value used by `AppointmentDialog`, seed, dashboard, reports (partial badges now render their amber style).

Deferred (need `npm install`; disk was full at the time — do when disk is healthy):
- [ ] **Drop `@tanstack/react-query`** from `package.json` — unused (no `QueryClientProvider`/`useQuery`). Or adopt it to replace the `useEffect`+`fetch` pattern.
- [ ] **Drop `next-themes`** from `package.json` — unused (theme handled by custom `data-theme` script + `theme-toggle.tsx`).

## Product gaps (carried from old worklogs — decide build vs defer)
- [ ] Real Stripe billing (15,000 RWF zero-decimal price, webhook, downgrade grace).
- [ ] Marketing-vs-product gap: WhatsApp/SMS reminders, offline mode, birthday reminders, data export, 30-day Pro trial (build or soften landing copy).
- [ ] Landing placeholders: real `WHATSAPP_URL`; `/privacy` + `/terms` pages (or drop footer links).
- [ ] Responsive: icon-rail sidebar (768–1024px); mobile booking FAB.
- [ ] Signup: subdomain conflict handling.
