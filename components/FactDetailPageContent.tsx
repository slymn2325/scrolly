import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SingleFactView from '@/components/SingleFactView';
import { getCategoryMeta, type Language } from '@/i18n/translations';
import { getAllFactsServer, getFactBySlugServer } from '@/lib/db';
import type { FactCard } from '@/types/fact';
import {
  buildCategoryHref,
  buildFactHref,
  categoryIdToRouteSlug,
  getFactPrimarySlug,
  getRelatedFactsFromPool,
} from '@/utils/factsData';
import { buildFactDetailArticle } from '@/utils/topicMotif';

async function resolveFactFromServer(slug: string): Promise<{
  fact: FactCard | null;
  allFacts: FactCard[];
}> {
  const allFacts = await getAllFactsServer();
  const matched =
    allFacts.find(
      (item) =>
        item.slug === slug ||
        getFactPrimarySlug(item) === slug ||
        item.en.slug === slug ||
        item.tr.slug === slug ||
        item.id === slug
    ) ?? (await getFactBySlugServer(slug));

  return {
    fact: matched ?? null,
    allFacts,
  };
}

export async function buildFactMetadata(slug: string, lang: Language): Promise<Metadata> {
  const { fact } = await resolveFactFromServer(slug);
  if (!fact) {
    return {
      title: lang === 'tr' ? 'Kart Bulunamadı | Scrolly' : 'Fact Not Found | Scrolly',
    };
  }

  const primarySlug = getFactPrimarySlug(fact);
  const trUrl = `https://scrolly.live${buildFactHref(primarySlug, 'tr')}`;
  const enUrl = `https://scrolly.live${buildFactHref(primarySlug, 'en')}`;
  const canonicalUrl = lang === 'en' ? enUrl : trUrl;
  const ogImageUrl = `https://scrolly.live/fact/${primarySlug}/opengraph-image`;
  const title = fact[lang].title;
  const description = fact[lang].factText;
  const catMeta = getCategoryMeta(fact.category);

  return {
    title: `${title} | Scrolly`,
    description,
    keywords: [catMeta.label[lang], fact[lang].tag, 'Scrolly', 'Scrolla'].filter(
      (item): item is string => Boolean(item)
    ),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        tr: trUrl,
        en: enUrl,
        'x-default': trUrl,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Scrolly',
      type: 'article',
      locale: lang === 'en' ? 'en_US' : 'tr_TR',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

interface FactDetailPageContentProps {
  slug: string;
  lang: Language;
}

export default async function FactDetailPageContent({
  slug,
  lang,
}: FactDetailPageContentProps) {
  const { fact, allFacts } = await resolveFactFromServer(slug);
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

  const canonicalUrl = `https://scrolly.live${buildFactHref(primarySlug, lang)}`;
  const categoryUrl = `https://scrolly.live${buildCategoryHref(categoryRouteSlug, lang)}`;
  const ogImageUrl = `https://scrolly.live/fact/${primarySlug}/opengraph-image`;
  const publishedIso = fact.createdAt || '2026-01-01T00:00:00.000Z';
  const enrichedArticle = buildFactDetailArticle(
    {
      factText: content.factText,
      deepDiveDetail: content.deepDiveDetail,
      tag: content.tag,
      sourceHint: content.sourceHint,
      quiz: content.quiz,
    },
    lang
  );

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
        articleBody: `${content.factText}\n\n${enrichedArticle.article}`,
        inLanguage: lang,
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
        hasExplicitLang
      />
    </>
  );
}
