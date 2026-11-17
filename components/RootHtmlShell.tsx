import React from 'react';
import Script from 'next/script';
import type { Language } from '@/i18n/translations';
import { fontVariableClassName } from '@/lib/fonts';

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-TQ6VVKM7';

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
        url: 'https://scrolly.live/icon.svg?v=20261117',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'contact@scrolly.live',
        contactType: 'customer support',
        availableLanguage: ['English', 'Turkish'],
      },
    },
  ],
};

const CONSENT_MODE_BOOTSTRAP_SCRIPT = `
window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
window.gtag = window.gtag || gtag;
gtag('consent', 'default', {
  ad_storage: 'denied',
  analytics_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  wait_for_update: 500
});
try {
  var searchStr = window.location.search || '';
  var hasLangEn = /(?:^|[?&])lang=en(?:&|$)/.test(searchStr);
  var hasLangTr = /(?:^|[?&])lang=tr(?:&|$)/.test(searchStr);
  if (hasLangEn || window.location.pathname === '/en' || window.location.pathname.indexOf('/en/') === 0) {
    document.documentElement.lang = 'en';
  } else if (hasLangTr) {
    document.documentElement.lang = 'tr';
  }
  var root = document.documentElement;
  function scrollyApplyTheme() {
    var wantDark = false;
    try {
      var rawMem = window.localStorage ? window.localStorage.getItem('merak_user_state_v1') : null;
      var parsedMem = rawMem ? JSON.parse(rawMem) : null;
      var appearance = parsedMem && parsedMem.appearance;
      var osDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (appearance === 'dark') wantDark = true;
      else if (appearance === 'light') wantDark = false;
      else if (appearance === 'system') wantDark = !!osDark;
      else if (parsedMem && parsedMem.themeCustomized === true && parsedMem.darkMode === true) wantDark = true;
    } catch (err) {}
    root.classList.toggle('dark', wantDark);
  }
  scrollyApplyTheme();
  if (window.matchMedia) {
    var themeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (themeQuery.addEventListener) themeQuery.addEventListener('change', scrollyApplyTheme);
  }
} catch (e) {}
try {
  var savedConsent = window.localStorage.getItem('scrolly_consent_v2');
  if (savedConsent === 'granted') {
    gtag('consent', 'update', {
      ad_storage: 'granted',
      analytics_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted'
    });
  }
} catch (e) {}
`.trim();

interface RootHtmlShellProps {
  lang: Language;
  children: React.ReactNode;
}

export default function RootHtmlShell({ lang, children }: RootHtmlShellProps) {
  return (
    <html lang={lang} className={fontVariableClassName} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: CONSENT_MODE_BOOTSTRAP_SCRIPT,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(ROOT_SCHEMA_JSON_LD).replace(/</g, '\\u003c'),
          }}
        />
      </head>
      <body className="h-[100dvh] overflow-hidden bg-cik-bg font-sans text-cik-text antialiased selection:bg-cik-pink selection:text-cik-text">
        <div aria-hidden="true" className="pwa-statusbar-guard" />
        {children}
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');
          `}
        </Script>
      </body>
    </html>
  );
}
