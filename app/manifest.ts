import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gongmyung's App Gallery",
    short_name: 'Gongmyung Apps',
    description: 'Gongmyung - We\'re just. that kind of group!',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#fbbf24',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      }
    ],
    categories: ['productivity', 'utilities', 'entertainment'],
    lang: 'en',
    dir: 'ltr'
  }
}
