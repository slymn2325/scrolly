import type { Metadata, Viewport } from 'next';
import DocScrollFrame from '@/components/DocScrollFrame';
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
    icon: [{ url: '/icon.svg?v=20261117', type: 'image/svg+xml' }],
    shortcut: ['/icon.svg?v=20261117'],
    apple: [{ url: '/apple-touch-icon.png?v=20261117' }],
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFF4F7' },
    { media: '(prefers-color-scheme: dark)', color: '#1E1422' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RootHtmlShell lang="tr">
      <DocScrollFrame>{children}</DocScrollFrame>
    </RootHtmlShell>
  );
}
