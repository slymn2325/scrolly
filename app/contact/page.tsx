import type { Metadata } from 'next';
import Link from 'next/link';
import { Globe2, MessageSquareWarning } from 'lucide-react';
import ContactInteractiveSection from '@/components/ContactInteractiveSection';
import TrustPageShell from '@/components/TrustPageShell';
import type { Language } from '@/i18n/translations';
import { BRAND_OG_IMAGE } from '@/lib/homeMetadata';
import { fitDocumentTitle } from '@/utils/factSeo';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ lang?: string; from?: string }>;
}

function resolveLang(langParam?: string): Language {
  return langParam === 'en' ? 'en' : 'tr';
}

function buildLegalHref(
  pathname: '/about' | '/privacy',
  lang: Language,
  returnToProfile: boolean,
  includeLang = true,
): string {
  const params = new URLSearchParams();
  if (includeLang && lang === 'en') params.set('lang', 'en');
  if (returnToProfile) params.set('from', 'profile');
  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const query = await searchParams;
  const lang = resolveLang(query?.lang);
  const canonicalUrl = 'https://scrolly.live/contact';
  const title = fitDocumentTitle(
    lang === 'en'
      ? 'Contact Scrolly & Report Source Corrections | scrolly.live'
      : 'İletişim ve Bilimsel Kaynak Düzeltme Bildirimi | Scrolly'
  );
  const description =
    lang === 'en'
      ? 'Contact the Scrolly editorial verification desk at contact@scrolly.live for primary scientific source corrections, copyright notices, or privacy inquiries.'
      : 'Bilimsel kaynak düzeltmeleri, çeviri geri bildirimleri, telif bildirimleri veya gizlilik talepleri için Scrolly editöryal ekibine ulaşın.';
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

export default async function ContactPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const lang = resolveLang(query?.lang);
  const isEn = lang === 'en';
  const returnToProfile = query.from === 'profile';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ContactPage',
        '@id': 'https://scrolly.live/contact#page',
        name: isEn ? 'Contact Scrolly' : 'Scrolly İletişim',
        url: 'https://scrolly.live/contact',
        inLanguage: ['tr', 'en'],
        mainEntity: {
          '@type': 'Organization',
          name: 'Scrolly',
          url: 'https://scrolly.live',
          email: 'contact@scrolly.live',
          contactPoint: {
            '@type': 'ContactPoint',
            email: 'contact@scrolly.live',
            contactType: 'customer support',
            availableLanguage: ['English', 'Turkish'],
          },
        },
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
            name: isEn ? 'Contact' : 'İletişim',
            item: 'https://scrolly.live/contact',
          },
        ],
      },
    ],
  };

  return (
    <TrustPageShell
      routePath="/contact"
      lang={lang}
      returnToProfile={returnToProfile}
      badge={isEn ? 'Editorial & Support Desk' : 'Editöryal Destek ve İletişim'}
      title={
        isEn
          ? 'Contact Scrolly & Report Fact Corrections'
          : 'İletişim ve Kaynak Düzeltme Bildirimi'
      }
      updatedLabel="Scrolly • https://scrolly.live • contact@scrolly.live"
      breadcrumbLabel={isEn ? 'Contact' : 'İletişim'}
      jsonLd={jsonLd}
    >
      <p className="text-sm leading-relaxed text-ink/85 dark:text-violet-100/90 sm:text-base">
        {isEn
          ? 'We welcome reader feedback, scientific citation updates, translation suggestions, copyright notices, and privacy inquiries. Every source correction message is reviewed against primary literature.'
          : 'Okuyucu geri bildirimlerini, bilimsel kaynak güncellemelerini, çeviri önerilerini, telif bildirimlerini ve gizlilik sorularınızı memnuniyetle karşılıyoruz. Gönderilen her kaynak düzeltmesi birincil literatürle karşılaştırılarak incelenir.'}
      </p>

      <ContactInteractiveSection lang={lang} />

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink dark:text-white sm:text-lg">
          <MessageSquareWarning className="h-5 w-5 text-rose-500" />
          <span>
            {isEn ? 'Privacy & Data Inquiries' : 'Gizlilik ve Yerel Veri Talepleri'}
          </span>
        </h2>
        <p className="text-sm leading-relaxed text-ink/80 dark:text-violet-100/80">
          {isEn
            ? 'Scrolly does not maintain personal user accounts or store email/password profiles. Anonymous device reading progress stored locally in your browser can be cleared immediately via "Reset Memory" inside your Explorer Diploma screen. Full details are available on our Privacy Policy page.'
            : 'Scrolly kişisel hesap veya e-posta/şifre profili tutmaz. Tarayıcınızda anonim olarak saklanan okuma geçmişinizi dilediğiniz zaman Kaşif Diploması ekranındaki "Hafızayı Sıfırla" seçeneğiyle silebilirsiniz. Detaylar için Gizlilik Politikamızı inceleyebilirsiniz.'}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink dark:text-white sm:text-lg">
          <Globe2 className="h-5 w-5 text-sky-600" />
          <span>
            {isEn ? 'Open Source & Technical Information' : 'Açık Kaynak ve Teknik Bilgiler'}
          </span>
        </h2>
        <p className="text-sm leading-relaxed text-ink/80 dark:text-violet-100/80">
          {isEn
            ? 'For technical bug reports, Progressive Web App (PWA) compatibility issues, or broken diagram rendering on specific mobile devices, write to contact@scrolly.live with your browser version and device model.'
            : 'Teknik hata bildirimleri, PWA çevrimdışı mod sorunları veya mobil tarayıcı uyumsuzlukları için cihaz modeli ve tarayıcı bilgisiyle birlikte contact@scrolly.live adresine yazabilirsiniz.'}
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href={buildLegalHref('/about', lang, returnToProfile)}
            className="text-xs font-extrabold text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300"
          >
            {isEn ? 'Editorial Standards →' : 'Editöryal Standartlar →'}
          </Link>
          <Link
            href={buildLegalHref('/privacy', lang, returnToProfile, false)}
            className="text-xs font-extrabold text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300"
          >
            {isEn ? 'Privacy & Cookie Policy →' : 'Gizlilik ve Çerez Politikası →'}
          </Link>
        </div>
      </section>
    </TrustPageShell>
  );
}
