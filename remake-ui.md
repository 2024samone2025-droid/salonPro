I'm attaching dashboard-mockup.html — a redesigned version of my app's dashboard. 
Study it, then apply this design system across my entire app (a Next.js + Tailwind 
salon management app). This is a UI-only refactor: do not change any business logic, 
data fetching, or API routes.

## Design tokens
Add these to tailwind.config and replace all ad-hoc colors with them:
- surface: #141417 (page bg), surface-raised: #1d1d21 (cards)
- ink: #f4f4f5 (primary text), ink-muted: #a1a1aa (secondary), ink-faint: #71717a (hints)
- accent: #ED93B1 (pink), accent-deep: #4B1528 (text on pink)
- Card borders: 0.5px solid rgba(255,255,255,0.07)
- Border radius: 12px for cards, 8px for buttons/inputs — use consistently everywhere
- Font: one sans family (Inter or Plus Jakarta Sans) — remove the serif body font

## Build 3 shared components and use them everywhere
1. <StatCard icon label value context> — icon chip (28px rounded square, tinted bg + 
   colored icon), 12px muted label, 26px/500 value, small context line below.
2. <StatusBadge status> — pill, 11px text, mapping:
   booked → blue (#0C447C bg / #B5D4F4 text)
   confirmed → green (#085041 / #9FE1CB)
   in_progress → amber (#633806 / #FAC775)
   completed → teal (#085041 / #5DCAA5)
   no_show → red (#791F1F / #F7C1C1)
3. <Button variant="primary" | "ghost"> — primary is solid pink with accent-deep text; 
   ghost is transparent with 0.5px border and ink-muted text.

## Rules
- ONE solid pink primary button per screen max. All other actions use ghost variant.
- Pink is an accent only — remove it from progress bars' track, badges, and icons 
  where a semantic color fits better.
- Fix the staff workload progress bars: fill width must be bound to the actual 
  percentage value (currently renders full-width at 0%).
- Replace all empty states with: centered icon + one muted sentence + a ghost CTA 
  button (e.g. "No appointments today" → "+ Book one now"). Use a dashed 0.5px border.
- Raise text contrast app-wide: no text color darker than #71717a on dark surfaces.
- Card padding: 16–18px. Grid gaps: 12px.
- Sentence case for all labels and buttons (not Title Case).
- Fix the sidebar so the last items (Billing, version) aren't clipped — add bottom 
  padding above the dev overlay area.
- Make the footer year dynamic.

## Process
1. First show me a plan: list the files you'll touch and the components you'll create.
2. Start with tailwind.config + the 3 shared components.
3. Then refactor pages one at a time in this order: Dashboard, Appointments, 
   Customers, Staff, Services, Reports, Settings, Billing.
4. After each page, pause so I can review in the browser before you continue.