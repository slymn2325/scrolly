import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Clock,
  Compass,
  Film,
  Home,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import HtmlLangSync from '@/components/HtmlLangSync';
import SiteTrustFooter from '@/components/SiteTrustFooter';
import { type CategoryId, getCategoryMeta, type Language } from '@/i18n/translations';
import { CATEGORY_PAGE_SIZE, categoryPagePath, categoryPageUrl } from '@/lib/categoryPages';
import { getAllFactsServer } from '@/lib/db';
import {
  buildCategoryHref,
  buildFactHref,
  CATEGORY_ROUTE_SLUGS,
  categoryIdToRouteSlug,
  categoryRouteSlugToId,
  getFactPrimarySlug,
  isRetiredDuplicateFact,
} from '@/utils/factsData';
import { CATEGORY_ILLUSTRATION_MAP, CATEGORY_SUB_ICON_MAP } from '@/utils/fluentAssets';

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
  statistics: {
    tr: 'Olasılık paradokslarından veri yanılsamalarına, Bayes teoreminden hayatta kalma önyargısına kadar zihin açan istatistik gerçekleri.',
    en: 'Mind-bending probability paradoxes, survivorship bias, Bayes theorem, and surprising statistical truths backed by data.',
  },
};

export async function buildCategoryMetadata(
  categorySlug: string,
  lang: Language,
  page = 1
): Promise<Metadata> {
  const categoryId = categoryRouteSlugToId(categorySlug);
  if (!categoryId) {
    return {
      title: lang === 'tr' ? 'Kategori Bulunamadı | Scrolly' : 'Category Not Found | Scrolly',
    };
  }

  const catMeta = getCategoryMeta(categoryId);
  const canonicalSlug = categoryIdToRouteSlug(categoryId);
  const trUrl = categoryPageUrl(canonicalSlug, 'tr', page);
  const enUrl = categoryPageUrl(canonicalSlug, 'en', page);
  const canonicalUrl = lang === 'en' ? enUrl : trUrl;
  const description = CATEGORY_DESCRIPTIONS[categoryId][lang];
  const pageLabel = page > 1 ? ` (${page})` : '';

  return {
    title:
      lang === 'tr'
        ? `${catMeta.label.tr} Bilgi Kartları & Quiz${pageLabel} | Scrolly`
        : `${catMeta.label.en} Fact Cards & Micro-Learning${pageLabel} | Scrolly`,
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
      title: `${catMeta.emoji} ${catMeta.label[lang]} | Scrolly`,
      description,
      url: canonicalUrl,
      siteName: 'Scrolly',
      type: 'website',
      locale: lang === 'en' ? 'en_US' : 'tr_TR',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${catMeta.emoji} ${catMeta.label[lang]} | Scrolly`,
      description,
    },
  };
}

interface CategoryArchiveViewProps {
  categorySlug: string;
  lang: Language;
  page?: number;
}

export default async function CategoryArchiveView({
  categorySlug,
  lang,
  page = 1,
}: CategoryArchiveViewProps) {
  const categoryId = categoryRouteSlugToId(categorySlug);
  if (!categoryId) {
    notFound();
  }

  const allFacts = await getAllFactsServer();
  const categoryFacts = allFacts.filter(
    (fact) => fact.category === categoryId && !isRetiredDuplicateFact(fact)
  );

  if (categoryFacts.length === 0) {
    notFound();
  }

  const pageCount = Math.max(1, Math.ceil(categoryFacts.length / CATEGORY_PAGE_SIZE));
  if (page > pageCount) {
    notFound();
  }
  const pageFacts = categoryFacts.slice((page - 1) * CATEGORY_PAGE_SIZE, page * CATEGORY_PAGE_SIZE);

  const catMeta = getCategoryMeta(categoryId);
  const canonicalSlug = categoryIdToRouteSlug(categoryId);
  const canonicalUrl = categoryPageUrl(canonicalSlug, lang, page);
  const prevUrl = page > 1 ? categoryPagePath(canonicalSlug, lang, page - 1) : null;
  const nextUrl = page < pageCount ? categoryPagePath(canonicalSlug, lang, page + 1) : null;
  const description = CATEGORY_DESCRIPTIONS[categoryId][lang];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#collection`,
        name: `${catMeta.label[lang]} | Scrolly`,
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
        numberOfItems: pageFacts.length,
        itemListElement: pageFacts.map((fact, idx) => ({
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
      {prevUrl && <link rel="prev" href={prevUrl} />}
      {nextUrl && <link rel="next" href={nextUrl} />}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <div className="min-h-screen bg-cik-bg pb-16 text-cik-text">
        {/* Sticky Top Bar */}
        <header className="material-thin sticky top-0 z-hud border-b border-cik-line">
          <div className="mx-auto flex max-w-[42.5rem] items-center justify-between gap-3 px-4 py-3">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-pill border border-cik-line bg-cik-surface px-3.5 py-1.5 text-xs font-bold text-cik-text shadow-e1 hover:bg-cik-butter sm:text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{lang === 'tr' ? 'İnteraktif Akışa Dön' : 'Interactive Feed'}</span>
            </Link>

            <div className="inline-flex items-center rounded-pill border border-cik-line bg-cik-surface p-0.5 shadow-e1">
              <Link
                href={buildCategoryHref(canonicalSlug, 'tr')}
                className={`inline-flex min-h-11 min-w-[44px] items-center justify-center rounded-pill px-3 py-1 text-xs font-extrabold uppercase ${
                  lang === 'tr'
                    ? 'bg-cik-cta text-cik-on-cta'
                    : 'text-cik-text hover:text-cik-text'
                }`}
              >
                TR
              </Link>
              <Link
                href={buildCategoryHref(canonicalSlug, 'en')}
                className={`inline-flex min-h-11 min-w-[44px] items-center justify-center rounded-pill px-3 py-1 text-xs font-extrabold uppercase ${
                  lang === 'en'
                    ? 'bg-cik-cta text-cik-on-cta'
                    : 'text-cik-text hover:text-cik-text'
                }`}
              >
                EN
              </Link>
            </div>
          </div>

          {/* 7-Category Navigation Strip */}
          <nav
            aria-label={lang === 'tr' ? 'Kategoriler' : 'Categories'}
            className="mx-auto flex max-w-[42.5rem] items-center gap-2 overflow-x-auto px-4 pb-3 no-scrollbar"
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
                  className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-pill border px-3.5 py-1.5 text-xs font-extrabold transition-colors ${
                    isActive
                      ? `${metaItem.borderClass} ${metaItem.pillBg} ${metaItem.accentText}`
                      : 'border-cik-line bg-cik-surface text-cik-text hover:bg-cik-surface-2'
                  }`}
                >
                  <img
                    src={CATEGORY_SUB_ICON_MAP[idItem]}
                    alt=""
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 object-contain"
                  />
                  <span>{metaItem.label[lang]}</span>
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto max-w-[42.5rem] px-4 pt-6">
          {/* Semantic Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-cik-text"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-1 hover:text-cik-cta hover:underline"
            >
              <Home className="h-3.5 w-3.5" />
              <span>{lang === 'tr' ? 'Ana Sayfa' : 'Home'}</span>
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-cik-text" />
            <span className="font-bold text-cik-text">{catMeta.label[lang]}</span>
          </nav>

          {/* Category Hero */}
          <section className="rounded-sticker border border-cik-line bg-cik-pink p-5 text-cik-text shadow-sticker">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex flex-wrap items-center gap-2 rounded-pill bg-cik-surface px-3 py-1 text-xs font-extrabold text-cik-text shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-cik-cta" />
                  <span>
                    {categoryFacts.length}{' '}
                    {lang === 'tr' ? 'Doğrulanmış Bilgi Kartı' : 'Verified Fact Cards'}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={CATEGORY_SUB_ICON_MAP[categoryId]}
                    alt=""
                    aria-hidden="true"
                    className="h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9"
                  />
                  <h1 className="cik-title-1 text-cik-text">{catMeta.label[lang]}</h1>
                </div>

                <p className="cik-body mt-3 text-cik-text">
                  {description}
                </p>

                <div className="mt-4">
                  <Link
                    href="/"
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-pill bg-cik-bg px-5 py-3 font-display text-sm font-bold text-cik-text shadow-md hover:opacity-90"
                  >
                    <Compass className="h-4 w-4" />
                    <span>{lang === 'tr' ? 'Akışta Keşfet' : 'Explore in Feed'}</span>
                  </Link>
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-center self-start rounded-2xl border border-cik-line bg-cik-surface p-4 shadow-sm sm:self-center">
                <img
                  src={CATEGORY_ILLUSTRATION_MAP[categoryId]}
                  alt={catMeta.label[lang]}
                  className="h-24 w-24 object-contain sm:h-28 sm:w-28"
                />
              </div>
            </div>
          </section>

          {/* Fact Articles Index Grid */}
          <section
            aria-labelledby="category-facts-list-heading"
            className="mt-8"
          >
            <h2
              id="category-facts-list-heading"
              className="mb-4 font-display text-lg font-bold text-cik-text sm:text-xl"
            >
              {lang === 'tr'
                ? `${catMeta.label.tr} Alanındaki Tüm Keşifler`
                : `All Verified Discoveries in ${catMeta.label.en}`}
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {pageFacts.map((fact) => {
                const factContent = fact[lang];
                const primarySlug = getFactPrimarySlug(fact);
                const factHref = buildFactHref(primarySlug, lang);
                const sourceName =
                  factContent.sourceName ||
                  fact.sourceName ||
                  factContent.sourceHint ||
                  'Scrolly Archive';
                const hasGifPreview = Boolean(fact.gifUrl);
                const hasInteractiveGuess = Boolean(factContent.guessChallenge);
                const readSec = Math.max(15, fact.readingTimeSec ?? 25);

                return (
                  <article
                    key={fact.id}
                    className={`flex flex-col justify-between rounded-2xl border border-cik-line bg-cik-surface p-5 shadow-sm transition-transform hover:-translate-y-0.5`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-pill bg-cik-pink px-2.5 py-0.5 text-cik-cta`}
                        >
                          <img
                            src={CATEGORY_SUB_ICON_MAP[categoryId]}
                            alt=""
                            aria-hidden="true"
                            className="h-3.5 w-3.5 object-contain"
                          />
                          <span>{factContent.tag || catMeta.label[lang]}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 cik-caption-2 text-cik-mint-text">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span className="max-w-[160px] truncate">{sourceName}</span>
                        </span>
                      </div>

                      <h3 className="mt-3 font-display text-lg font-bold leading-snug text-cik-text">
                        <Link
                          href={factHref}
                          className="hover:text-cik-cta hover:underline"
                        >
                          {factContent.title}
                        </Link>
                      </h3>

                      <p className="mt-2 text-sm leading-relaxed text-cik-text">
                        {factContent.factText}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-1.5 cik-caption-2 font-bold">
                        <span className="inline-flex items-center gap-1 rounded-pill bg-cik-surface-2 px-2 py-0.5 text-cik-text">
                          <Clock className="h-3 w-3" />
                          <span>{readSec}s</span>
                        </span>
                        {hasGifPreview && (
                          <span className="inline-flex items-center gap-1 rounded-pill bg-cik-pink px-2 py-0.5 text-cik-cta">
                            <Film className="h-3 w-3" />
                            <span>{lang === 'tr' ? 'GIF Sahne' : 'GIF Scene'}</span>
                          </span>
                        )}
                        {hasInteractiveGuess && (
                          <span className="inline-flex items-center gap-1 rounded-pill bg-cik-butter px-2 py-0.5 text-cik-butter-text">
                            <Target className="h-3 w-3" />
                            <span>{lang === 'tr' ? 'Tahmin Et' : 'Guess'}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-cik-line pt-3">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-cik-text">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>
                          {lang === 'tr' ? 'Soru & Bilimsel Açıklama' : 'Q&A & Science'}
                        </span>
                      </span>

                      <Link
                        href={factHref}
                        className="inline-flex min-h-[44px] items-center gap-1 px-2 text-xs font-extrabold text-cik-cta hover:underline"
                      >
                        <span>{lang === 'tr' ? 'Kartı İncele' : 'Read Fact'}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>

            {pageCount > 1 && (
              <nav
                aria-label={lang === 'tr' ? 'Sayfalar' : 'Pages'}
                className="mt-8 flex flex-wrap items-center justify-center gap-2"
              >
                {prevUrl && (
                  <Link
                    href={prevUrl}
                    rel="prev"
                    className="inline-flex min-h-[44px] items-center rounded-pill border border-cik-line bg-cik-surface px-4 text-sm font-bold text-cik-text"
                  >
                    {lang === 'tr' ? 'Önceki' : 'Previous'}
                  </Link>
                )}
                {Array.from({ length: pageCount }, (_, index) => {
                  const pageNumber = index + 1;
                  const href = categoryPagePath(canonicalSlug, lang, pageNumber);
                  const current = pageNumber === page;
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={current ? 'page' : undefined}
                      className={`inline-flex h-11 min-w-11 items-center justify-center rounded-pill px-3 text-sm font-extrabold ${
                        current
                          ? 'bg-cik-cta text-cik-on-cta'
                          : 'border border-cik-line bg-cik-surface text-cik-text'
                      }`}
                    >
                      {pageNumber}
                    </Link>
                  );
                })}
                {nextUrl && (
                  <Link
                    href={nextUrl}
                    rel="next"
                    className="inline-flex min-h-[44px] items-center rounded-pill border border-cik-line bg-cik-surface px-4 text-sm font-bold text-cik-text"
                  >
                    {lang === 'tr' ? 'Sonraki' : 'Next'}
                  </Link>
                )}
              </nav>
            )}
          </section>
        </main>

        <SiteTrustFooter lang={lang} />
      </div>
    </>
  );
}
