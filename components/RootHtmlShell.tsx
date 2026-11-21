import React from 'react';
import Script from 'next/script';
import type { Language } from '@/i18n/translations';
import { fontVariableClassName } from '@/lib/fonts';
import { safeJsonLdStringify } from '@/lib/originPolicy';

const RAW_GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-TQ6VVKM7';
const GTM_ID = /^GTM-[A-Z0-9]{4,16}$/i.test(RAW_GTM_ID.trim())
  ? RAW_GTM_ID.trim()
  : 'GTM-TQ6VVKM7';

const RAW_CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID || 'zh55547w0a';
const CLARITY_ID = /^[a-z0-9]{6,20}$/i.test(RAW_CLARITY_ID.trim())
  ? RAW_CLARITY_ID.trim()
  : 'zh55547w0a';

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
  jsonLd?: Record<string, unknown>;
  children: React.ReactNode;
}

export default function RootHtmlShell({ lang, jsonLd, children }: RootHtmlShellProps) {
  return (
    <html lang={lang} className={fontVariableClassName} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: CONSENT_MODE_BOOTSTRAP_SCRIPT,
          }}
        />
        {jsonLd ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: safeJsonLdStringify(jsonLd),
            }}
          />
        ) : null}
      </head>
      <body className="h-[100dvh] overflow-hidden bg-cik-bg font-sans text-cik-text antialiased selection:bg-cik-pink selection:text-cik-text">
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
        {process.env.NODE_ENV === 'production' ? (
          <Script id="ms-clarity" strategy="afterInteractive">
            {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "${CLARITY_ID}");`}
          </Script>
        ) : null}
      </body>
    </html>
  );
}
