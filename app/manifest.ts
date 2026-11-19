import type { MetadataRoute } from 'next';

const ICON_VERSION = '20261119';

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
    background_color: '#FFF4F7',
    theme_color: '#FFF4F7',
    icons: [
      {
        src: `/icon-192.png?v=${ICON_VERSION}`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `/icon-512.png?v=${ICON_VERSION}`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `/icons/maskable-512.png?v=${ICON_VERSION}`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: `/icon.svg?v=${ICON_VERSION}`,
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: `/apple-touch-icon.png?v=${ICON_VERSION}`,
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `/favicon.ico?v=${ICON_VERSION}`,
        sizes: '48x48',
        type: 'image/x-icon',
      },
      {
        src: `/icons/mask-icon.svg?v=${ICON_VERSION}`,
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'monochrome',
      },
    ],
  };
}
