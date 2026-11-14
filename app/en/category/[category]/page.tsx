import type { Metadata } from 'next';
import CategoryArchiveView, { buildCategoryMetadata } from '@/components/CategoryArchiveView';
import { CATEGORY_ROUTE_SLUGS } from '@/utils/factsData';

export const revalidate = 3600;

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  return CATEGORY_ROUTE_SLUGS.map((category) => ({ category }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  return buildCategoryMetadata(category, 'en');
}

export default async function EnglishCategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  return <CategoryArchiveView categorySlug={category} lang="en" />;
}
