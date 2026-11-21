import type { Metadata } from 'next';
import PrivacyPolicyView from '@/components/PrivacyPolicyView';
import type { Language } from '@/i18n/translations';
import { BRAND_OG_IMAGE } from '@/lib/homeMetadata';
import { safeJsonLdStringify } from '@/lib/originPolicy';
import { fitDocumentTitle } from '@/utils/factSeo';

interface PageProps {
  searchParams: Promise<{ lang?: string; from?: string }>;
}

function resolveLang(langParam?: string): Language {
  return langParam === 'en' ? 'en' : 'tr';
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const query = await searchParams;
  const lang = resolveLang(query?.lang);
  const canonicalUrl = 'https://scrolly.live/privacy';
  const title = fitDocumentTitle(
    lang === 'en'
      ? 'Privacy Policy, Cookies & Data Protection | Scrolly'
      : 'Gizlilik Politikası, Çerezler ve Veri Koruma | Scrolly'
  );
  const description =
    lang === 'en'
      ? 'Review Scrolly’s privacy policy covering guest localStorage, optional passwordless email OTP sync, offline PWA caching, analytics, and AdSense.'
      : 'Scrolly anonim misafir depolaması, şifresiz e-posta OTP senkronu, çevrimdışı PWA önbelleği, analitik ve Google AdSense çerez politikasını inceleyin.';
  const image = { ...BRAND_OG_IMAGE, alt: title };

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        tr: `${canonicalUrl}?lang=tr`,
        en: `${canonicalUrl}?lang=en`,
        'x-default': canonicalUrl,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Scrolly',
      locale: lang === 'en' ? 'en_US' : 'tr_TR',
      type: 'website',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image.url],
    },
  };
}

export default async function PrivacyPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const lang = resolveLang(query?.lang);
  const isEn = lang === 'en';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': 'https://scrolly.live/privacy#page',
        name: isEn ? 'Privacy Policy — Scrolly' : 'Gizlilik Politikası — Scrolly',
        url: 'https://scrolly.live/privacy',
        inLanguage: ['tr', 'en'],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: isEn ? 'Home' : 'Ana Sayfa',
            item: 'https://scrolly.live',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: isEn ? 'Privacy Policy' : 'Gizlilik Politikası',
            item: 'https://scrolly.live/privacy',
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLdStringify(jsonLd),
        }}
      />
      <PrivacyPolicyView initialLang={lang} returnToProfile={query.from === 'profile'} />
    </>
  );
}
