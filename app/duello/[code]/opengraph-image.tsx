import { duelOgImage, VIRAL_OG_SIZE } from '@/lib/viralOgCard';
import { loadDuelInvite } from '@/lib/duelInvite';
import { duelInviteTitle } from '@/utils/viralShare';

export const alt = 'Scrolly düello daveti';
export const size = VIRAL_OG_SIZE;
export const contentType = 'image/png';

interface OgProps {
  params: Promise<{ code: string }>;
}

export default async function DuelloOpenGraphImage({ params }: OgProps) {
  const { code } = await params;
  const invite = await loadDuelInvite(code);
  return duelOgImage(duelInviteTitle(invite?.hostName || '', 'tr'), 'tr');
}
