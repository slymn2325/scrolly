import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Scrolly - Her Gün Yeni Bir Bilgi',
    short_name: 'Scrolly',
    description:
      'Uzay, doğa, insan vücudu, tarih ve bilim hakkında şaşırtıcı bilgiler keşfet, son 5 kartla hafıza quizine gir ve skorunu paylaş!',
    start_url: '/?source=pwa',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0F172A',
    theme_color: '#0F172A',
    icons: [
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
