'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { startTour } from '@/lib/tour'

/**
 * Auto-starts the first-run product tour. Mounted once in the (app) layout.
 * Fires only when: auth has resolved, the user's tourCompleted flag is false,
 * and we're on the dashboard (the post-login landing) — never mid-task.
 */
export default function TourController() {
  const { user, loading, authFetch, refreshSession } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const attempted = useRef(false) // once per mount; also covers strict-mode double effects

  useEffect(() => {
    if (loading || !user || attempted.current) return
    if (user.tourCompleted !== false) return
    if (pathname !== '/dashboard') return

    attempted.current = true
    startTour({
      role: user.role,
      navigate: (path) => router.push(path),
      onComplete: () => {
        // Skipping counts as done — nobody gets re-ambushed next login
        authFetch('/api/users/me/tour-complete', { method: 'POST' })
          .then(() => refreshSession())
          .catch(() => {}) // on failure the tour simply offers itself again next login
      },
    })
  }, [loading, user, pathname, router, authFetch, refreshSession])

  return null
}
