import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ChallengeArenaClient from '@/components/ChallengeArenaClient';
import {
  challengeOgTitle,
  challengePublicUrl,
  getChallengeByCode,
  isValidChallengeCode,
  resolveChallengeQuestions,
} from '@/lib/challenges';
import { fitDocumentTitle } from '@/utils/factSeo';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  if (!isValidChallengeCode(code)) {
    return { title: 'Scrolly Challenge', robots: { index: false, follow: true } };
  }

  const challenge = await getChallengeByCode(code);
  if (!challenge) {
    return { title: 'Scrolly Challenge', robots: { index: false, follow: true } };
  }

  const ogTitle = fitDocumentTitle(challengeOgTitle(challenge));
  const description =
    challenge.lang === 'en'
      ? `${challenge.creatorCorrect}/${challenge.totalQuestions} correct on Scrolly. Solve the exact same questions with no sign-up required.`
      : `${challenge.creatorCorrect}/${challenge.totalQuestions} doğru ile ${challenge.creatorScore} XP! Kayıt olmadan birebir aynı soruları çöz.`;
  const url = challengePublicUrl(challenge.code);

  return {
    title: ogTitle,
    description,
    robots: { index: false, follow: true },
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: 'Scrolly',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
    },
  };
}

export default async function ChallengePage({ params }: PageProps) {
  const { code } = await params;
  const challenge = await getChallengeByCode(code);
  if (!challenge) notFound();

  const { questions, vocabularyPool } = await resolveChallengeQuestions(challenge);

  return (
    <ChallengeArenaClient
      challenge={challenge}
      questions={questions}
      vocabularyPool={vocabularyPool}
    />
  );
}
