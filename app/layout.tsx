import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import RootHtmlShell from '@/components/RootHtmlShell';
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
    icon: [
      { url: '/icon?v=3', type: 'image/png', sizes: '512x512' },
      { url: '/icons/icon-192.png?v=3', type: 'image/png', sizes: '192x192' },
      { url: '/icon.svg?v=3', type: 'image/svg+xml' },
    ],
    shortcut: '/icon?v=3',
    apple: [
      { url: '/apple-touch-icon.png?v=3', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Scrolly — Reels Tarzı 3B Mikro Keşif Platformu',
    siteName: 'Scrolly',
    url: 'https://scrolly.live',
    description:
      'Discover mind-blowing facts in Turkish & English, play instant 5-card memory quizzes, and share your Wordle-style score card.',
    type: 'website',
  },
  other: {
    'google-adsense-account': 'ca-pub-1368005726792126',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#14111C',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const requested = headerList.get('x-scrolly-lang') || headerList.get('x-middleware-request-x-scrolly-lang');
  const lang = requested === 'en' ? 'en' : 'tr';
  return (
    <RootHtmlShell lang={lang}>
      <div className="h-[100dvh] min-h-0 overflow-hidden">{children}</div>
    </RootHtmlShell>
  );
}
