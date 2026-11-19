import { getChallengeByCode } from '@/lib/challenges';
import { challengeOgImage, VIRAL_OG_SIZE } from '@/lib/viralOgCard';

export const alt = 'Scrolly Meydan Okuma';
export const size = VIRAL_OG_SIZE;
export const contentType = 'image/png';

interface OgProps {
  params: Promise<{ code: string }>;
}

export default async function ChallengeOpenGraphImage({ params }: OgProps) {
  const { code } = await params;
  const challenge = await getChallengeByCode(code).catch(() => null);
  return challengeOgImage(
    challenge?.creatorNickname ?? '',
    challenge?.creatorScore ?? 0,
    challenge?.creatorCorrect ?? 0,
    challenge?.totalQuestions ?? 5,
    challenge?.lang ?? 'tr'
  );
}
