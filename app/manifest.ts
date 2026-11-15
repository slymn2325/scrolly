import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    lang: 'tr',
    name: 'Scrolly - Her Gün Yeni Bir Bilgi',
    short_name: 'Scrolly',
    description:
      'Uzay, doğa, insan vücudu, tarih ve bilim hakkında şaşırtıcı bilgiler keşfet, son 5 kartla hafıza quizine gir ve skorunu paylaş!',
    start_url: '/?source=pwa',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0A0A0E',
    theme_color: '#0A0A0E',
    icons: [
      {
        src: '/icons/icon-192.png?v=3',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192.png?v=3',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png?v=3',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png?v=3',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-touch-icon.png?v=3',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
