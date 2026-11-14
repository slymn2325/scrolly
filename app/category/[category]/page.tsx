import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Compass,
  Home,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { getCategoryMeta, type Language } from '@/i18n/translations';
import { getAllFactsServer } from '@/lib/db';
import type { CategoryId } from '@/types/fact';
import {
  CATEGORY_ROUTE_SLUGS,
  categoryIdToRouteSlug,
  categoryRouteSlugToId,
  getFactPrimarySlug,
} from '@/utils/factsData';

export const dynamic = 'force-dynamic';

interface CategoryPageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ lang?: string }>;
}

const CATEGORY_DESCRIPTIONS: Record<CategoryId, Record<Language, string>> = {
  space: {
    tr: 'Evren, gezegenler, kara delikler, yıldızlar ve uzay keşifleri hakkında doğrulanmış astronomik kaynaklara dayalı iki dilli mikro bilgi kartları.',
    en: 'Verified bilingual micro-learning cards covering the cosmos, planets, black holes, stars, and astrophysics.',
  },
  nature: {
    tr: 'Hayvanlar alemi, ekosistemler, derin okyanuslar ve Dünya bilimi üzerine şaşırtıcı ve bilimsel olarak doğrulanmış keşif kartları.',
    en: 'Scientifically verified discovery cards exploring wildlife, ecosystems, deep oceans, and Earth science.',
  },
  science: {
    tr: 'Fizik, kimya, matematik ve modern bilim tarihindeki çığır açıcı bulguları özetleyen kaynaklı mikro öğrenme arşivi.',
    en: 'Source-backed micro-learning archive explaining breakthroughs in physics, chemistry, mathematics, and research.',
  },
  history: {
    tr: 'Antik uygarlıklar, unutulmuş icatlar ve insanlık tarihinin dönüm noktalarını bilimsel belgelerle anlatan bilgi kartları.',
    en: 'Verified history cards examining ancient civilizations, forgotten inventions, and historical turning points.',
  },
  human_body: {
    tr: 'İnsan anatomisi, beyin bilimi, genetik ve biyolojik sistemler hakkında hayranlık uyandıran doğrulanmış tıp ve biyoloji kartları.',
    en: 'Verified human biology, anatomy, neuroscience, and genetics discovery cards backed by medical research.',
  },
  records: {
    tr: 'Doğada ve insanlık tarihinde kayda geçmiş en sıra dışı dünya rekorları ve doğrulanmış istatistiksel ilginçlikler.',
    en: 'Verified extraordinary world records, extreme natural phenomena, and documented statistical oddities.',
  },
};

function resolveLangParam(langParam?: string): { lang: Language; hasExplicitLang: boolean } {
  if (langParam === 'en') return { lang: 'en', hasExplicitLang: true };
  if (langParam === 'tr') return { lang: 'tr', hasExplicitLang: true };
  return { lang: 'tr', hasExplicitLang: false };
}

export async function generateMetadata({
  params,
  searchParams,
}: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const query = await searchParams;
  const categoryId = categoryRouteSlugToId(category);

  if (!categoryId) {
    return {
      title: 'Kategori Bulunamadı | Scrolly',
    };
  }

  const { lang } = resolveLangParam(query?.lang);
  const catMeta = getCategoryMeta(categoryId);
  const canonicalSlug = categoryIdToRouteSlug(categoryId);
  const canonicalUrl = `https://scrolly.live/category/${canonicalSlug}`;
  const description = CATEGORY_DESCRIPTIONS[categoryId][lang];

  return {
    title: `${catMeta.label[lang]} — ${lang === 'tr' ? 'Bilimsel Bilgi Kartları' : 'Verified Fact Cards'} | Scrolly`,
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
      title: `${catMeta.emoji} ${catMeta.label[lang]} | Scrolly`,
      description,
      url: canonicalUrl,
      siteName: 'Scrolly',
      type: 'website',
      locale: lang === 'en' ? 'en_US' : 'tr_TR',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${catMeta.label[lang]} | Scrolly`,
      description,
    },
  };
}

export default async function CategoryHubPage({ params, searchParams }: CategoryPageProps) {
  const { category } = await params;
  const query = await searchParams;
  const categoryId = categoryRouteSlugToId(category);

  if (!categoryId) {
    notFound();
  }

  const { lang, hasExplicitLang } = resolveLangParam(query?.lang);
  const catMeta = getCategoryMeta(categoryId);
  const canonicalSlug = categoryIdToRouteSlug(categoryId);
  const canonicalUrl = `https://scrolly.live/category/${canonicalSlug}`;
  const description = CATEGORY_DESCRIPTIONS[categoryId][lang];

  const allFacts = await getAllFactsServer();
  const categoryFacts = allFacts.filter((fact) => fact.category === categoryId);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#collection`,
        name: `${catMeta.label[lang]} — Scrolly`,
        description,
        url: canonicalUrl,
        inLanguage: ['tr', 'en'],
        isPartOf: {
          '@type': 'WebSite',
          name: 'Scrolly',
          url: 'https://scrolly.live',
        },
        mainEntity: {
          '@id': `${canonicalUrl}#itemlist`,
        },
      },
      {
        '@type': 'ItemList',
        '@id': `${canonicalUrl}#itemlist`,
        name: `${catMeta.label[lang]} (${categoryFacts.length})`,
        numberOfItems: categoryFacts.length,
        itemListElement: categoryFacts.map((fact, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          url: `https://scrolly.live/fact/${getFactPrimarySlug(fact)}`,
          name: fact[lang].title,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: lang === 'tr' ? 'Ana Sayfa' : 'Home',
            item: 'https://scrolly.live',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: catMeta.label[lang],
            item: canonicalUrl,
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
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <div className="min-h-screen bg-[#FFFDF9] pb-16 text-ink">
        {/* Sticky Top Bar */}
        <header className="sticky top-0 z-30 border-b border-amber-100/80 bg-[#FFFDF9]/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3.5 py-1.5 text-xs font-bold text-ink shadow-pill hover:bg-amber-50 sm:text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{lang === 'tr' ? 'İnteraktif Akışa Dön' : 'Interactive Feed'}</span>
            </Link>

            <div className="inline-flex items-center rounded-full border border-amber-200 bg-white p-0.5 shadow-pill">
              <Link
                href={`/category/${canonicalSlug}?lang=tr`}
                className={`rounded-full px-2.5 py-1 text-xs font-extrabold uppercase ${
                  lang === 'tr' ? 'bg-ink text-white' : 'text-ink/60 hover:text-ink'
                }`}
              >
                TR
              </Link>
              <Link
                href={`/category/${canonicalSlug}?lang=en`}
                className={`rounded-full px-2.5 py-1 text-xs font-extrabold uppercase ${
                  lang === 'en' ? 'bg-ink text-white' : 'text-ink/60 hover:text-ink'
                }`}
              >
                EN
              </Link>
            </div>
          </div>

          {/* 6-Category Navigation Strip */}
          <nav
            aria-label={lang === 'tr' ? 'Kategoriler' : 'Categories'}
            className="mx-auto flex max-w-5xl items-center gap-2 overflow-x-auto px-4 pb-3 no-scrollbar"
          >
            {CATEGORY_ROUTE_SLUGS.map((slugItem) => {
              const idItem = categoryRouteSlugToId(slugItem)!;
              const metaItem = getCategoryMeta(idItem);
              const isActive = idItem === categoryId;
              const href = hasExplicitLang
                ? `/category/${slugItem}?lang=${lang}`
                : `/category/${slugItem}`;
              return (
                <Link
                  key={slugItem}
                  href={href}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-extrabold transition-colors ${
                    isActive
                      ? `${metaItem.borderClass} ${metaItem.pillBg} ${metaItem.accentText}`
                      : 'border-slate-200 bg-white text-ink/70 hover:bg-slate-50'
                  }`}
                >
                  <span>{metaItem.emoji}</span>
                  <span>{metaItem.label[lang]}</span>
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto max-w-5xl px-4 pt-6 sm:pt-8">
          {/* Semantic Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-ink/65"
          >
            <Link href="/" className="inline-flex items-center gap-1 hover:text-violet-700 hover:underline">
              <Home className="h-3.5 w-3.5" />
              <span>{lang === 'tr' ? 'Ana Sayfa' : 'Home'}</span>
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-ink/40" />
            <span className="font-bold text-ink">
              {catMeta.emoji} {catMeta.label[lang]}
            </span>
          </nav>

          {/* Category Hero */}
          <section
            style={{ backgroundColor: catMeta.cardBg }}
            className={`rounded-3xl border-2 ${catMeta.borderClass} p-6 shadow-cozy sm:p-8`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-ink/75 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                  <span>
                    {categoryFacts.length}{' '}
                    {lang === 'tr' ? 'Doğrulanmış Bilgi Kartı' : 'Verified Fact Cards'}
                  </span>
                </div>

                <h1 className="mt-3 font-display text-2xl font-bold text-ink sm:text-4xl">
                  {catMeta.emoji} {catMeta.label[lang]}
                </h1>

                <p className="mt-2.5 text-sm leading-relaxed text-ink/85 sm:text-base">
                  {description}
                </p>
              </div>

              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 font-display text-sm font-bold text-white shadow-md hover:opacity-90"
              >
                <Compass className="h-4 w-4" />
                <span>{lang === 'tr' ? 'Akışta Keşfet' : 'Explore in Feed'}</span>
              </Link>
            </div>
          </section>

          {/* Fact Articles Index Grid */}
          <section
            aria-labelledby="category-facts-list-heading"
            className="mt-8"
          >
            <h2
              id="category-facts-list-heading"
              className="mb-4 font-display text-lg font-bold text-ink sm:text-xl"
            >
              {lang === 'tr'
                ? `${catMeta.label.tr} Alanındaki Tüm Keşifler`
                : `All Verified Discoveries in ${catMeta.label.en}`}
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {categoryFacts.map((fact) => {
                const factContent = fact[lang];
                const primarySlug = getFactPrimarySlug(fact);
                const factHref = hasExplicitLang
                  ? `/fact/${primarySlug}?lang=${lang}`
                  : `/fact/${primarySlug}`;
                const sourceName =
                  factContent.sourceName ||
                  fact.sourceName ||
                  factContent.sourceHint ||
                  'Scrolly Archive';

                return (
                  <article
                    key={fact.id}
                    className={`flex flex-col justify-between rounded-2xl border ${catMeta.borderClass} bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs font-bold">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full ${catMeta.pillBg} px-2.5 py-0.5 ${catMeta.accentText}`}
                        >
                          <span>{fact.emoji ?? catMeta.emoji}</span>
                          <span>{factContent.tag || catMeta.label[lang]}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span className="max-w-[160px] truncate">{sourceName}</span>
                        </span>
                      </div>

                      <h3 className="mt-3 font-display text-lg font-bold leading-snug text-ink">
                        <Link href={factHref} className="hover:text-violet-700 hover:underline">
                          {factContent.title}
                        </Link>
                      </h3>

                      <p className="mt-2 text-sm leading-relaxed text-ink/80">
                        {factContent.factText}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink/55">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>
                          {lang === 'tr' ? 'Soru & Bilimsel Açıklama' : 'Q&A & Science'}
                        </span>
                      </span>

                      <Link
                        href={factHref}
                        className="inline-flex items-center gap-1 text-xs font-extrabold text-violet-700 hover:underline"
                      >
                        <span>{lang === 'tr' ? 'Kartı İncele' : 'Read Fact'}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
