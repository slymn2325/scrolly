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
      ? 'About Scrolly & Editorial Verification Process | Scrolly'
      : 'Scrolly Hakkında ve Editöryal Doğrulama Süreci | Scrolly'
  );
  const description =
    lang === 'en'
      ? 'Learn how Scrolly curates, fact-checks, and translates bilingual micro-learning cards using primary scientific sources, plus read our editorial FAQ.'
      : 'Scrolly’nin doğrulanmış bilimsel kaynaklara dayalı iki dilli mikro öğrenme kartlarını nasıl hazırladığını, doğrulama adımlarını ve SSS’yi inceleyin.';
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
            'Scrolly (https://scrolly.live) is a free bilingual (English and Turkish) reels-style micro-learning Progressive Web App built around verified scientific curiosity. Every vertical card combines a direct 40–60 word summary, a deeper "Why / How?" breakdown, primary source links, interactive Quick Guess sliders, instant recall quizzes, and shareable challenges.',
        },
        {
          question: 'Is Scrolly free to use?',
          answer:
            'Yes, Scrolly is completely free with no mandatory sign-up or paywall. You can explore every card, join quizzes, play Scrolla 1v1 duels, create private Friend Leagues, earn live leaderboard XP, and save favorites immediately as a guest, or optionally link an email via one-time OTP to sync across devices.',
        },
        {
          question: 'How are facts verified on Scrolly?',
          answer:
            'Every Scrolly card cites a primary institutional or peer-reviewed source such as NASA, ESA, Nature, Science, PubMed/NIH, Smithsonian, or Britannica. Numeric claims, measurement units, and historical dates are verified against primary literature, and Turkish and English scientific terminology are reviewed independently before publication.',
        },
        {
          question: 'How do Word Lab and Scrolla 1v1 work?',
          answer:
            'Word Lab teaches B1–C2 English vocabulary in the vertical feed with IPA pronunciation, normal and slow audio playback, bilingual context sentences, synonyms, and a +15 XP meaning quiz. Scrolla 1v1 hosts live 6-character duel rooms, while async challenge links let friends beat your exact quiz score anytime.',
        },
        {
          question: 'What topics does Scrolly cover?',
          answer:
            'Scrolly covers eight interactive learning categories: Space, Nature, Human Body, History, Science, Weird Records, Statistics, and Word Lab (B1–C2 English vocabulary). Each category features a dedicated topic archive page, interactive feed filter, primary scientific citations, Quick Guess sliders, Daily Guess challenges, recall quizzes, and live XP leaderboards.',
        },
      ]
    : [
        {
          question: 'Scrolly nedir?',
          answer:
            'Scrolly (https://scrolly.live); doğrulanmış bilimsel kaynaklara dayanan ücretsiz, iki dilli (Türkçe ve İngilizce) reels tarzı bir mikro-öğrenme PWA platformudur. Her dikey bilgi kartı; 40–60 kelimelik net özet, "Neden / Nasıl?" açıklaması, birincil kaynak bağlantısı, etkileşimli Hızlı Tahmin oyunu, anlık pekiştirme testi ve paylaşılabilir meydan okuma modu içerir.',
        },
        {
          question: 'Scrolly ücretsiz mi?',
          answer:
            'Evet, Scrolly tamamen ücretsizdir ve zorunlu üyelik ya da ödeme duvarı gerektirmez. Misafir olarak tüm kartları kaydırabilir, günlük ve haftalık quizleri çözebilir, Scrolla 1v1 düellolarına ve Arkadaş Ligim odalarına katılabilir, canlı liderlik tablosunda XP kazanabilirsiniz; isterseniz e-posta OTP koduyla ilerlemenizi cihazlar arasında güvenle senkronize edebilirsiniz.',
        },
        {
          question: 'Bilgiler nasıl doğrulanıyor?',
          answer:
            'Her Scrolly kartı; NASA, ESA, Nature, Science, PubMed/NIH, Smithsonian veya Britannica gibi birincil kurumsal ve hakemli kaynaklara doğrudan bağlantı verir. Sayısal veriler, ölçüm birimleri ve tarihsel kayıtlar birincil literatürle karşılaştırılır; Türkçe ve İngilizce bilimsel terminoloji yayın öncesinde editöryal doğrulama ekibimizce ayrı ayrı kontrol edilir.',
        },
        {
          question: 'Word Lab ve Scrolla 1v1 nasıl çalışır?',
          answer:
            'Word Lab, B1–C2 seviye İngilizce kelimeleri IPA telaffuz, normal ve yavaş sesli dinleme, iki dilli örnek cümleler, eş anlamlılar ve +15 XP kazandıran anlam testiyle öğretir. Scrolla 1v1 ise 6 haneli oda koduyla iki oyuncuyu canlı yarıştırır; asenkron meydan okuma linkleriyle arkadaşlarınızı aynı sorularda test edebilirsiniz.',
        },
        {
          question: 'Scrolly hangi konuları kapsar?',
          answer:
            'Scrolly sekiz etkileşimli öğrenme alanını kapsar: Uzay, Doğa, İnsan Vücudu, Tarih, Bilim, Garip Rekorlar, İstatistik ve Word Lab (B1–C2 İngilizce kelime öğrenme). Her kategorinin kendine özel kaynaklı arşiv sayfası, doğrulanmış birincil atıfları, Günün Tahmini dahil etkileşimli tahmin kaydırıcıları, pekiştirme quizleri ve canlı XP sıralaması bulunur.',
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
      <p className="text-sm leading-relaxed text-cik-text sm:text-base">
        {isEn
          ? 'Scrolly (https://scrolly.live) is an independent bilingual (Turkish and English) educational knowledge platform designed to turn short daily screen moments into verifiable scientific curiosity. Across seven core disciplines — Space, Nature, Science, History, Human Body, Weird Records, and Statistics — plus B1–C2 Word Lab, every card distills complex research into concise summaries, interactive diagrams, and instant memory checkpoints.'
          : 'Scrolly (https://scrolly.live), günlük kısa dijital anları doğrulanabilir bilimsel meraka dönüştürmek amacıyla geliştirilmiş bağımsız, iki dilli (Türkçe ve İngilizce) bir eğitim ve bilgi platformudur. Uzay, Doğa, Bilim, Tarih, İnsan Vücudu, Garip Rekorlar ve İstatistik alanlarının yanı sıra Word Lab ile her kart; kapsamlı araştırmaları net özetlere, etkileşimli diyagramlara ve anlık hafıza sorularına dönüştürür.'}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-cik-line bg-cik-mint p-4 text-cik-mint-text">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-cik-mint-text">
            <ShieldCheck className="h-4 w-4" />
            <span>{isEn ? 'Primary Source Policy' : 'Birincil Kaynak İlkesi'}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-cik-mint-text">
            {isEn
              ? 'Each card cites institutional archives such as NASA, ESA, Nature, PubMed/NIH, Smithsonian Magazine, and Encyclopaedia Britannica with direct outbound reference links.'
              : 'Her bilgi kartı; NASA, ESA, Nature, PubMed/NIH, Smithsonian Magazine ve Encyclopaedia Britannica gibi kurumsal referanslarla ve doğrudan kaynak bağlantılarıyla yayımlanır.'}
          </p>
        </div>

        <div className="rounded-2xl border border-cik-line bg-cik-pink p-4 text-cik-text">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-cik-cta">
            <Cpu className="h-4 w-4" />
            <span>{isEn ? 'Interactive Visual Learning' : 'Etkileşimli Görsel Anlatım'}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-cik-text-2">
            {isEn
              ? 'Hands-on Quick Guess challenges, interactive SVG sketch simulations, and 5-card Memory Sprints reinforce retention rather than passive scrolling. Card media comes from the provider actually used on that card: Pexels, Pixabay, Giphy, Wikimedia Commons, Unsplash, or NASA.'
              : 'Pasif tüketim yerine Hızlı Tahmin meydan okumaları, etkileşimli SVG bilimsel eskizler ve 5 kartlık Hafıza Quizleri ile kalıcı öğrenme sağlanır. Kart görseli, o kartta gerçekten kullanılan sağlayıcıdan gelir: Pexels, Pixabay, Giphy, Wikimedia Commons, Unsplash veya NASA.'}
          </p>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-cik-text">
          <BookOpen className="h-5 w-5 text-cik-cta" />
          <span>
            {isEn ? '1. Fact Curation & Editorial Review Process' : '1. İçerik Üretimi ve Doğrulama Süreci'}
          </span>
        </h2>
        <p className="text-sm leading-relaxed text-cik-text-2">
          {isEn
            ? 'Every discovery card goes through structured editorial verification before publication: (a) cross-checking numeric claims, units, and measurements against primary scientific literature; (b) drafting a 40–60 word direct summary anchor paired with a deeper "Why / How?" mechanism breakdown; and (c) validating Turkish and English terminology separately rather than relying on blind literal translation.'
            : 'Yayımlanan her bilgi kartı üç aşamalı bir doğrulama sürecinden geçer: (a) sayısal veriler, ölçüm birimleri ve tarihsel kayıtların birincil akademik veya kurumsal kaynaklarla karşılaştırılması; (b) konunun özünü veren 40–60 kelimelik net özet ile derinlemesine "Neden / Nasıl?" bilimsel açıklamasının ayrılması; (c) Türkçe ve İngilizce bilimsel terminolojinin birbirinden bağımsız biçimde kontrol edilmesi.'}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-cik-text">
          <Compass className="h-5 w-5 text-cik-butter-text" />
          <span>
            {isEn ? '2. How to Explore Scrolly' : '2. Scrolly Nasıl Kullanılır?'}
          </span>
        </h2>
        <p className="text-sm leading-relaxed text-cik-text-2">
          {isEn
            ? 'You can browse our full vertical discovery stream on the home page, jump directly into topic hubs such as Space or Human Body, open standalone detail pages (/fact/[slug]) with verified references, or install Scrolly as an offline-ready Progressive Web App.'
            : 'Ana sayfada dikey kaydırma akışıyla yeni kartlar keşfedebilir, Uzay veya İnsan Vücudu gibi konu merkezlerinden arşivlere erişebilir, her kartın kaynaklı detay sayfasını (/fact/[slug]) inceleyebilir ya da Scrolly’yi çevrimdışı PWA uygulaması olarak kullanabilirsiniz.'}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-cik-text">
          <Sparkles className="h-5 w-5 text-cik-cta" />
          <span>
            {isEn ? '3. Transparency, Corrections & Feedback' : '3. Şeffaflık ve Kaynak Düzeltme Politikası'}
          </span>
        </h2>
        <p className="text-sm leading-relaxed text-cik-text-2">
          {isEn
            ? 'Scientific consensus evolves as new measurements arrive. If you spot an outdated statistic, broken source URL, or translation nuance on any Scrolly card, please contact our editorial verification team exclusively at contact@scrolly.live or via our Contact page so our editorial pipeline can review and update the record.'
            : 'Bilimsel veriler yeni ölçümlerle güncellenebilir. Herhangi bir bilgi kartında güncel olmayan bir istatistik, çalışmayan kaynak bağlantısı veya çeviri hatası fark ederseniz editöryal ekibimiz ve kaynak doğrulama masamız için tek resmi iletişim adresimiz olan contact@scrolly.live üzerinden ya da İletişim sayfamızdan bize ulaşabilirsiniz.'}
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href={buildContactHref(lang, returnToProfile)}
            className="inline-flex items-center gap-1.5 rounded-full bg-cik-cta px-4 py-2 text-xs font-extrabold text-cik-on-cta shadow-sticker transition hover:brightness-105"
          >
            <span>{isEn ? 'Report a Source Correction →' : 'Kaynak Düzeltmesi Bildir →'}</span>
          </Link>
          <a
            href="mailto:contact@scrolly.live"
            className="inline-flex items-center gap-1.5 rounded-full border border-cik-line bg-cik-pink px-4 py-2 text-xs font-extrabold text-cik-cta transition hover:brightness-95"
          >
            contact@scrolly.live
          </a>
        </div>
      </section>
      <section className="space-y-3 border-t border-cik-line pt-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-cik-text">
          <HelpCircle className="h-5 w-5 text-cik-cta" />
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
              <h3 className="font-display text-sm font-extrabold text-cik-text sm:text-base">
                {item.question}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-cik-text-2">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </section>
    </TrustPageShell>
  );
}
