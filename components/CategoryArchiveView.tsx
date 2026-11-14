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
import HtmlLangSync from '@/components/HtmlLangSync';
import SiteTrustFooter from '@/components/SiteTrustFooter';
import { type CategoryId, getCategoryMeta, type Language } from '@/i18n/translations';
import { getAllFactsServer } from '@/lib/db';
import {
  buildCategoryHref,
  buildFactHref,
  CATEGORY_ROUTE_SLUGS,
  categoryIdToRouteSlug,
  categoryRouteSlugToId,
  getFactPrimarySlug,
} from '@/utils/factsData';

const CATEGORY_DESCRIPTIONS: Record<CategoryId, { tr: string; en: string }> = {
  space: {
    tr: 'Kara deliklerden ötegezegenlere, kozmik toz bulutlarından zaman genişlemesine kadar doğrulanmış uzay keşifleri.',
    en: 'Verified astronomical discoveries from black holes and exoplanets to cosmic dust and time dilation.',
  },
  nature: {
    tr: 'Biyolüminesans canlılardan kadim orman ekosistemlerine kadar doğanın şaşırtıcı hayatta kalma stratejileri.',
    en: 'Remarkable survival strategies of the natural world, from bioluminescent ocean life to ancient forest networks.',
  },
  human_body: {
    tr: 'Nörobilimden kalp fizyolojisine, duyusal algıdan uyku mekanizmalarına kadar insan vücudunun gizli sırları.',
    en: 'The hidden architecture of the human body across neuroscience, cardiology, sensory perception, and sleep biology.',
  },
  history: {
    tr: 'Unutulmuş uygarlıklardan beklenmedik icatlara ve antik mühendislik harikalarına uzanan tarihsel gerçekler.',
    en: 'Verified historical milestones spanning forgotten civilizations, surprising inventions, and ancient engineering.',
  },
  science: {
    tr: 'Kuantum tünellemeden termodinamiğe, kimyasal reaksiyonlardan fizik kanunlarına kadar bilimsel bilgi kartları.',
    en: 'Peer-reviewed micro-lessons across quantum tunneling, thermodynamics, materials science, and fundamental physics.',
  },
  records: {
    tr: 'Doğanın ve bilimin sınırlarını zorlayan, Guinness ve akademik kayıtlarla belgelenmiş en sıra dışı rekorlar.',
    en: 'Verified Guinness and scientific extremes that push the boundaries of physics, biology, and human ingenuity.',
  },
};

export async function buildCategoryMetadata(
  categorySlug: string,
  lang: Language
): Promise<Metadata> {
  const categoryId = categoryRouteSlugToId(categorySlug);
  if (!categoryId) {
    return {
      title: lang === 'tr' ? 'Kategori Bulunamadı — Scrolly' : 'Category Not Found — Scrolly',
    };
  }

  const catMeta = getCategoryMeta(categoryId);
  const canonicalSlug = categoryIdToRouteSlug(categoryId);
  const trUrl = `https://scrolly.live/category/${canonicalSlug}`;
  const enUrl = `https://scrolly.live/en/category/${canonicalSlug}`;
  const canonicalUrl = lang === 'en' ? enUrl : trUrl;
  const description = CATEGORY_DESCRIPTIONS[categoryId][lang];

  return {
    title:
      lang === 'tr'
        ? `${catMeta.label.tr} Bilgi Kartları & Quiz — Scrolly`
        : `${catMeta.label.en} Fact Cards & Micro-Learning — Scrolly`,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        tr: trUrl,
        en: enUrl,
        'x-default': trUrl,
      },
    },
    openGraph: {
      title: `${catMeta.emoji} ${catMeta.label[lang]} — Scrolly`,
      description,
      url: canonicalUrl,
      siteName: 'Scrolly',
      type: 'website',
      locale: lang === 'en' ? 'en_US' : 'tr_TR',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${catMeta.emoji} ${catMeta.label[lang]} — Scrolly`,
      description,
    },
  };
}

interface CategoryArchiveViewProps {
  categorySlug: string;
  lang: Language;
}

export default async function CategoryArchiveView({
  categorySlug,
  lang,
}: CategoryArchiveViewProps) {
  const categoryId = categoryRouteSlugToId(categorySlug);
  if (!categoryId) {
    notFound();
  }

  const allFacts = await getAllFactsServer();
  const categoryFacts = allFacts.filter((f) => f.category === categoryId);

  if (categoryFacts.length === 0) {
    notFound();
  }

  const catMeta = getCategoryMeta(categoryId);
  const canonicalSlug = categoryIdToRouteSlug(categoryId);
  const canonicalUrl = `https://scrolly.live${buildCategoryHref(canonicalSlug, lang)}`;
  const description = CATEGORY_DESCRIPTIONS[categoryId][lang];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#collection`,
        name: `${catMeta.label[lang]} — Scrolly`,
        description,
        url: canonicalUrl,
        inLanguage: lang,
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
          url: `https://scrolly.live${buildFactHref(getFactPrimarySlug(fact), lang)}`,
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
      <HtmlLangSync lang={lang} />
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
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-amber-200 bg-white px-3.5 py-1.5 text-xs font-bold text-ink shadow-pill hover:bg-amber-50 sm:text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{lang === 'tr' ? 'İnteraktif Akışa Dön' : 'Interactive Feed'}</span>
            </Link>

            <div className="inline-flex items-center rounded-full border border-amber-200 bg-white p-0.5 shadow-pill">
              <Link
                href={buildCategoryHref(canonicalSlug, 'tr')}
                className={`inline-flex min-h-[40px] min-w-[44px] items-center justify-center rounded-full px-3 py-1 text-xs font-extrabold uppercase ${
                  lang === 'tr' ? 'bg-ink text-white' : 'text-ink/80 hover:text-ink'
                }`}
              >
                TR
              </Link>
              <Link
                href={buildCategoryHref(canonicalSlug, 'en')}
                className={`inline-flex min-h-[40px] min-w-[44px] items-center justify-center rounded-full px-3 py-1 text-xs font-extrabold uppercase ${
                  lang === 'en' ? 'bg-ink text-white' : 'text-ink/80 hover:text-ink'
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
              const href = buildCategoryHref(slugItem, lang);
              return (
                <Link
                  key={slugItem}
                  href={href}
                  className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-extrabold transition-colors ${
                    isActive
                      ? `${metaItem.borderClass} ${metaItem.pillBg} ${metaItem.accentText}`
                      : 'border-slate-200 bg-white text-ink/80 hover:bg-slate-50'
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
            className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-ink/75"
          >
            <Link href="/" className="inline-flex items-center gap-1 hover:text-violet-700 hover:underline">
              <Home className="h-3.5 w-3.5" />
              <span>{lang === 'tr' ? 'Ana Sayfa' : 'Home'}</span>
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-ink/50" />
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
                <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-ink/80 shadow-sm">
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
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-ink px-5 py-3 font-display text-sm font-bold text-white shadow-md hover:opacity-90"
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
                const factHref = buildFactHref(primarySlug, lang);
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
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800">
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
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink/75">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>
                          {lang === 'tr' ? 'Soru & Bilimsel Açıklama' : 'Q&A & Science'}
                        </span>
                      </span>

                      <Link
                        href={factHref}
                        className="inline-flex min-h-[44px] items-center gap-1 px-2 text-xs font-extrabold text-violet-700 hover:underline"
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

        <SiteTrustFooter lang={lang} />
      </div>
    </>
  );
}
