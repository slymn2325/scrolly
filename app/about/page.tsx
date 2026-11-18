import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Compass, Cpu, HelpCircle, ShieldCheck, Sparkles } from 'lucide-react';
import TrustPageShell from '@/components/TrustPageShell';
import type { Language } from '@/i18n/translations';
import { BRAND_OG_IMAGE } from '@/lib/homeMetadata';
import { fitDocumentTitle } from '@/utils/factSeo';

export const revalidate = 3600;

interface PageProps {
  searchParams: Promise<{ lang?: string; from?: string }>;
}

function resolveLang(langParam?: string): Language {
  return langParam === 'en' ? 'en' : 'tr';
}

function buildContactHref(lang: Language, returnToProfile: boolean): string {
  const params = new URLSearchParams();
  if (lang === 'en') params.set('lang', 'en');
  if (returnToProfile) params.set('from', 'profile');
  const queryString = params.toString();
  return queryString ? `/contact?${queryString}` : '/contact';
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const query = await searchParams;
  const lang = resolveLang(query?.lang);
  const canonicalUrl = 'https://scrolly.live/about';
  const title = fitDocumentTitle(
    lang === 'en'
      ? 'About Scrolly & Editorial Methodology | scrolly.live'
      : 'Hakkımızda ve Editöryal Metodoloji | Scrolly'
  );
  const description =
    lang === 'en'
      ? 'Learn how Scrolly curates, verifies, and translates interactive bilingual micro-learning cards using primary scientific sources.'
      : 'Scrolly’nin doğrulanmış bilimsel kaynaklara dayalı iki dilli mikro öğrenme kartlarını nasıl hazırladığını ve yayın politikasını inceleyin.';
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
      title: fitDocumentTitle(lang === 'en' ? 'About Scrolly | scrolly.live' : 'Hakkımızda | Scrolly'),
      description:
        lang === 'en'
          ? 'Editorial standards, primary source verification, and bilingual micro-learning architecture at Scrolly.'
          : 'Scrolly editöryal standartları, bilimsel kaynak doğrulama süreci ve mikro öğrenme yaklaşımı.',
      url: canonicalUrl,
      siteName: 'Scrolly',
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

export default async function AboutPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const lang = resolveLang(query?.lang);
  const isEn = lang === 'en';
  const returnToProfile = query.from === 'profile';

  const faqItems = isEn
    ? [
        {
          question: 'What is Scrolly?',
          answer:
            'Scrolly is a free bilingual (English and Turkish) reels-style micro-learning platform built around verified scientific curiosity. Every vertical card combines a concise summary, a deeper "Why / How?" breakdown, primary source links, interactive Quick Guess sliders, and instant recall quizzes.',
        },
        {
          question: 'Is Scrolly free to use?',
          answer:
            'Yes, Scrolly is completely free with no mandatory sign-up or paywall. You can explore every card, join quizzes, play Scrolla 1v1 duels, and save favorites immediately as a guest, or optionally link an email via one-time OTP to sync XP across devices.',
        },
        {
          question: 'What topics does Scrolly cover?',
          answer:
            'Scrolly covers eight interactive categories: Space, Nature, Human Body, History, Science, Weird Records, Statistics, and Word Lab (B1–C2 English vocabulary). Fact cards reference primary institutions such as NASA, ESA, Nature, PubMed/NIH, Smithsonian, and Britannica for direct verification.',
        },
        {
          question: 'How does Scrolla 1v1 work?',
          answer:
            'Scrolla 1v1 is Scrolly’s real-time two-player trivia arena. One player creates a room with a chosen topic and 3, 5, 7, or 10 questions to generate a 6-character code. When both players join and mark ready, a synchronized 5-second countdown starts an identical question pack.',
        },
        {
          question: 'How does Word Lab work?',
          answer:
            'Word Lab helps Turkish and English learners master B1–C2 vocabulary inside the vertical feed. Each word card includes IPA pronunciation, normal and slow text-to-speech audio, bilingual example sentences, synonyms, an instant meaning quiz for +15 XP, and a personal Word Notebook.',
        },
      ]
    : [
        {
          question: 'Scrolly nedir?',
          answer:
            'Scrolly; doğrulanmış bilimsel kaynaklara dayanan ücretsiz, iki dilli (Türkçe ve İngilizce) reels tarzı bir mikro-öğrenme platformudur. Her dikey bilgi kartı; net özet, "Neden / Nasıl?" açıklaması, birincil kaynak bağlantısı, etkileşimli Hızlı Tahmin oyunu ve anlık pekiştirme testi içerir.',
        },
        {
          question: 'Scrolly ücretsiz mi?',
          answer:
            'Evet, Scrolly tamamen ücretsizdir ve zorunlu üyelik gerektirmez. Misafir olarak tüm kartları kaydırabilir, quizleri çözebilir, Scrolla 1v1 düellolarına katılabilir ve favorilerinizi kaydedebilirsiniz; isterseniz tek kullanımlık e-posta OTP ile ilerlemenizi cihazlar arasında senkronize edebilirsiniz.',
        },
        {
          question: 'Scrolly hangi konuları kapsar?',
          answer:
            'Scrolly sekiz temel alanı kapsar: Uzay, Doğa, İnsan Vücudu, Tarih, Bilim, Garip Rekorlar, İstatistik ve Word Lab (B1–C2 İngilizce kelime öğrenme). Bilgi kartları NASA, ESA, Nature, PubMed/NIH, Smithsonian ve Britannica gibi birincil kaynaklara doğrudan atıf yaparak doğrulanabilir bilgi sunar.',
        },
        {
          question: 'Scrolla 1v1 nasıl çalışır?',
          answer:
            'Scrolla 1v1, iki oyuncunun aynı kart paketinde yarıştığı gerçek zamanlı bilgi arenasıdır. Oda kuran oyuncu konu seçip 3, 5, 7 veya 10 soru belirleyerek 6 haneli oda kodu oluşturur. İki oyuncu da "Hazır Ol" dediğinde senkronize geri sayımla maç başlar.',
        },
        {
          question: 'Word Lab (Dil Öğrenme) nasıl çalışır?',
          answer:
            'Word Lab, B1–C2 seviye İngilizce kelimeleri dikey akış içinde öğretir. Her kartta IPA telaffuz gösterimi, normal ve yavaş sesli dinleme, iki dilli bağlam cümleleri, eş anlamlılar, +15 XP kazandıran anlık anlam testi ve kişisel Kelime Defteri bulunur.',
        },
      ];

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
      {
        '@type': 'FAQPage',
        '@id': 'https://scrolly.live/about#faq',
        mainEntity: faqItems.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      },
    ],
  };

  return (
    <TrustPageShell
      routePath="/about"
      lang={lang}
      returnToProfile={returnToProfile}
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
              ? 'Hands-on Quick Guess challenges, interactive SVG sketch simulations, and 5-card Memory Sprints reinforce retention rather than passive scrolling. Card media comes from the provider actually used on that card: Pexels, Pixabay, Giphy, Wikimedia Commons, Unsplash, or NASA.'
              : 'Pasif tüketim yerine Hızlı Tahmin meydan okumaları, etkileşimli SVG bilimsel eskizler ve 5 kartlık Hafıza Quizleri ile kalıcı öğrenme sağlanır. Kart görseli, o kartta gerçekten kullanılan sağlayıcıdan gelir: Pexels, Pixabay, Giphy, Wikimedia Commons, Unsplash veya NASA.'}
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
            href={buildContactHref(lang, returnToProfile)}
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
      <section className="space-y-3 border-t border-cik-line pt-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink dark:text-white">
          <HelpCircle className="h-5 w-5 text-violet-600" />
          <span>
            {isEn ? '4. Frequently Asked Questions (FAQ)' : '4. Sıkça Sorulan Sorular (FAQ)'}
          </span>
        </h2>
        <div className="space-y-2.5">
          {faqItems.map((item) => (
            <div
              key={item.question}
              className="rounded-2xl border border-cik-line bg-cik-surface-2 p-4"
            >
              <h3 className="font-display text-sm font-extrabold text-ink dark:text-white sm:text-base">
                {item.question}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/80 dark:text-violet-100/85">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </section>
    </TrustPageShell>
  );
}
