import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Compass, Cpu, ShieldCheck, Sparkles } from 'lucide-react';
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
  const canonicalUrl = 'https://scrolly.live/about';

  return {
    title:
      lang === 'en'
        ? 'About Scrolly & Editorial Methodology | scrolly.live'
        : 'Hakkımızda ve Editöryal Metodoloji | Scrolly',
    description:
      lang === 'en'
        ? 'Learn how Scrolly curates, verifies, and translates interactive bilingual micro-learning cards using primary scientific sources.'
        : 'Scrolly’nin doğrulanmış bilimsel kaynaklara dayalı iki dilli mikro öğrenme kartlarını nasıl hazırladığını ve yayın politikasını inceleyin.',
    alternates: {
      canonical: canonicalUrl,
      languages: {
        tr: `${canonicalUrl}?lang=tr`,
        en: `${canonicalUrl}?lang=en`,
        'x-default': canonicalUrl,
      },
    },
    openGraph: {
      title: lang === 'en' ? 'About Scrolly | scrolly.live' : 'Hakkımızda | Scrolly',
      description:
        lang === 'en'
          ? 'Editorial standards, primary source verification, and bilingual micro-learning architecture at Scrolly.'
          : 'Scrolly editöryal standartları, bilimsel kaynak doğrulama süreci ve mikro öğrenme yaklaşımı.',
      url: canonicalUrl,
      siteName: 'Scrolly',
      type: 'website',
    },
  };
}

export default async function AboutPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const lang = resolveLang(query?.lang);
  const isEn = lang === 'en';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': 'https://scrolly.live/about#page',
        name: isEn ? 'About Scrolly' : 'Scrolly Hakkında',
        url: 'https://scrolly.live/about',
        inLanguage: ['tr', 'en'],
        isPartOf: {
          '@type': 'WebSite',
          name: 'Scrolly',
          url: 'https://scrolly.live',
          publisher: {
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
            name: isEn ? 'About Us' : 'Hakkımızda',
            item: 'https://scrolly.live/about',
          },
        ],
      },
    ],
  };

  return (
    <TrustPageShell
      routePath="/about"
      lang={lang}
      badge={isEn ? 'Editorial Mission & Standards' : 'Editöryal Misyon ve Standartlar'}
      title={
        isEn
          ? 'About Scrolly: Science-Backed Micro-Learning'
          : 'Scrolly Hakkında: Bilimsel Mikro Öğrenme Platformu'
      }
      updatedLabel={
        isEn
          ? 'Publisher: Scrolly (scrolly.live) • Editorial Desk: contact@scrolly.live'
          : 'Yayıncı: Scrolly (scrolly.live) • Editöryal İletişim: contact@scrolly.live'
      }
      breadcrumbLabel={isEn ? 'About Us' : 'Hakkımızda'}
      jsonLd={jsonLd}
    >
      <p className="text-sm leading-relaxed text-ink/85 dark:text-violet-100/90 sm:text-base">
        {isEn
          ? 'Scrolly (https://scrolly.live) is an independent bilingual (Turkish and English) educational knowledge platform designed to turn short daily screen moments into verifiable scientific curiosity. Across six core disciplines — Space, Nature, Science, History, Human Body, and Weird Records — every card distills complex research into concise summaries, interactive diagrams, and instant memory checkpoints.'
          : 'Scrolly (https://scrolly.live), günlük kısa dijital anları doğrulanabilir bilimsel meraka dönüştürmek amacıyla geliştirilmiş bağımsız, iki dilli (Türkçe ve İngilizce) bir eğitim ve bilgi platformudur. Uzay, Doğa, Bilim, Tarih, İnsan Vücudu ve Garip Rekorlar alanlarındaki her kart; kapsamlı araştırmaları net özetlere, etkileşimli eskiz diyagramlarına ve anlık hafıza sorularına dönüştürür.'}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4 dark:border-emerald-700/40 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            <span>{isEn ? 'Primary Source Policy' : 'Birincil Kaynak İlkesi'}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink/80 dark:text-violet-100/85">
            {isEn
              ? 'Each card cites institutional archives such as NASA, ESA, Nature, PubMed/NIH, Smithsonian Magazine, and Encyclopaedia Britannica with direct outbound reference links.'
              : 'Her bilgi kartı; NASA, ESA, Nature, PubMed/NIH, Smithsonian Magazine ve Encyclopaedia Britannica gibi kurumsal referanslarla ve doğrudan kaynak bağlantılarıyla yayımlanır.'}
          </p>
        </div>

        <div className="rounded-2xl border border-violet-200/80 bg-violet-50/70 p-4 dark:border-violet-700/40 dark:bg-violet-950/30">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-violet-800 dark:text-violet-300">
            <Cpu className="h-4 w-4" />
            <span>{isEn ? 'Interactive Visual Learning' : 'Etkileşimli Görsel Anlatım'}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink/80 dark:text-violet-100/85">
            {isEn
              ? 'Hands-on Quick Guess challenges, interactive SVG sketch simulations, and 5-card Memory Sprints reinforce retention rather than passive scrolling.'
              : 'Pasif tüketim yerine Hızlı Tahmin meydan okumaları, etkileşimli SVG bilimsel eskizler ve 5 kartlık Hafıza Quizleri ile kalıcı öğrenme sağlanır.'}
          </p>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink dark:text-white">
          <BookOpen className="h-5 w-5 text-violet-600" />
          <span>
            {isEn ? '1. Fact Curation & Editorial Review Process' : '1. İçerik Üretimi ve Doğrulama Süreci'}
          </span>
        </h2>
        <p className="text-sm leading-relaxed text-ink/80 dark:text-violet-100/80">
          {isEn
            ? 'Every discovery card goes through structured editorial verification before publication: (a) cross-checking numeric claims, units, and measurements against primary scientific literature; (b) drafting a 40–60 word direct summary anchor paired with a deeper "Why / How?" mechanism breakdown; and (c) validating Turkish and English terminology separately rather than relying on blind literal translation.'
            : 'Yayımlanan her bilgi kartı üç aşamalı bir doğrulama sürecinden geçer: (a) sayısal veriler, ölçüm birimleri ve tarihsel kayıtların birincil akademik veya kurumsal kaynaklarla karşılaştırılması; (b) konunun özünü veren 40–60 kelimelik net özet ile derinlemesine "Neden / Nasıl?" bilimsel açıklamasının ayrılması; (c) Türkçe ve İngilizce bilimsel terminolojinin birbirinden bağımsız biçimde kontrol edilmesi.'}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink dark:text-white">
          <Compass className="h-5 w-5 text-amber-600" />
          <span>
            {isEn ? '2. How to Explore Scrolly' : '2. Scrolly Nasıl Kullanılır?'}
          </span>
        </h2>
        <p className="text-sm leading-relaxed text-ink/80 dark:text-violet-100/80">
          {isEn
            ? 'You can browse our full vertical discovery stream on the home page, jump directly into topic hubs such as Space or Human Body, open standalone detail pages (/fact/[slug]) with verified references, or install Scrolly as an offline-ready Progressive Web App.'
            : 'Ana sayfada dikey kaydırma akışıyla yeni kartlar keşfedebilir, Uzay veya İnsan Vücudu gibi konu merkezlerinden arşivlere erişebilir, her kartın kaynaklı detay sayfasını (/fact/[slug]) inceleyebilir ya da Scrolly’yi çevrimdışı PWA uygulaması olarak kullanabilirsiniz.'}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink dark:text-white">
          <Sparkles className="h-5 w-5 text-rose-500" />
          <span>
            {isEn ? '3. Transparency, Corrections & Feedback' : '3. Şeffaflık ve Kaynak Düzeltme Politikası'}
          </span>
        </h2>
        <p className="text-sm leading-relaxed text-ink/80 dark:text-violet-100/80">
          {isEn
            ? 'Scientific consensus evolves as new measurements arrive. If you spot an outdated statistic, broken source URL, or translation nuance on any Scrolly card, please contact our editorial verification team exclusively at contact@scrolly.live or via our Contact page so our editorial pipeline can review and update the record.'
            : 'Bilimsel veriler yeni ölçümlerle güncellenebilir. Herhangi bir bilgi kartında güncel olmayan bir istatistik, çalışmayan kaynak bağlantısı veya çeviri hatası fark ederseniz editöryal ekibimiz ve kaynak doğrulama masamız için tek resmi iletişim adresimiz olan contact@scrolly.live üzerinden ya da İletişim sayfamızdan bize ulaşabilirsiniz.'}
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href={isEn ? '/contact?lang=en' : '/contact'}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-extrabold text-white transition hover:opacity-90 dark:bg-violet-600"
          >
            <span>{isEn ? 'Report a Source Correction →' : 'Kaynak Düzeltmesi Bildir →'}</span>
          </Link>
          <a
            href="mailto:contact@scrolly.live"
            className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-extrabold text-violet-800 transition hover:bg-violet-100 dark:border-violet-700/50 dark:bg-violet-950/50 dark:text-violet-200"
          >
            contact@scrolly.live
          </a>
        </div>
      </section>
    </TrustPageShell>
  );
}
