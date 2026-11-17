import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const duplicateSlugToKeeper = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'lib/duplicateSlugs.json'), 'utf8')
);

const LEGACY_SLUGS_BY_TARGET = [
  [
    'antarctic-icefish-has-transparent-blood-zero-hemoglobin',
    [
      'ahtapotlarin-3-kalbi-ve-mavi-kani-vardir',
      'ahtapotlarin-uc-kalbi-ve-mavi-kani',
      'octopuses-have-3-hearts-and-blue-blood',
      'octopuses-have-three-hearts-and-blue-blood',
    ],
  ],
  [
    'greenland-shark-eye-lens-radiocarbon-400-years',
    [
      'kopekbaliklari-agaclardan-ve-saturnun-halkalarindan-daha-yaslidir',
      'kopekbaliklari-agaclardan-ve-saturnun-halkalarindan-eskidir',
      'sharks-are-older-than-trees-and-saturns-rings',
    ],
  ],
  [
    'alpine-swift-flies-nonstop-for-200-days-without-landing',
    [
      'flamingolar-pembe-degil-gri-beyaz-tuylerle-dogar',
      'flamingolar-pembe-dogmaz',
      'flamingos-are-born-grey-not-pink',
    ],
  ],
  [
    'superfluid-helium-4-climbs-container-walls-zero-viscosity',
    [
      'antik-misir-mezarlarindaki-3-000-yillik-bal-hala-yenebilir-durumdadir',
      'dogal-bal-binlerce-yil-bozulmaz',
      '3-000-year-old-honey-from-egyptian-tombs-is-still-edible',
      'natural-honey-never-spoils',
    ],
  ],
  [
    'sonoluminescence-sound-waves-turn-water-bubble-into-star-hot-light',
    [
      'cilek-botanik-olarak-meyve-degildir-ama-muz-bir-uzumsu-meyvedir',
      'muzlar-dogal-olarak-cok-az-radyoaktiftir',
      'strawberries-arent-berries-but-bananas-are',
      'bananas-are-naturally-slightly-radioactive',
    ],
  ],
  [
    'pitch-drop-experiment-only-9-drops-since-1927',
    [
      'eyfel-kulesi-yaz-aylarinda-15-santimetre-uzar',
      'eyfel-kulesi-yazin-15-santimetre-uzar',
      'the-eiffel-tower-grows-15-centimeters-taller-in-summer',
      'eiffel-tower-grows-15-cm-taller-in-summer',
    ],
  ],
];

const legacyFactRedirects = [
  ...LEGACY_SLUGS_BY_TARGET,
  ...Object.entries(duplicateSlugToKeeper),
].flatMap(([targetSlug, oldSlugs]) => {
  const sources = Array.isArray(oldSlugs) ? oldSlugs : [targetSlug];
  const destination = Array.isArray(oldSlugs) ? targetSlug : oldSlugs;
  return sources.flatMap((oldSlug) => [
    {
      source: `/fact/${oldSlug}`,
      destination: `/fact/${destination}`,
      statusCode: 301,
    },
    {
      source: `/en/fact/${oldSlug}`,
      destination: `/en/fact/${destination}`,
      statusCode: 301,
    },
  ]);
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**.giphy.com' },
      { protocol: 'https', hostname: '**.pexels.com' },
      { protocol: 'https', hostname: '**.pixabay.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'thumb.wikimedia.org' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/assets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/brand/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source:
          '/:file(icon\\.svg|icon-192\\.png|icon-512\\.png|apple-touch-icon\\.png|favicon\\.ico|favicon\\.svg)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fact/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/en/fact/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/category/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/en/category/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.scrolly.live',
          },
        ],
        destination: 'https://scrolly.live/:path*',
        statusCode: 301,
      },
      {
        source: '/bilgi/:slug',
        destination: '/fact/:slug',
        statusCode: 301,
      },
      {
        source: '/category/human_body',
        destination: '/category/human-body',
        statusCode: 301,
      },
      {
        source: '/en/category/human_body',
        destination: '/en/category/human-body',
        statusCode: 301,
      },
      {
        source: '/category/weird_records',
        destination: '/category/records',
        statusCode: 301,
      },
      {
        source: '/en/category/weird_records',
        destination: '/en/category/records',
        statusCode: 301,
      },
      {
        source: '/category/istatistik',
        destination: '/category/statistics',
        statusCode: 301,
      },
      {
        source: '/en/category/istatistik',
        destination: '/en/category/statistics',
        statusCode: 301,
      },
      ...legacyFactRedirects,
    ];
  },
};

export default nextConfig;
