# App Shell — SalonPro

## Navigation model
**Left sidebar (collapsible) + topbar** — the standard for data/admin dashboards, and already implemented (`src/components/salon/Sidebar.tsx`). Seven top-level items, at the cap: Dashboard, Appointments, Customers, Staff, Services, Reports, Billing (admin-only). On mobile, the sidebar does NOT hide everything behind a drawer: the four most frequent destinations (Dashboard, Appointments, Customers, More) become a **bottom tab bar**, because front-desk staff on phones book appointments dozens of times a day and a hamburger adds a tap to every one of them. "More" opens a sheet with Staff / Services / Reports / Billing.

## Shell layout
```
DESKTOP (≥1024)                                      MOBILE (<768)
┌────────────────────────────────────────────────┐  ┌──────────────────┐
│ ┌──────────┬───────────────────────────────────┐│  │ TOPBAR           │
│ │ SIDEBAR  │ TOPBAR  ⌕ ⌘K search   ☾ (avatar) ││  │ ▲ SalonPro  ⌕ ☾ │
│ │ ▲ Salon  ├───────────────────────────────────┤│  ├──────────────────┤
│ │   name   │                                   ││  │                  │
│ │ • Dash   │  CONTENT                          ││  │  CONTENT         │
│ │ • Appts  │  (1280px max, 24px gutters)       ││  │  (16px gutters)  │
│ │ • Cust.  │                                   ││  │                  │
│ │ • Staff  │                                   ││  │                  │
│ │ • Svcs   │                                   ││  ├──────────────────┤
│ │ • Reports│                                   ││  │ ⌂    ▦    ◔   ≡ │
│ │ ─────────│                                   ││  │ Dash Appt Cust More
│ │ • Billing│                                   ││  └──────────────────┘
│ └──────────┴───────────────────────────────────┘│   ← labeled tabs, 44px+
└────────────────────────────────────────────────┘
```
Current location: accent text + accent left-bar in sidebar; filled accent icon+label in mobile tabs.

## Layout shells
| Shell | Used by | Structure |
|---|---|---|
| AppShell | all authed pages (dashboard, appointments, customers, staff, services, reports, billing) | sidebar + topbar + content; bottom tabs on mobile |
| AuthShell | signup, login | centered card (max 420px), logo above, no nav |
| MarketingShell | landing page | top horizontal nav (logo · Sign up · Login) + footer; sticky header |

## Overlay policy
- **Sheet** (right on desktop, bottom on mobile): create/edit appointment, customer, staff, service — stay in context of the list.
- **Dialog**: confirmations and tightly-scoped tasks only (cancel appointment, delete service). Never stacked; if a second layer is needed, the first should have been a Sheet or page.
- **Toast** (sonner): transient confirmations, bottom-right desktop / top mobile, 4s auto-dismiss, undo where reversible ("Appointment cancelled. Undo").
- **Alert banner**: persistent, must-act info — trial expiring, payment failed — top of content, dismiss only when resolved.

## Responsive strategy
- Breakpoints: 360 / 768 / 1024 / 1280.
- < 1024: sidebar collapses to icon rail; topbar search becomes icon.
- < 768: rail disappears → bottom tab bar + "More" sheet; tables → stacked cards (one card per row, key fields only); Sheets open from bottom; page gutters 16px.
- ≥ 1280: content capped at 1280px, centered.

## Key screens (wireframes)

### Dashboard (`/` authed)
```
┌──────────┬─────────────────────────────────────────────┐
│ SIDEBAR  │ Today at Amani Salon        [*New booking*] │
│          │ ┌─────────┐┌─────────┐┌─────────┐┌────────┐ │
│          │ │ 12      ││ 8       ││ 45,000  ││ 3      │ │
│          │ │ Today's ││ Clients ││ RWF     ││ Staff  │ │
│          │ │ appts   ││ served  ││ today   ││ active │ │
│          │ └─────────┘└─────────┘└─────────┘└────────┘ │
│          │ UPCOMING TODAY                               │
│          │ ▤ 10:00  Alice M. · Braids · Chantal   ⋯    │
│          │ ▤ 11:30  Diane U. · Manicure · Eric    ⋯    │
│          │ ▤ 14:00  Grace K. · Cut · Chantal      ⋯    │
└──────────┴─────────────────────────────────────────────┘
```
One primary action: **New booking**. Stat numbers in display face. Rows open the appointment Sheet.

### Appointments (most-used screen)
```
┌──────────┬─────────────────────────────────────────────┐
│ SIDEBAR  │ Appointments                 [*New booking*] │
│          │ [‹ Today ›]  [Day|Week]  [Staff ▾] [Status ▾]│
│          │ ┌─────────────────────────────────────────┐ │
│          │ │ 09:00 ─────────────────────────────────  │ │
│          │ │ 10:00 ┌Alice M. · Braids────┐            │ │
│          │ │       │ Chantal · ●Confirmed│            │ │
│          │ │ 11:00 └─────────────────────┘            │ │
│          │ │ 11:30 ┌Diane U. · Manicure──┐            │ │
│          │ └─────────────────────────────────────────┘ │
└──────────┴─────────────────────────────────────────────┘
MOBILE: day view only, vertical time list, [*New booking*] as
fixed bottom-right FAB above the tab bar; filters in a top sheet.
```

### Marketing landing (`/` unauthed)
```
┌────────────────────────────────────────────────┐
│ ▲ SalonPro      [Log in]  [*Start free trial*] │
├────────────────────────────────────────────────┤
│         Run your salon smarter                 │
│   Appointments, customers, staff & payments    │
│         for Rwandan salons.                    │
│            [*Start free trial*]                │
│   ~product screenshot in device frame~         │
│ ┌────────┐  ┌────────┐  ┌────────┐             │
│ │▦ Appts │  │▦ CRM   │  │▦ Money │  features   │
│ └────────┘  └────────┘  └────────┘             │
│  PRICING: Free ── [Pro 15,000 RWF/mo, *CTA*]   │
│  FOOTER: links · contact                       │
└────────────────────────────────────────────────┘
```
One primary CTA repeated (hero + pricing): **Start free trial**. Login stays secondary (ghost) in the header — the conversion action is the filled button. Implemented in `src/components/marketing/LandingPage.tsx`.
