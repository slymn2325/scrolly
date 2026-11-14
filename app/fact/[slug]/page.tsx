import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SingleFactView from '@/components/SingleFactView';
import { getCategoryMeta, type Language } from '@/i18n/translations';
import { getAllFactsServer, getFactBySlugServer } from '@/lib/db';
import {
  categoryIdToRouteSlug,
  getFactPrimarySlug,
  getRelatedFactsFromPool,
} from '@/utils/factsData';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}

function resolveLangParam(langParam?: string): { lang: Language; hasExplicitLang: boolean } {
  if (langParam === 'en') {
    return { lang: 'en', hasExplicitLang: true };
  }
  if (langParam === 'tr') {
    return { lang: 'tr', hasExplicitLang: true };
  }
  return { lang: 'tr', hasExplicitLang: false };
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const query = await searchParams;
  const { lang } = resolveLangParam(query?.lang);

  const fact = await getFactBySlugServer(slug);
  if (!fact) {
    return {
      title: lang === 'en' ? 'Fact Not Found | Scrolly' : 'Bilgi Bulunamadı | Scrolly',
    };
  }

  const primarySlug = getFactPrimarySlug(fact);
  const content = fact[lang];
  const catMeta = getCategoryMeta(fact.category);
  const combinedDesc = `${content.factText} ${content.deepDiveDetail}`.replace(/\s+/g, ' ').trim();
  const description =
    combinedDesc.length > 160 ? `${combinedDesc.slice(0, 157).trimEnd()}...` : combinedDesc;
  const canonicalUrl = `https://scrolly.live/fact/${primarySlug}`;
  const ogImageUrl = `https://scrolly.live/fact/${primarySlug}/opengraph-image`;

  return {
    title: `${content.title} | Scrolly`,
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
      title: `${fact.emoji ?? '✨'} ${content.title} | Scrolly`,
      description,
      url: canonicalUrl,
      siteName: 'Scrolly',
      type: 'article',
      locale: lang === 'en' ? 'en_US' : 'tr_TR',
      section: catMeta.label[lang],
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${content.title} — Scrolly`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${content.title} | Scrolly`,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function CanonicalFactPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const { lang, hasExplicitLang } = resolveLangParam(query?.lang);

  const allFacts = await getAllFactsServer();
  const fact =
    allFacts.find(
      (item) =>
        item.slug === slug ||
        getFactPrimarySlug(item) === slug ||
        item.en.slug === slug ||
        item.tr.slug === slug ||
        item.id === slug
    ) ?? (await getFactBySlugServer(slug));

  if (!fact) {
    notFound();
  }

  const primarySlug = getFactPrimarySlug(fact);
  const categoryRouteSlug = categoryIdToRouteSlug(fact.category);
  const catMeta = getCategoryMeta(fact.category);
  const content = fact[lang];
  const resolvedSourceName =
    content.sourceName || fact.sourceName || content.sourceHint || 'Scrolly Research Archive';
  const resolvedSourceUrl = content.sourceUrl || fact.sourceUrl;

  let relatedFacts = getRelatedFactsFromPool(fact, allFacts, 4, true);
  if (relatedFacts.length < 4) {
    relatedFacts = getRelatedFactsFromPool(fact, allFacts, 4, false);
  }

  const canonicalUrl = `https://scrolly.live/fact/${primarySlug}`;
  const categoryUrl = `https://scrolly.live/category/${categoryRouteSlug}`;
  const ogImageUrl = `https://scrolly.live/fact/${primarySlug}/opengraph-image`;
  const publishedIso = fact.createdAt || '2026-01-01T00:00:00.000Z';

  const correctQuizAnswer =
    content.quiz.options[content.quiz.correctIndex] ?? content.quiz.options[0];
  const quizAnswerFull = content.quiz.explanation
    ? `${correctQuizAnswer}. ${content.quiz.explanation}`
    : `${correctQuizAnswer}. ${content.deepDiveDetail}`;

  const faqEntries: Array<Record<string, unknown>> = [
    {
      '@type': 'Question',
      name: content.quiz.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: quizAnswerFull,
      },
    },
  ];

  const gc = content.guessChallenge;
  if (gc) {
    let guessValText = '';
    if (gc.type === 'slider' && typeof gc.correctValue === 'number') {
      guessValText = gc.unit ? `${gc.correctValue} ${gc.unit}` : String(gc.correctValue);
    } else if (
      gc.type === 'binary' &&
      gc.options &&
      typeof gc.correctOptionIndex === 'number'
    ) {
      guessValText = gc.options[gc.correctOptionIndex] ?? '';
    }
    if (guessValText && gc.prompt !== content.quiz.question) {
      faqEntries.push({
        '@type': 'Question',
        name: gc.prompt,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${guessValText}. ${content.factText}`,
        },
      });
    }
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Article', 'LearningResource'],
        '@id': `${canonicalUrl}#article`,
        headline: content.title,
        description: content.factText,
        articleBody: `${content.factText}\n\n${content.deepDiveDetail}`,
        inLanguage: ['tr', 'en'],
        educationalLevel: 'Beginner to Intermediate',
        learningResourceType: 'Micro-learning Fact Card',
        datePublished: publishedIso,
        dateModified: publishedIso,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonicalUrl,
        },
        image: ogImageUrl,
        about: {
          '@type': 'Thing',
          name: catMeta.label[lang],
        },
        author: {
          '@type': 'Organization',
          name: 'Scrolly',
          url: 'https://scrolly.live',
        },
        publisher: {
          '@type': 'Organization',
          name: 'Scrolly',
          url: 'https://scrolly.live',
          logo: {
            '@type': 'ImageObject',
            url: 'https://scrolly.live/icon',
          },
        },
        citation: resolvedSourceUrl || resolvedSourceName,
        ...(resolvedSourceUrl
          ? {
              isBasedOn: {
                '@type': 'CreativeWork',
                name: resolvedSourceName,
                url: resolvedSourceUrl,
              },
            }
          : {}),
      },
      {
        '@type': 'FAQPage',
        '@id': `${canonicalUrl}#faq`,
        mainEntity: faqEntries,
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
            item: categoryUrl,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: content.title,
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
      <SingleFactView
        fact={fact}
        relatedFacts={relatedFacts}
        initialLang={lang}
        hasExplicitLang={hasExplicitLang}
      />
    </>
  );
}
