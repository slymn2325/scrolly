import type { Metadata } from 'next';
import Link from 'next/link';
import { BookCheck, Globe2, Mail, MessageSquareWarning } from 'lucide-react';
import TrustPageShell from '@/components/TrustPageShell';
import type { Language } from '@/i18n/translations';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ lang?: string }>;
}

function resolveLang(langParam?: string): Language {
  return langParam === 'en' ? 'en' : 'tr';
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const query = await searchParams;
  const lang = resolveLang(query?.lang);
  const canonicalUrl = 'https://scrolly.live/contact';

  return {
    title:
      lang === 'en'
        ? 'Contact & Source Corrections | Scrolly'
        : 'İletişim ve Kaynak Düzeltme | Scrolly',
    description:
      lang === 'en'
        ? 'Get in touch with the Scrolly team for scientific source corrections, copyright inquiries, privacy requests, or partnerships.'
        : 'Scrolly ekibine bilimsel kaynak düzeltmeleri, gizlilik talepleri, telif bildirimleri veya iş birlikleri için ulaşın.',
    alternates: {
      canonical: canonicalUrl,
      languages: {
        tr: `${canonicalUrl}?lang=tr`,
        en: `${canonicalUrl}?lang=en`,
        'x-default': canonicalUrl,
      },
    },
    openGraph: {
      title: lang === 'en' ? 'Contact Scrolly | scrolly.live' : 'İletişim | Scrolly',
      description:
        lang === 'en'
          ? 'Editorial contact channels and source correction notice for Scrolly (scrolly.live).'
          : 'Scrolly editöryal iletişim kanalları ve kaynak düzeltme bildirimi.',
      url: canonicalUrl,
      siteName: 'Scrolly',
      type: 'website',
    },
  };
}

export default async function ContactPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const lang = resolveLang(query?.lang);
  const isEn = lang === 'en';

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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-violet-200/80 bg-violet-50/70 p-4 dark:border-violet-700/40 dark:bg-violet-950/30">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-violet-800 dark:text-violet-300">
            <Mail className="h-4 w-4" />
            <span>{isEn ? 'Direct Email' : 'Doğrudan E-posta'}</span>
          </div>
          <a
            href="mailto:contact@scrolly.live"
            className="mt-2 inline-block text-sm font-extrabold text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-200"
          >
            contact@scrolly.live
          </a>
          <p className="mt-1.5 text-xs text-ink/75 dark:text-violet-100/75">
            {isEn
              ? 'For editorial feedback, AdSense/advertising compliance, or legal notices.'
              : 'Editöryal geri bildirim, reklam uyumluluğu ve yasal bildirimler için.'}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 dark:border-amber-700/40 dark:bg-amber-950/25">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
            <BookCheck className="h-4 w-4" />
            <span>{isEn ? 'Source & Citation Review' : 'Kaynak ve Atıf İncelemesi'}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink/80 dark:text-violet-100/85">
            {isEn
              ? 'When reporting a factual issue, please include the card URL (e.g., https://scrolly.live/fact/...) and a link to the updated peer-reviewed paper or official agency source.'
              : 'Bir bilgi kartında düzeltme önerirken lütfen kart bağlantısını (ör. https://scrolly.live/fact/...) ve güncel akademik veya kurumsal referans bağlantısını paylaşın.'}
          </p>
        </div>
      </div>

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
            href={isEn ? '/about?lang=en' : '/about'}
            className="text-xs font-extrabold text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300"
          >
            {isEn ? 'Editorial Standards →' : 'Editöryal Standartlar →'}
          </Link>
          <Link
            href="/privacy"
            className="text-xs font-extrabold text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300"
          >
            {isEn ? 'Privacy & Cookie Policy →' : 'Gizlilik ve Çerez Politikası →'}
          </Link>
        </div>
      </section>
    </TrustPageShell>
  );
}
