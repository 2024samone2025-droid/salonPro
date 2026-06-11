// driver.css is imported in the root layout BEFORE globals.css so the
// theme overrides there win the cascade — do not import it here.
import { driver, type Driver, type DriveStep } from 'driver.js'
import type { UserRole } from '@/lib/auth-context'

let activeTour: Driver | null = null
// Set before a programmatic destroy (e.g. selector-poll timeout) so onDestroyed
// can tell it apart from the user finishing/skipping — only the latter persists.
let suppressCompletion = false

/** Poll for a selector via rAF; resolves false on timeout. */
function waitFor(selector: string, timeoutMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs
    const tick = () => {
      if (document.querySelector(selector)) return resolve(true)
      if (Date.now() > deadline) return resolve(false)
      requestAnimationFrame(tick)
    }
    tick()
  })
}

interface StartTourOptions {
  role: UserRole
  /** router.push — the tour itself never imports next/navigation */
  navigate: (path: string) => void
  /** Called when the user finishes or dismisses the tour — NOT on programmatic destroy */
  onComplete: () => void
}

function buildSteps(role: UserRole, opts: StartTourOptions): DriveStep[] {
  const isDesktop = window.matchMedia('(min-width: 768px)').matches

  const steps: DriveStep[] = [
    {
      // Welcome — centered modal (no element); Next hops to /appointments
      popover: {
        title: 'Welcome to SalonPro',
        description: 'A one-minute tour of the things you’ll use every day.',
        onNextClick: () => {
          opts.navigate('/appointments')
          // The grid card renders for every role (even while loading) — the
          // quick-booking bar does not (stylists can't create appointments).
          waitFor('[data-tour="appointments-grid"]').then((found) => {
            if (!activeTour) return
            if (!found) {
              // Page never arrived — bail without marking the tour complete
              suppressCompletion = true
              activeTour.destroy()
              return
            }
            activeTour.moveNext()
          })
        },
      },
    },
    // Stylists can't create appointments — the quick-booking bar doesn't render for them
    ...(role !== 'stylist'
      ? [
          {
            element: '[data-tour="quick-booking"]',
            popover: {
              title: 'Book in seconds',
              description: 'Pick a customer, service and time — the quick booking bar handles a walk-in without leaving this page.',
              side: 'bottom',
            },
          } satisfies DriveStep,
        ]
      : []),
    {
      element: '[data-tour="appointments-grid"]',
      popover: {
        title: 'Your day at a glance',
        description: 'Every appointment lives on this calendar. Drag to reschedule, click to update status or take payment.',
        side: 'top',
      },
    },
    {
      element: '[data-tour="share-booking"]',
      popover: {
        title: 'Let clients book themselves',
        description: 'Share your public booking link on WhatsApp or Instagram — bookings land straight on this calendar.',
        side: 'bottom',
      },
    },
    {
      element: isDesktop ? '[data-tour="nav-customers"]' : '[data-tour="m-nav-customers"]',
      popover: {
        title: 'Your customers',
        description: 'Everyone who has ever visited, with their history and contact details.',
        side: isDesktop ? 'right' : 'top',
      },
    },
  ]

  // Reports is hidden from stylists; on mobile it lives behind the More sheet
  if (role !== 'stylist') {
    steps.push(
      isDesktop
        ? {
            element: '[data-tour="nav-reports"]',
            popover: {
              title: 'Know your numbers',
              description: 'Revenue, top services and outstanding payments — by day, week or month.',
              side: 'right',
            },
          }
        : {
            element: '[data-tour="nav-more"]',
            popover: {
              title: 'Know your numbers',
              description: 'Reports — along with Services and Settings — live here under More.',
              side: 'top',
            },
          }
    )
  }

  return steps
}

export function startTour(opts: StartTourOptions) {
  if (activeTour) return // one tour at a time

  activeTour = driver({
    steps: buildSteps(opts.role, opts),
    showProgress: true,
    overlayOpacity: 0.6,
    stagePadding: 6,
    smoothScroll: true,
    // Highlighted elements include nav links — a stray tap mid-tour would
    // navigate away and strand the overlay
    disableActiveInteraction: true,
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    onDestroyed: () => {
      const suppressed = suppressCompletion
      suppressCompletion = false
      activeTour = null
      if (!suppressed) opts.onComplete()
    },
  })
  activeTour.drive()
}
