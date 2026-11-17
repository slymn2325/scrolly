import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DuelInviteLanding from '@/components/DuelInviteLanding';
import { loadDuelInvite } from '@/lib/duelInvite';
import { isShortRoomCode } from '@/lib/duelStore';
import { duelInvitePath, duelInviteTitle, PUBLIC_SITE_ORIGIN } from '@/utils/viralShare';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  if (!isShortRoomCode(code)) return { title: 'Scrolly düellosu' };
  const invite = await loadDuelInvite(code);
  const title = duelInviteTitle(invite?.hostName || '', 'tr');
  const description = 'Aynı sorular, tek kazanan. Scrolly 1v1 düellosuna katıl.';
  const url = `${PUBLIC_SITE_ORIGIN}${duelInvitePath(invite?.code || code, 'tr')}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Scrolly',
      type: 'website',
    },
  };
}

export default async function DuelloInvitePage({ params }: PageProps) {
  const { code } = await params;
  const invite = await loadDuelInvite(code);
  if (!invite) notFound();
  return (
    <DuelInviteLanding
      code={invite.code}
      hostName={invite.hostName}
      questionCount={invite.questionCount}
      lang="tr"
    />
  );
}
