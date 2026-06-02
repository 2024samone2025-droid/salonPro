---
Task ID: 1
Agent: Main
Task: Fix dashboard conflict and update color scheme

Work Log:
- Investigated dashboard "conflict" - found duplicate fetch logic in DashboardView.tsx
- Fixed duplicate fetch: useEffect was independently reimplementing the same fetch as fetchDashboard callback
- Restructured initial fetch to use direct authFetch in useEffect with cancellation support
- Fixed lint error (set-state-in-effect) by separating initial load from retry logic
- Updated mobile stat cards from single-row (icon+value+arrow) to stacked layout (icon+label on top, value below)
- Removed truncate class from revenue/amount values on mobile
- Updated entire color scheme across all 11 salon components to match common Next.js/SaaS patterns:
  - Sidebar: Dark zinc/neutral palette instead of emerald-green
  - Dashboard: Uses primary (theme-aware) colors instead of hardcoded emerald
  - Quick action buttons: primary/10 backgrounds with primary text
  - Stat cards: icon+label layout with proper mobile sizing
  - Status badges: Softer pastel tones (sky-50 for booked, zinc-100 for completed)
  - Buttons: Use default shadcn primary styling instead of hardcoded emerald-600
  - Login page: Uses primary color instead of emerald gradient
  - Appointments: Calendar uses primary color for selected/today states
  - All components: Replaced bg-emerald-600/hover:bg-emerald-700 with default Button styling

Stage Summary:
- Dashboard conflict (duplicate fetch) fixed
- Mobile text truncation on stat cards fixed with new stacked card layout
- Full color scheme update to match modern Next.js/SaaS conventions
- All 11 salon components updated: DashboardView, Sidebar, LoginPage, AppointmentsView, QuickBookingForm, AppointmentDialog, CustomersView, StaffView, ServicesView, ReportsView, page.tsx
- Lint passes clean
- Verified on both desktop (1440x900) and mobile (390x844) viewports
