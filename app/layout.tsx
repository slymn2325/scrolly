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
    <RootHtmlShell lang={lang}>
      <DocScrollFrame>{children}</DocScrollFrame>
    </RootHtmlShell>
  );
}
