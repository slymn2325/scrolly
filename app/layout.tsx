import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import DocScrollFrame from '@/components/DocScrollFrame';
import RootHtmlShell from '@/components/RootHtmlShell';
import { BRAND_OG_IMAGE } from '@/lib/homeMetadata';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://scrolly.live'),
  title: 'Scrolly — Tek Saniyede Mikro Keşif | scrolly.live',
  description:
    'Uzay, doğa, insan vücudu, tarih ve bilim hakkında şaşırtıcı bilgiler keşfet, son 5 kartla hafıza quizine gir ve skorunu paylaş!',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black',
    title: 'Scrolly',
  },
  icons: {
    icon: [{ url: '/icon.svg?v=20261117b', type: 'image/svg+xml' }],
    shortcut: ['/icon.svg?v=20261117b'],
    apple: [{ url: '/apple-touch-icon.png?v=20261117b' }],
    other: [{ rel: 'mask-icon', url: '/icons/mask-icon.svg?v=20261117b', color: '#5B2A43' }],
  },
  openGraph: {
    title: 'Scrolly — Reels Tarzı 3B Mikro Keşif Platformu',
    siteName: 'Scrolly',
    url: 'https://scrolly.live',
    description:
      'Discover mind-blowing facts in Turkish & English, play instant 5-card memory quizzes, and share your Wordle-style score card.',
    type: 'website',
    images: [BRAND_OG_IMAGE],
  },
  other: {
    'google-adsense-account': 'ca-pub-1368005726792126',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFF4F7' },
    { media: '(prefers-color-scheme: dark)', color: '#1E1422' },
  ],
};

const ROOT_SCHEMA_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://scrolly.live/#website',
      name: 'Scrolly',
      alternateName: 'scrolly.live',
      url: 'https://scrolly.live',
      description:
        'Scrolly (https://scrolly.live) is a free bilingual (English & Turkish) reels-style micro-learning platform featuring verified science fact cards, Quick Guess challenges, Word Lab (B1–C2 vocabulary), quizzes, and Scrolla 1v1 duels.',
      inLanguage: ['en', 'tr'],
      publisher: {
        '@id': 'https://scrolly.live/#organization',
      },
    },
    {
      '@type': 'Organization',
      '@id': 'https://scrolly.live/#organization',
      name: 'Scrolly',
      url: 'https://scrolly.live',
      email: 'contact@scrolly.live',
      logo: {
        '@type': 'ImageObject',
        url: 'https://scrolly.live/icon.svg?v=20261117b',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'contact@scrolly.live',
        contactType: 'customer support',
        availableLanguage: ['English', 'Turkish'],
      },
    },
    {
      '@type': 'WebApplication',
      '@id': 'https://scrolly.live/#webapp',
      name: 'Scrolly',
      url: 'https://scrolly.live',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web, iOS, Android',
      browserRequirements: 'Requires JavaScript, HTML5',
      inLanguage: ['en', 'tr'],
      isAccessibleForFree: true,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      description:
        'Bilingual reels-style micro-learning platform with verified scientific facts, Quick Guess estimation challenges, B1–C2 Word Lab, Daily/Memory Quizzes, and Scrolla 1v1 knowledge duels.',
      featureList: [
        'Verified Bilingual Fact Cards (TR & EN)',
        'Quick Guess Interactive Sliders & Challenges',
        'Word Lab B1–C2 English Vocabulary Cards',
        'Daily Sprint, Weekly Marathon & Memory Quizzes',
        'Scrolla 1v1 Live Multiplayer Knowledge Arena',
        'Offline-Ready Progressive Web App (PWA)',
      ],
      publisher: {
        '@id': 'https://scrolly.live/#organization',
      },
    },
  ],
};

async function documentLang(): Promise<'en' | 'tr'> {
  const headerList = await headers();
  const requested =
    headerList.get('x-scrolly-lang') || headerList.get('x-middleware-request-x-scrolly-lang');
  return requested === 'en' ? 'en' : 'tr';
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await documentLang();
  return (
    <RootHtmlShell lang={lang} jsonLd={ROOT_SCHEMA_JSON_LD}>
      <DocScrollFrame>{children}</DocScrollFrame>
    </RootHtmlShell>
  );
}
