import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://scrolly.live'),
  title: 'Scrolly — Tek Saniyede Mikro Keşif | scrolly.live',
  description:
    'Uzay, doğa, insan vücudu, tarih ve bilim hakkında şaşırtıcı bilgiler keşfet, son 5 kartla hafıza quizine gir ve skorunu paylaş!',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Scrolly',
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
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#EDE9FE',
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
        'Scrolly (https://scrolly.live), uzay, doğa, bilim, tarih, insan vücudu ve dünya rekorları alanlarında doğrulanmış bilimsel kaynaklara dayalı, etkileşimli iki dilli (Türkçe ve İngilizce) mikro öğrenme kartları sunan bir bilgi platformudur.',
      inLanguage: ['tr', 'en'],
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://scrolly.live/?fact={search_term_string}',
        'query-input': 'required name=search_term_string',
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
      inLanguage: ['tr', 'en'],
      isAccessibleForFree: true,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Scrolly',
        url: 'https://scrolly.live',
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(ROOT_SCHEMA_JSON_LD).replace(/</g, '\\u003c'),
          }}
        />
      </head>
      <body className="min-h-screen bg-[#FFFDF9] font-sans text-ink antialiased selection:bg-amber-200 selection:text-ink">
        {children}
        <Script
          id="google-adsense-script"
          strategy="afterInteractive"
          crossOrigin="anonymous"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1368005726792126"
        />
      </body>
    </html>
  );
}
