import type { Metadata } from 'next';
import FactDetailPageContent, { buildFactMetadata } from '@/components/FactDetailPageContent';
import { getAllFactsServer } from '@/lib/db';
import { getFactPrimarySlug } from '@/utils/factsData';

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const allFacts = await getAllFactsServer();
  return allFacts.map((fact) => ({
    slug: getFactPrimarySlug(fact),
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildFactMetadata(slug, 'tr');
}

export default async function FactPage({ params }: PageProps) {
  const { slug } = await params;
  return <FactDetailPageContent slug={slug} lang="tr" />;
}
