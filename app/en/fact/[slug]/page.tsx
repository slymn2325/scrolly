import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SingleFactView from '@/components/SingleFactView';
import { getCategoryMeta } from '@/i18n/translations';
import { getAllFacts, getFactBySlug, getRelatedFacts } from '@/utils/factsData';

interface PageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return getAllFacts().map((fact) => ({
    slug: fact.en.slug,
  }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const fact = getFactBySlug(params.slug);
  if (!fact) {
    return {
      title: 'Fact Not Found | Scrolly',
    };
  }

  const catMeta = getCategoryMeta(fact.category);
  return {
    title: `${fact.en.title} | ${catMeta.label.en} - Scrolly`,
    description: `${fact.en.factText} Learn the science behind it and take a quick quiz.`,
    alternates: {
      canonical: `https://scrolly.live/en/fact/${fact.en.slug}`,
      languages: {
        tr: `/bilgi/${fact.tr.slug}`,
        en: `/en/fact/${fact.en.slug}`,
      },
    },
    openGraph: {
      title: `${fact.emoji ?? '✨'} ${fact.en.title} — Scrolly`,
      description: fact.en.factText,
      url: `https://scrolly.live/en/fact/${fact.en.slug}`,
      siteName: 'Scrolly',
      type: 'article',
    },
  };
}

export default function EnglishFactPage({ params }: PageProps) {
  const fact = getFactBySlug(params.slug);
  if (!fact) {
    notFound();
  }

  const relatedFacts = getRelatedFacts(fact, 3);
  return <SingleFactView fact={fact} relatedFacts={relatedFacts} initialLang="en" />;
}
