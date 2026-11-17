import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DuelInviteLanding from '@/components/DuelInviteLanding';
import { loadDuelInvite } from '@/lib/duelInvite';
import { isShortRoomCode } from '@/lib/duelStore';
import { fitDocumentTitle } from '@/utils/factSeo';
import { duelInvitePath, duelInviteTitle, PUBLIC_SITE_ORIGIN } from '@/utils/viralShare';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  if (!isShortRoomCode(code)) {
    return { title: 'Scrolly duel', robots: { index: false, follow: true } };
  }
  const invite = await loadDuelInvite(code);
  const title = fitDocumentTitle(duelInviteTitle(invite?.hostName || '', 'en'));
  const description = 'Same questions, one winner. Join a Scrolly 1v1 duel.';
  const url = `${PUBLIC_SITE_ORIGIN}${duelInvitePath(invite?.code || code, 'en')}`;
  return {
    title,
    description,
    robots: { index: false, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Scrolly',
      type: 'website',
    },
  };
}

export default async function EnglishDuelInvitePage({ params }: PageProps) {
  const { code } = await params;
  const invite = await loadDuelInvite(code);
  if (!invite) notFound();
  return (
    <DuelInviteLanding
      code={invite.code}
      hostName={invite.hostName}
      questionCount={invite.questionCount}
      lang="en"
    />
  );
}
