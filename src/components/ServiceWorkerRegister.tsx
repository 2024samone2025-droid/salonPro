'use client'

import { useEffect } from 'react'

// Registers the PWA service worker once, after the window loads, in production
// only. Dev keeps a clean reload story (no SW caching surprises while iterating).
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registration is best-effort; the app works fine without it.
      })
    }
    window.addEventListener('load', onLoad)
    return () => window.removeEventListener('load', onLoad)
  }, [])

  return null
}
