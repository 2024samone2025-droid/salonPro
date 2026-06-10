# Memory — Settings Feature (committed) + Landing Redesign (uncommitted)

Last updated: 2026-06-10, end of session (third save today)

## What was built

On `feature/saas-multi-tenancy`.

**COMMITTED** (see `6d3d7d0` + `8927f69`, plus mid-session `59e6fa7`/`a50134c`):
- Theme-token migration (semantic STATUS_CONFIG, hsl(var()) charts, font-display/mono, local favicon `src/app/icon.svg`), pink dial-back, shadcn conversion, Tailwind v4-in-v3 fixes, sidebar de-pink + dead-strip fix.
- Full admin `/settings` feature: Salon tab (name, subdomain, per-day business hours, public-booking toggle, slot interval, currency) + Users & Roles tab (CRUD accounts, fixed 3 roles, PIN reset, staff link, last-admin protection, read-only permission matrix). Key libs: `src/lib/salon-settings.ts` (always read via `parseSalonSettings`), `src/lib/permissions.ts` (client-safe ROLE_PERMISSIONS). Settings drive: public booking APIs (hours/interval/404-when-disabled, POST validates opening hours), AppointmentsView grid hours, `useMoney()` currency hook everywhere. `Salon.settings Json` pushed to Postgres. Plan pricing standardized: Pro 15,000 RWF/mo.

**UNCOMMITTED — landing page redesign** (this session's last work, tsc+lint clean):
- `src/components/marketing/LandingPage.tsx` fully rewritten as the plum/gold "imigongo" design from `/home/m25/projects/salon-app-ui/salonpro-landing.html`: hero w/ dashboard mockup, 6 feature cards, WhatsApp-reminder phone showcase, dark pricing (0/15,000 RWF), testimonials, FAQ (`<details>`), final CTA, footer, WhatsApp float, IntersectionObserver scroll-reveal.
- `src/components/marketing/landing.css` NEW — entire design scoped under `.lp` prefix so plum/gold never leaks into the app's raspberry/stone theme (deliberate two-theme split, recorded in routes.md note 2).
- Fonts: Fraunces + Plus Jakarta Sans via `next/font` with CSS vars `--font-fraunces`/`--font-jakarta` (NOT the app's Bricolage/Geist).
- `MarketingHeader.tsx` DELETED — signed-in logic folded into `NavCta` inside LandingPage (own AuthProvider wrap; signed-in users get gold "Open dashboard" button).

## Decisions made

- Landing page intentionally has its own design system (plum #2B1230 / gold #E9B44C / Fraunces), separate from the in-app raspberry/stone — scoped via `.lp` class, not Tailwind.
- All landing styles in plain CSS file, not Tailwind classes — kept 1:1 with the HTML source for fidelity.

## Problems solved

(Carried from earlier saves:) v4-class trap in components/ui (see auto-memory), Prisma Json cast `as unknown as Prisma.InputJsonValue`, recharts needs `hsl(var(--token))` not `var(--token)`.

## Current state

tsc + eslint clean. Landing redesign NOT committed and NOT browser-verified. Known gaps in the landing copy (ported as designed, flagged to user):
- WhatsApp number is placeholder `wa.me/250780000000` (constant `WHATSAPP_URL` at top of LandingPage.tsx).
- Page promises unbuilt features: WhatsApp/SMS reminders, offline mode, birthday reminders, data export, 30-day Pro trial.
- Links to `/privacy` and `/terms` — routes don't exist.
- Landing is light-mode only by design (own palette, ignores app dark mode).

## Next session starts with

User verifies `/` in browser (plum/gold landing, nav CTA when signed in, scroll reveal, mobile layout). If approved → commit landing redesign ("feat: redesign landing page with plum/gold imigongo theme"). Then the carried verification list: sidebar collapse, /settings flows (Sunday closed → no slots, booking toggle, stylist role gating, currency switch).

## Open questions

- Real WhatsApp number for `WHATSAPP_URL`.
- Create `/privacy` + `/terms` pages or drop the footer links?
- Marketing-vs-product gap (reminders/offline/trial) — build, or soften copy?
- (Carried) Real Stripe (15,000 RWF price, webhook, downgrade grace); icon-rail sidebar 768–1024; mobile FAB; subdomain conflict on signup.
- Seed users: Admin/1234, Alice/5678, Marie/9012; demo salon `?salon=demo`.

## Working-style notes (important)

- No Playwright/browser automation — user verifies visually.
- Never `npm run build` while dev server runs; agent can't restart the dev server.
- User/other tools edit & commit in parallel — always `git status` before assuming state.
- Accent rule: pink only for primary action/active nav/links/selection/brand — never decoration. (App theme only; landing page exempt, it has its own system.)
