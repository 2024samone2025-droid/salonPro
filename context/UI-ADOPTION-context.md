# UI Adoption — GLOWBOARD inspiration

> **Status: proposed (not yet built).** A set of layout/IA patterns to absorb from a
> reference dashboard (GLOWBOARD — dark, violet-accented salon admin). We take its
> **layouts and information density**, NOT its color discipline. Everything below is
> filtered through our own rules: keep pink/raspberry, one `primary` button per screen,
> the ≤10% accent rule, initials avatars (no decorative photos), money via
> `formatRWF()`/`formatMoney()`. See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).

Source: three reference screens (Dashboard, Services, Crew/Stylists). We already own the
screens (`DashboardView`, `ServicesView`, `StaffView`) and primitives (`StatCard`,
`ui/chart`, `STATUS_CONFIG` status tokens, `ui/avatar`) to land these without new
color/style decisions.

## Tier 1 — high value, primitives already exist

- [x] **Day Schedule timeline on the dashboard** *(the standout)* — done
  - `DayScheduleTimeline.tsx`: time gutter × one column per stylist; appointment blocks
    positioned by start/duration, coloured **by status** via `STATUS_CONFIG`
    (`cardBg` + `accentBorderClass`). Lane-packs overlapping appts, scrolls horizontally
    past ~3 stylists. Mounted full-width in `DashboardView` (replaced the flat list);
    workload + status breakdown moved to a 2-col row below.

- [x] **Trend deltas on KPI cards** — done
  - `StatCard` gained `delta`/`deltaLabel` props rendering an arrow + percent chip
    (up = `status-completed` green, down = `status-noshow` red, flat = muted).
  - Dashboard API returns same-weekday-last-week figures (`priorRevenue`,
    `priorAppointmentCount`) — a like-for-like baseline; chip hidden when no prior data.
    Wired onto the Appointments + Revenue cards, labelled "vs last week".

- [x] **"Upcoming appointments" side rail + week date-strip** — done
  - `UpcomingAppointments.tsx`: 7-day strip from today (selected day = filled accent),
    per-day appointment list (status dot · customer · service · staff · time ·
    `formatRWF` amount). API returns `today` + `upcomingAppointments` (today + 6 days).
  - Layout: timeline + rail now share a 2-col row (`1.5fr / 1fr`), replacing the
    full-width timeline — closer to the reference and frees the right column.

## Tier 2 — IA / layout upgrades

- [ ] **Group Services by category**
  - Where: `ServicesView`.
  - Section headers (Hair / Nails / Makeup…); **one** top-level `primary` "Add service";
    section-level actions are `ghost`/`plain`.
  - Optional "N options" sub-count per service **only if** services have variants.

- [ ] **Staff cards with at-a-glance metrics + filter bar**
  - Where: `StaffView`.
  - Initials avatar + name + specialty + clients-served + avg price.
  - Reusable filter bar (Role / Status `Select`s) above the grid.

- [ ] **Recent-sales trend chart on the dashboard**
  - Where: `DashboardView` (uses `ui/chart`).
  - Area/line with a Weekly/Monthly `Select`; pull from reports data.

## Tier 3 — ties to `feat/operator-billing`

- [ ] **Quiet plan/trial status card in the sidebar**
  - Where: `Sidebar`.
  - Trial-days-left / plan + upgrade CTA. Subtle (alert/banner style), **not** a gradient
    fill. Hooks into the billing work.

## Translation rules (apply throughout)

- Keep **pink/raspberry** — never the reference's purple/violet.
- **One** filled `primary` button per screen; section/secondary actions are `ghost`.
- **Initials avatars**, not photos; no service thumbnails unless real images exist.
- Money via `formatRWF()`/`formatMoney()` — never a hardcoded `$`.

## Explicitly NOT adopting

- Stylist **★ ratings** — no reviews feature behind them yet (would be fake data).
- Photo-on-every-card density.
- The reference's saturated accent usage (breaks the ≤10% rule).
