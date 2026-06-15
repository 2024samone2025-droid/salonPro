# Design System — SalonPro

> **Read this before building any UI.** Two hard rules:
> 1. **Always check the component inventory below before creating a new component.** Reuse or compose existing ones; a new primitive is a last resort.
> 2. **Never hardcode design values** (colors, radii, spacing, fonts). Use the semantic tokens / Tailwind classes defined here. Raw hex, `px` radii, or ad-hoc colors are bugs.
>
> Design intent lives in **`specs/ui/design-system.md`** (+ `app-shell.md`, `routes.md`). This file documents what's **actually in the code today**. Where the two differ, the code wins and the spec needs an amendment (see "Spec drift" at the bottom).

## Where tokens live
- **`src/app/globals.css`** — the single source of truth. Semantic CSS variables are defined here; the shadcn variable names **alias** them so every `ui/` component inherits the theme automatically.
- **`tailwind.config.ts`** — maps those variables to Tailwind color/utility names (`bg-surface`, `text-ink-muted`, `border-line`, `bg-status-booked-bg`, `border-hairline`, etc.).
- **Never put raw values in components.** If a value is missing, add a token in `globals.css` first.

## Theme
- `:root` = **light** (default) — warm off-white surface `#faf9f7` + deep pink accent `#D4537E`.
- `[data-theme="dark"]` = **dark** (opt-in) — charcoal `#141417` + pale pink accent `#ED93B1`.
- Applied **before first paint** via an inline script in `src/app/layout.tsx` (reads `localStorage.theme` / OS preference, sets `data-theme`). Toggled by `src/components/theme-toggle.tsx`.
- Status color **pairs swap roles** per theme: light = pale tint bg + deep text; dark = deep fill bg + pastel text. Components consume `--status-*-bg` / `-fg` and never need to know which theme is active.

## Color tokens
Semantic names (preferred). Values are HSL triplets so Tailwind alpha modifiers (`bg-accent/10`) work.

| Group | Tokens | Use |
|---|---|---|
| Surfaces | `--surface`, `--surface-raised`, `--surface-hover` | page bg / cards & popovers / hover & muted fills |
| Text (ink) | `--ink`, `--ink-muted`, `--ink-faint` | primary / secondary / hints (`#71717a` = contrast floor) |
| Accent (the ONE pink) | `--accent`, `--accent-deep`, `--accent-contrast`, `--accent-tint`, `--accent-tint-fg` | primary actions, active nav, links; tint = icon-chip fill |
| Borders | `--line`, `--line-strong` | hairlines (0.5px) |
| Status pairs | `--status-{booked,confirmed,progress,completed,noshow}-{bg,fg}` | appointment status (blue / green / amber / teal / red) |
| Semantic | `--success`, `--warning`, `--info`, `--destructive` (+ `-foreground`) | meaning-only colors |
| Charts | `--chart-1…5` | recharts (pass as `hsl(var(--chart-x))`, not `var(...)`) |

shadcn aliases (`--background`, `--foreground`, `--card`, `--primary`, `--muted`, `--border`, `--ring`, `--sidebar-*`…) all point at the semantic set — use the Tailwind classes (`bg-card`, `text-primary`, etc.) and they theme correctly.

**Tailwind class names** (from `tailwind.config.ts`): `surface{,-raised,-hover}`, `ink{,-muted,-faint}`, `line{,-strong}`, `accent{,-deep,-tint,-tint-fg}`, `status-*-{bg,fg}`, plus the shadcn names `primary/secondary/muted/card/popover/destructive/success/warning/info/sidebar/chart-*`.

## Typography
- **Sans (everything):** Poppins, weights 300–700, via `--font-sans` (`font-sans`). Loaded in `layout.tsx`.
- **Mono:** Geist Mono via `--font-geist-mono` (`font-mono`) — RWF amounts, IDs, tabular numbers.
- Sentence case for all labels and buttons (not Title Case).

### Type scale (single source of truth)
**Never write an arbitrary font size (`text-[13px]`, `text-[0.8rem]`, …).** Enforced by
`npm run lint:design`. Use a **named role** (defined in `tailwind.config.ts`) or a
**Tailwind step**. Named roles carry their own line-height.

| Class | Size / line-height | Use for |
|---|---|---|
| `text-micro` | 10 / 14 | dense metadata, footnotes |
| `text-caption` | 11 / 16 | captions, badges, chips |
| `text-xs` | 12 / 16 | secondary helper text |
| `text-body` | 13 / 18 | **default** body & table text |
| `text-sm` | 14 / 20 | standard body in roomier contexts |
| `text-subtitle` | 15 / 22 | card titles, emphasized body |
| `text-base` | 16 / 24 | prominent body |
| `text-lg` `text-xl` | 18 / 20 | sub-headings |
| `text-title` | 22 / 28 | page / section headings (`<h2>`) |
| `text-2xl`+ | 24+ | hero / marketing only |

Roles are the canonical names; the Tailwind steps (`xs/sm/base/lg/xl/2xl`) are the
permitted in-between scale stops. Anything outside this set fails the design lint.

## Shape, spacing, elevation
- **Radius**: `--radius: 0.75rem`. Tailwind `rounded-lg` = 12px (cards), `rounded-md` = 10px, `rounded-sm` = 8px (buttons/inputs). Pills/avatars/badges = `rounded-full`.
- **Borders**: 0.5px hairlines — use `border-hairline` (custom width) with `border-border` / `border-line-strong`.
- **Card padding** 16px; **grid gaps** 12px.
- **Elevation**: resting = border only; raised = `shadow` (subtle); overlay = `shadow-xl`.
- **Density**: comfortable — 44px touch targets on mobile, 40px inputs/buttons.

## The accent rule (≤10%)
Pink (`accent`) appears on **at most ~10% of any screen**: one filled `primary` button per view, the active nav item, and links/selection/brand. **Never** as decoration, icon chips, avatars, or data text. Everything else is ghost/plain/neutral. (Applies to the app theme only — the marketing landing has its own plum/gold system and is exempt.)

---

## Component inventory
**Check here first.** App-specific reusable components and the shadcn primitives that back them. File paths are clickable.

### Shared app components (`src/components/salon/`)
| Component | File | Signature | One-liner |
|---|---|---|---|
| `StatCard` | `salon/StatCard.tsx` | `{ icon: LucideIcon; label: string; value: ReactNode; context?: ReactNode; tone?: 'accent'\|'success'\|'warning'\|'info'\|'neutral'; onClick?: () => void; className?: string }` | Dashboard metric tile: tinted icon chip + label + big value + context line. Becomes a button when `onClick` set. |
| `StatusBadge` | `salon/StatusBadge.tsx` | `{ status: string; className? }` | Appointment-status pill (reads `STATUS_CONFIG`). Also exports `PaymentBadge({ status, className })`. |
| `EmptyState` | `salon/EmptyState.tsx` | `{ icon: LucideIcon; message: string; actionLabel?: string; onAction?: () => void; className? }` | Dashed-border empty state: icon + one muted line + optional ghost CTA. |
| `Sidebar` | `salon/Sidebar.tsx` | — | Desktop nav rail (role-filtered from `nav-items.ts`); active item = accent text + left bar. |
| `MobileTabBar` | `salon/MobileTabBar.tsx` | — | <768px bottom tabs (Dashboard/Appts/Customers/More); "More" opens a sheet. |
| `CommandPalette` | `salon/CommandPalette.tsx` | — | ⌘K command palette (built on `ui/command`). |
| `TourController` | `salon/TourController.tsx` | — | Mounts the Driver.js product tour (`lib/tour.ts`). |
| `nav-items.ts` | `salon/nav-items.ts` | data + `navItemsForRole(items, role)` | Single source of truth for nav; first 3 become mobile tabs. |

### Feature views (`src/components/salon/`) — not generic, but the canonical screen for their domain
`DashboardView`, `AppointmentsView`, `AppointmentDialog`, `QuickBookingForm`, `CustomersView`, `StaffView`, `ServicesView`, `ReportsView`, `UsersTab`, `SalonSettingsTab`, `SettingsView`, `LoginPage`. Reuse/extend these rather than building parallel screens.

### Other
- `components/booking/BookingFlow.tsx` — public self-booking flow.
- `components/marketing/LandingPage.tsx` (+ `landing.css`) — **own theme** (plum/gold, scoped under `.lp`); does **not** use the app tokens. Don't import app components into it or vice-versa.
- `components/theme-toggle.tsx` — light/dark toggle.

### shadcn/ui primitives (`src/components/ui/`) — 47, themed via tokens
Standard shadcn (new-york) APIs. Use these; do not re-create them.
`accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, skeleton, slider, sonner, switch, table, tabs, textarea, toggle, toggle-group, tooltip` — plus legacy `toast` / `toaster` (being retired, see `CLAUDE.md`).

Two have customized CVA variants worth knowing:
- **`ui/button.tsx`** — variants: `default`/`primary` (solid accent — **one per screen**), `ghost`/`outline` (hairline border + muted text — every other action), `plain` (borderless quiet, icon buttons), `secondary`, `destructive`, `link`. Sizes: `default` (h-9), `sm` (h-8), `lg` (h-10), `icon`.
- **`ui/badge.tsx`** — variants: `default` (accent), `secondary`, `destructive`, `outline`. For appointment/payment status use `StatusBadge`/`PaymentBadge` instead.

### Overlay policy
- **Sheet** (right desktop / bottom mobile) — create/edit in context (appointment, customer, staff, service).
- **Dialog** — confirmations and tightly-scoped tasks only; never stacked.
- **Toast (sonner)** — transient confirmations, 4s, undo where reversible.
- **Alert banner** — persistent must-act info (trial, payment failed).

### Inline field validation (async availability)
For fields whose validity depends on the server (e.g. the signup **subdomain** field), use the inline status-line pattern rather than waiting for submit — reference impl: `src/app/signup/page.tsx`.
- **Validate locally first** (instant, synchronous) for format/length/reserved errors; only hit the server when the value is locally valid.
- **Debounce ~450ms**, then fetch; abort the in-flight request on each keystroke so only the latest value's result shows (no stale flicker).
- **Status line** sits directly under the input, `text-xs` with a leading icon: `Loader2` + `text-muted-foreground` (checking) → `Check` + `text-success` (available) → `AlertCircle` + `text-destructive` (invalid/taken). Set `aria-invalid` on the input for the error states.
- **Gate submit** on the success state — don't allow submitting a value the live check rejected.

---

## Status → token map (`src/lib/constants.ts`)
`STATUS_CONFIG` and `PAYMENT_STATUS_CONFIG` map each status to token-based classes (`badgeClass`, `bgClass`, `textClass`, `dotClass`, `cardBg`, `chartColor`…). Render status anywhere via these — never hand-pick a color.

| Appointment status | Tone |
|---|---|
| `booked` | blue |
| `confirmed` | green |
| `in_progress` | amber |
| `completed` | teal |
| `no_show` | red |

| Payment status | Tone |
|---|---|
| `unpaid` | red |
| `partially_paid` | amber |
| `paid` | green |

## Spec drift to fix
`specs/ui/design-system.md`'s latest amendment (2026-06-11) says "dark-only, theme toggle removed, Plus Jakarta Sans." The **code now** is light **and** dark with a theme toggle, and the font is **Poppins**. The spec needs a new amendment line to match. (Documented, not yet edited — see [TODO.md](./TODO.md).)
