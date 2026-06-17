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

- [ ] **Trend deltas on KPI cards**
  - Where: `StatCard` (add an optional delta chip) → `DashboardView`.
  - `↑ 12%` (`--success`) / `↓ 12%` (`--destructive`) vs prior period, in the existing
    `context` slot.

- [ ] **"Upcoming appointments" side rail + week date-strip**
  - Where: `DashboardView` right column.
  - `MON 09 … SUN 15` strip (selected day = accent) + scrollable list:
    customer · service · time · `formatRWF()` amount.

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
