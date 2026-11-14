import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SingleFactView from '@/components/SingleFactView';
import { getCategoryMeta } from '@/i18n/translations';
import { getAllFacts, getFactBySlug, getRelatedFacts } from '@/utils/factsData';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllFacts().map((fact) => ({
    slug: fact.tr.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const fact = getFactBySlug(slug);
  if (!fact) {
    return {
      title: 'Bilgi Bulunamadı | Scrolly',
    };
  }

  const catMeta = getCategoryMeta(fact.category);
  return {
    title: `${fact.tr.title} | ${catMeta.label.tr} - Scrolly`,
    description: `${fact.tr.factText} Neden ve nasıl olduğunu bilimsel kaynağıyla öğren!`,
    alternates: {
      canonical: `https://scrolly.live/bilgi/${fact.tr.slug}`,
      languages: {
        tr: `/bilgi/${fact.tr.slug}`,
        en: `/en/fact/${fact.en.slug}`,
      },
    },
    openGraph: {
      title: `${fact.emoji ?? '✨'} ${fact.tr.title} — Scrolly`,
      description: fact.tr.factText,
      url: `https://scrolly.live/bilgi/${fact.tr.slug}`,
      siteName: 'Scrolly',
      type: 'article',
    },
  };
}

export default async function TurkishFactPage({ params }: PageProps) {
  const { slug } = await params;
  const fact = getFactBySlug(slug);
  if (!fact) {
    notFound();
  }

  const relatedFacts = getRelatedFacts(fact, 3);
  return <SingleFactView fact={fact} relatedFacts={relatedFacts} initialLang="tr" />;
}
