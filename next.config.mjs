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

const googleRegionalOrigins = [
  'https://www.google.com',
  'https://www.google.com.tr',
  'https://www.google.de',
  'https://www.google.co.uk',
  'https://www.google.fr',
  'https://www.google.nl',
  'https://www.google.es',
  'https://www.google.it',
  'https://www.google.ca',
  'https://www.google.com.au',
  'https://www.google.com.br',
  'https://www.google.co.jp',
  'https://www.google.co.in',
  'https://www.google.az',
  'https://www.google.ch',
  'https://www.google.at',
  'https://www.google.be',
  'https://www.google.se',
  'https://www.google.no',
  'https://www.google.dk',
  'https://www.google.fi',
  'https://www.google.pl',
  'https://www.google.cz',
  'https://www.google.ro',
  'https://www.google.gr',
  'https://www.google.pt',
  'https://www.google.ie',
  'https://www.google.com.mx',
  'https://www.google.co.kr',
  'https://www.google.com.sg',
  'https://www.google.ae',
  'https://www.google.com.sa',
  'https://www.google.co.nz',
  'https://www.google.co.za',
  'https://www.google.ru',
  'https://www.google.com.ua',
].join(' ');

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob: https://scrolly.live",
  "child-src 'self' blob: https://scrolly.live",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ''} https://static.cloudflareinsights.com https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://fundingchoicesmessages.google.com https://www.clarity.ms https://scripts.clarity.ms`,
  `img-src 'self' data: blob: https://*.pexels.com https://*.pixabay.com https://pixabay.com https://*.giphy.com https://upload.wikimedia.org https://thumb.wikimedia.org https://commons.wikimedia.org https://images.unsplash.com https://apod.nasa.gov https://images-assets.nasa.gov ${googleRegionalOrigins} https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.googletagmanager.com https://*.g.doubleclick.net https://*.googlesyndication.com https://*.adtrafficquality.google https://*.clarity.ms https://c.bing.com`,
  "media-src 'self' blob: data: https://*.pexels.com https://*.pixabay.com https://pixabay.com https://*.giphy.com https://upload.wikimedia.org https://commons.wikimedia.org https://images-assets.nasa.gov",
  `connect-src 'self' https://cloudflareinsights.com https://static.cloudflareinsights.com https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.googletagmanager.com ${googleRegionalOrigins} https://*.g.doubleclick.net https://*.googlesyndication.com https://*.adtrafficquality.google https://fundingchoicesmessages.google.com https://*.clarity.ms https://c.bing.com`,
  "frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://ep2.adtrafficquality.google https://fundingchoicesmessages.google.com",
  ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
].join('; ');

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
    cpus: 3,
    staticGenerationMaxConcurrency: 4,
    staticGenerationMinPagesPerWorker: 60,
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
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
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
  async rewrites() {
    return [
      {
        source: '/indexnow-key.txt',
        destination: '/api/indexnow-key',
      },
      {
        source: '/:key([a-zA-Z0-9-]{16,128}).txt',
        destination: '/api/indexnow-key?requestedKey=:key',
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
        source: '/tr',
        destination: '/',
        statusCode: 301,
      },
      {
        source: '/tr/fact/:slug',
        destination: '/fact/:slug',
        statusCode: 301,
      },
      {
        source: '/tr/category/:category',
        destination: '/category/:category',
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
