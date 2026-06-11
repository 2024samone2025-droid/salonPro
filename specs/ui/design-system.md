# Design System — SalonPro

## Direction
SalonPro is a working tool for Rwandan salon owners and front-desk staff, used between clients on mid-range Android phones and a shared desktop. The character is **boutique, not bank**: warm stone neutrals, one deep raspberry accent, comfortable touch-friendly density. The signature element is the raspberry accent over warm (not blue-gray) neutrals — it reads beauty-industry without being frivolous, and it replaces the stock shadcn black theme currently in `globals.css`.

## Color tokens
| Token | Light | Dark | Use |
|---|---|---|---|
| surface-base | `#FAFAF9` | `#1C1917` | page background |
| surface-raised | `#FFFFFF` | `#292524` | cards, panels, popovers |
| surface-sunken | `#F5F5F4` | `#171412` | table headers, input wells |
| content-primary | `#1C1917` | `#E7E5E4` | main text |
| content-secondary | `#57534E` | `#A8A29E` | supporting text, labels |
| content-disabled | `#A8A29E` | `#57534E` | disabled text |
| accent | `#BE185D` | `#F472B6` | THE primary action color (buttons, active nav, links) |
| accent-hover | `#9D174D` | `#F687B3` | |
| accent-foreground | `#FFFFFF` | `#3B0764`-tone dark text | text on accent |
| success | `#15803D` | `#4ADE80` | confirmed appointments, paid |
| warning | `#B45309` | `#FBBF24` | pending, trial expiring |
| danger | `#B91C1C` | `#F87171` | cancellations, destructive actions |
| info | `#0369A1` | `#38BDF8` | neutral notices |
| border | `#E7E5E4` | `#44403C` | dividers, input borders |

Rules: accent appears on ≤ 10% of any screen — one filled accent button per view, active nav item, and links; nothing else. Semantic colors only for their meaning (a green badge means *paid/confirmed*, never decoration). All text ≥ 4.5:1 against its surface.

## Typography
- **Display:** Bricolage Grotesque, 600/700 — page titles, marketing hero, stat numbers. Fallback: Geist Sans.
- **Body:** Geist Sans (already installed), 400/500/600 — everything else.
- **Mono:** Geist Mono (already installed) — RWF amounts, IDs, tabular numbers in reports only.
- Scale (ratio 1.25): 12 / 14 / 16 / 20 / 25 / 31 / 39. Marketing hero may use 49.
- Body 16px, line-height 1.5, max line length 70ch. 14px allowed only inside dense report tables.
- Max 3 visible text-hierarchy levels per screen.

## Spacing, shape, elevation
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64. Within-group spacing ≤ half between-group spacing.
- Page gutters: 16px mobile, 24px tablet, 1280px max-width container on desktop.
- Radius: **8px** inputs/buttons (matches existing `--radius: 0.5rem`), **12px** cards, **16px** modals/sheets, **full** pills/avatars/badges.
- Elevation, 3 levels: resting = border only; raised = border + `0 1px 3px rgb(0 0 0 / 0.06)`; overlay = `0 8px 24px rgb(0 0 0 / 0.12)`.
- Density: **comfortable** — 44px list/table rows, 40px inputs/buttons. Front-desk phone use; touch targets never below 44px on mobile.

## Component inventory (the ONLY allowed components — all exist in `src/components/ui/`)
| Component | Variants | Notes |
|---|---|---|
| Button | primary (accent), secondary (outline), ghost, destructive | one primary per view |
| Input / Textarea / Select | text, search, date | visible label above, inline validation on blur |
| Card | default, interactive | 12px radius, resting elevation |
| Table | comfortable rows | → stacks to cards below 768px |
| Dialog | confirm, small task | one level deep, ever |
| Sheet | right (desktop), bottom (mobile) | create/edit-in-context: appointments, customers, services |
| Toast (sonner) / Alert | success, error, info | toast transient 4s + undo; Alert banner for persistent (trial, billing) |
| EmptyState | — | icon + one line + primary action — **needs creating** (compose Card + Button) |
| Skeleton | text, card, table-row | mirrors final layout; no full-page spinners |
| Tabs | underline | within-page sections only, never navigation |
| Badge | semantic colors | appointment/payment status |
| Avatar, Tooltip, Breadcrumb | — | breadcrumb only if hierarchy ≥ 3 deep |
| Command (⌘K palette) | — | already built (`CommandPalette.tsx`) — keep |
| Calendar / date-picker | — | appointment booking |

## Amendment log
| Date | Change | Reason |
|---|---|---|
| 2026-06-10 | Initial system. | Bootstrap |
| 2026-06-10 | Tokens implemented in `globals.css` (raspberry/stone, light + dark, semantic success/warning/info, chart-1…5). Radius implemented via shadcn scale `--radius: 0.625rem` → sm 6 / md 8 / lg 10px: inputs/buttons land on the spec'd 8px, cards render 10px not 12px. Fonts wired: `font-sans`/`font-display`/`font-mono` mapped in `tailwind.config.ts`; Bricolage Grotesque loaded in `layout.tsx`. | Migration off stock shadcn theme |
| 2026-06-10 | Pricing display currency is **USD ($29/mo Pro)** to match `billing/page.tsx`; service prices remain RWF. Open inconsistency — see routes.md. | Don't invent prices |
| 2026-06-10 | Currency inconsistency resolved: plan pricing is **15,000 RWF/mo Pro / 0 RWF Free** everywhere (billing + landing). Service prices follow the salon's currency setting via `useMoney()`. | Rwanda-market product; routes.md note 4 closed |
| 2026-06-10 | Sidebar accent de-pinked: `--sidebar-accent` is now neutral stone (60 5% 92% light / 30 6% 17% dark); nav hover is neutral; active nav item = stone bg + raspberry text/icon (`text-sidebar-primary`). | User: pink hover wash on menu felt like overuse |
| 2026-06-11 | **Full redesign — dark charcoal + pink** (from `salon-app-ui/salonpro_dashboard_redesign_mockup.html`), supersedes the raspberry/warm-stone light theme. Dark-only: theme toggle removed. Canonical semantic CSS vars in `:root` (`--surface #141417`, `--surface-raised #1d1d21`, `--ink/-muted/-faint`, `--accent #ED93B1`, `--accent-deep #4B1528`, `--line`, `--status-*-bg/-fg` pairs); shadcn vars alias them. Font: Plus Jakarta Sans only (Bricolage/Geist Sans removed). Radius 12px cards / 8px buttons+inputs; 0.5px hairline borders; card padding 16px, grid gaps 12px. Status pills: booked blue, confirmed green, in-progress amber, completed teal, no-show red (deep bg + pastel text). Shared components: `StatCard`, `StatusBadge`/`PaymentBadge`, `EmptyState` (dashed border + ghost CTA). Button: one solid pink primary per screen; all else ghost (hairline border) or plain (borderless icon/quiet). Sentence case everywhere. Contrast floor `--ink-faint #71717a`. | User-provided mockup redesign |
