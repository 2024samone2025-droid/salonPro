---
Task ID: 4
Agent: Main
Task: Fix sidebar not being affected by dark/light theme toggle

Work Log:
- Identified root cause: sidebar had hardcoded `!important` CSS rules in globals.css forcing always-dark background
- Identified secondary cause: Sidebar.tsx used hardcoded neutral-* color classes (bg-neutral-800, text-white, border-neutral-800, etc.) instead of theme-aware CSS variable classes
- Fixed globals.css: Removed `[data-sidebar="sidebar"]` `!important` override rules
- Fixed globals.css: Updated `:root` sidebar CSS variables from dark colors to light colors (sidebar: oklch(0.985 0 0) light gray-white, sidebar-foreground: dark text, etc.)
- Rewrote Sidebar.tsx: Replaced all hardcoded colors with theme-aware CSS variable classes
- Fixed remaining hardcoded colors across other components (CustomersView, AppointmentsView, AppointmentDialog, DashboardView)
- Verified with Agent Browser: Light mode sidebar = near-white, Dark mode sidebar = near-black
- Lint passes clean, no console errors

Stage Summary:
- Sidebar now properly responds to dark/light theme toggle
- Light mode: light gray-white sidebar with dark text and subtle borders
- Dark mode: near-black sidebar with light text and dark borders
- All hardcoded neutral-/gray- colors replaced with theme-aware CSS variable classes
- 6 files modified: globals.css, Sidebar.tsx, CustomersView.tsx, AppointmentsView.tsx, AppointmentDialog.tsx, DashboardView.tsx
