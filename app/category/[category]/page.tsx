import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CategoryArchiveView, { buildCategoryMetadata } from '@/components/CategoryArchiveView';
import { parseCategoryPage } from '@/lib/categoryPages';
import { CATEGORY_ROUTE_SLUGS } from '@/utils/factsData';

export const revalidate = 3600;

interface CategoryPageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}

export async function generateStaticParams() {
  return CATEGORY_ROUTE_SLUGS.map((category) => ({ category }));
}

export async function generateMetadata({ params, searchParams }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const page = parseCategoryPage((await searchParams).page);
  if (page === null) {
    return { title: 'Kategori Bulunamadı | Scrolly' };
  }
  return buildCategoryMetadata(category, 'tr', page);
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { category } = await params;
  const page = parseCategoryPage((await searchParams).page);
  if (page === null) notFound();
  return <CategoryArchiveView categorySlug={category} lang="tr" page={page} />;
}
