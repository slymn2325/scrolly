import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import DocScrollFrame from '@/components/DocScrollFrame';
import RootHtmlShell from '@/components/RootHtmlShell';
import { BRAND_OG_IMAGE } from '@/lib/homeMetadata';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://scrolly.live'),
  title: 'Scrolly — Kaydır, Öğren, Şaşır | Mikro Öğrenme & Quiz',
  description:
    'Uzay, doğa, insan vücudu, tarih, bilim ve B1–C2 İngilizce kelime kartlarını kaydır; Hızlı Tahmin, 5 soruluk Quiz ve Scrolla 1v1 düellosunda yarış!',
  applicationName: 'Scrolly',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Scrolly',
  },
  icons: {
    icon: [
      { url: '/favicon.ico?v=20261119', sizes: '48x48', type: 'image/x-icon' },
      { url: '/icon.svg?v=20261119', type: 'image/svg+xml' },
      { url: '/icon-192.png?v=20261119', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png?v=20261119', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico?v=20261119'],
    apple: [{ url: '/apple-touch-icon.png?v=20261119', sizes: '180x180', type: 'image/png' }],
    other: [{ rel: 'mask-icon', url: '/icons/mask-icon.svg?v=20261119', color: '#5B2A43' }],
  },
  openGraph: {
    title: 'Scrolly — Kaydır, Öğren, Şaşır | Mikro Öğrenme & Quiz',
    siteName: 'Scrolly',
    url: 'https://scrolly.live',
    description:
      'Discover verified science, space, nature, history, and human body facts in Turkish & English, play instant quizzes, and compete in Scrolla 1v1 duels.',
    type: 'website',
    images: [BRAND_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scrolly — Kaydır, Öğren, Şaşır | Mikro Öğrenme & Quiz',
    description:
      'Uzay, doğa, insan vücudu, tarih, bilim ve B1–C2 İngilizce kelime kartlarını kaydır; Hızlı Tahmin, 5 soruluk Quiz ve Scrolla 1v1 düellosunda yarış!',
    images: [BRAND_OG_IMAGE.url],
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
        url: 'https://scrolly.live/icon-512.png?v=20261119',
        width: 512,
        height: 512,
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
      operatingSystem: 'Any',
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
        'Quick Guess Interactive Sliders & Daily Shared Guess',
        'Word Lab B1–C2 English Vocabulary Cards',
        'Daily Sprint, Weekly Marathon & Memory Quizzes',
        'Async Quiz Challenges (/challenge/[code])',
        'Scrolla 1v1 Live Multiplayer Knowledge Arena',
        'Private Friend & Class Mini Leagues',
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
