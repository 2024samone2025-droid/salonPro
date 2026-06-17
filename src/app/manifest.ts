import type { MetadataRoute } from 'next'

// PWA manifest (Next serves this at /manifest.webmanifest and auto-links it).
// Colors come from the brand: charcoal surface + raspberry primary.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SalonPro Rwanda',
    short_name: 'SalonPro',
    description: 'Manage appointments, customers, staff, and services for your salon.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#17151f',
    theme_color: '#17151f',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
