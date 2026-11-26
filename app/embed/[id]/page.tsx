import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import EmbedStoryClient from '@/components/stories/EmbedStoryClient';
import { getStoryById } from '@/lib/stories';

export const dynamic = 'force-dynamic';

interface EmbedPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EmbedPageProps): Promise<Metadata> {
  const { id } = await params;
  const story = await getStoryById(id, { incrementViews: false, publicOnly: true });
  if (!story) {
    return {
      title: 'Story Not Found | Scrolly',
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `${story.title} | Scrolly Embed`,
    robots: { index: false, follow: true },
  };
}

export default async function EmbedStoryPage({ params }: EmbedPageProps) {
  const { id } = await params;
  const story = await getStoryById(id, { incrementViews: true, publicOnly: true });
  if (!story) {
    notFound();
  }
  return <EmbedStoryClient story={story} />;
}
