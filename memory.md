# Memory — Shadcn Conversion + Theme Audit + Pink Dial-back

Last updated: 2026-06-10, end of session

## What was built

All on `feature/saas-multi-tenancy`, uncommitted:

**1. Full shadcn conversion** — audited the app: 48 shadcn components installed (`components.json`, new-york style); only 12 raw `<button>` elements remained across 8 files. All converted to `Button` with variant + className overrides preserving exact visuals:
- `BookingFlow.tsx` (service/staff cards, time slots), `QuickBookingForm.tsx` (clear-X, dropdown rows, "New customer" link), `AppointmentsView.tsx` (week-day picker, migrated to `cn()`), `LoginPage.tsx` (demo-account rows), `Sidebar.tsx` (⌘K trigger), `MobileTabBar.tsx` (More tab), `(app)/layout.tsx` (mobile search icon, added Button import), `global-error.tsx`. Zero raw button/input/select/table left outside `components/ui/`.

**2. Pink accent dial-back** (user: "you used it too many times and it really looks messy") — neutralized ~70 decorative `primary` usages across 11 files, keeping pink only for: primary buttons, active nav, links, selection states, brand marks (sidebar logo, booking-page header chip, landing hero word + CTAs):
- Icon chips `bg-primary/10`+`text-primary` → `bg-muted`+`text-muted-foreground` everywhere (Dashboard quick actions/stat cards, Reports, QuickBookingForm Zap, BookingFlow cards, all empty states)
- Avatar fallbacks (CustomersView, AppointmentDialog) → neutral; money/price text → `text-foreground` (CustomersView, ServicesView)
- Week picker: removed pink glow on selected day; today = neutral `ring-foreground/25`; day badges → muted (white-tint inside selected day)
- QuickBookingForm card pink tint removed; billing + landing checkmarks and feature icons → muted
- ReportsView trend: `text-primary`/hardcoded red → `text-success`/`text-destructive` semantic tokens

tsc + eslint clean after both passes. NOT runtime-verified (user verifies in own browser).

## Decisions made

- **Raspberry stays** — user asked "is pink enough?"; answer: keep hue, fix overuse. Comparable apps cited: Dribbble, T-Mobile, GlossGenius (direct competitor), Claude.ai for warm-stone neutrals.
- Pink's four jobs only: one primary button per view, active nav, links, selection/focus states. Saved as durable rule in auto-memory (`accent-overuse-feedback.md`).
- Stat-card emerald/amber/red chips and status colors left as-is — separate hardcoded-colors issue, user hasn't approved that migration yet.

## Problems solved

- (none new this session — pure UI refactor; see theme-audit findings below as known issues)

## Current state

Working, uncommitted UI refactor. Theme audit findings still OPEN (reported to user, fix offered but not requested):
1. Chart colors hardcoded hex in `ReportsView.tsx:65-83` (`#3b82f6` etc. + recharts default `#8884d8`) — ignore dark mode, should use `--chart-1..5`
2. ~60 hardcoded emerald/amber/blue/red/zinc classes (DashboardView 18, ReportsView ~16 left, StaffView, billing, signup, AppointmentsView red "now" line) — should be `success/warning/info/destructive` tokens
3. Bricolage Grotesque (`font-display`) loaded everywhere but only used on marketing + booking header — spec says in-app page titles + stat numbers too
4. `font-mono`/`tabular-nums` missing on all `formatRWF` amounts (spec requires)
5. Button default variant has leftover white-glow `shadow-[0_0_10px_rgba(255,255,255,0.1)]` (invisible in light mode, off-spec)
6. Favicon points to third-party CDN `z-cdn.chatglm.cn` in `layout.tsx:28`

## Next session starts with

Ask user to review the dial-back in their browser (Dashboard, Appointments week view, Customers list, booking flow). If approved → commit. Then offer the semantic-token migration (items 1–2 above) as the next chunk.

## Open questions

- (Carried, unverified) Desktop sidebar-close dead ~256px strip — last session's fix needed a dev-server restart to verify; status unknown, not revisited this session.
- Currency: $29 USD vs RWF (spec leans 15,000 RWF/mo) — billing page, LandingPage, Stripe config.
- (Carried) `npx prisma db push` for stripeCustomerId/stripeSubscriptionId; billing e2e; icon rail 768–1024; Appointments mobile FAB; plan-downgrade grace period; subdomain conflict handling.
- Seed users: Admin/1234, Alice/5678, Marie/9012; demo salon `?salon=demo`.

## Working-style notes (important)

- Do NOT install Playwright or browser automation — user explicitly refused. Verify via code + user's own browser.
- Never `npm run build` while dev server runs (shared `.next`); agent cannot restart the dev server (outside sandbox).
- User/another tool edits files in parallel (sometimes double-writes content) — re-read before editing.
- Accent rule (user feedback): never use `primary` as decoration — no pink icon chips, avatars, or data text.
