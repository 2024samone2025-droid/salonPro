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
These are flagged, not done. Decide and tackle when convenient.

- [ ] **Retire legacy toast system.** sonner is the real one (mounted in `(app)/layout.tsx`). Remove the radix trio `hooks/use-toast.ts` + `ui/toast.tsx` + `ui/toaster.tsx` and its mount in root `app/layout.tsx`.
- [ ] **Delete dead `src/lib/prisma.ts`** (empty, imported by nothing — real client is `lib/db.ts`).
- [ ] **Decide on `@tanstack/react-query`** — installed but unused (no `QueryClientProvider`). Adopt it (would replace the `useEffect`+`fetch` pattern) or drop the dependency.
- [ ] **Check `next-themes`** — likely unused now (theme handled by custom `data-theme` script + `theme-toggle.tsx`). Drop if dead.
- [ ] **Amend `specs/ui/design-system.md`** — its last entry says dark-only / no toggle / Plus Jakarta Sans, but code is light+dark with a toggle and **Poppins**. Add an amendment line.
- [ ] **Reconcile payment status naming** — DB `Payment.status` comment says `partial`; UI `PAYMENT_STATUS_CONFIG` uses `partially_paid`.

## Product gaps (carried from old worklogs — decide build vs defer)
- [ ] Real Stripe billing (15,000 RWF zero-decimal price, webhook, downgrade grace).
- [ ] Marketing-vs-product gap: WhatsApp/SMS reminders, offline mode, birthday reminders, data export, 30-day Pro trial (build or soften landing copy).
- [ ] Landing placeholders: real `WHATSAPP_URL`; `/privacy` + `/terms` pages (or drop footer links).
- [ ] Responsive: icon-rail sidebar (768–1024px); mobile booking FAB.
- [ ] Signup: subdomain conflict handling.
