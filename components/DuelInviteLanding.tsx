import Link from 'next/link';
import { duelInviteTitle, duelJoinHref } from '@/utils/viralShare';

interface DuelInviteLandingProps {
  code: string;
  hostName: string;
  lang: 'tr' | 'en';
  questionCount?: number | null;
}

export default function DuelInviteLanding({
  code,
  hostName,
  lang,
  questionCount,
}: DuelInviteLandingProps) {
  const isEn = lang === 'en';
  const title = duelInviteTitle(hostName, lang);
  const countLabel =
    typeof questionCount === 'number' && questionCount > 0
      ? isEn
        ? `${questionCount} questions`
        : `${questionCount} soru`
      : isEn
        ? 'Same question pack'
        : 'Aynı soru paketi';

  return (
    <main className="flex h-full min-h-0 flex-col overflow-y-auto bg-[#FFFDF9] text-[#1E1B2E]">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-16">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">
          {isEn ? '1v1 duel' : '1v1 düello'}
        </p>
        <h1 className="mt-2 font-display text-3xl font-black leading-tight tracking-tight">{title}</h1>
        <p className="mt-4 text-base font-medium leading-relaxed text-[#1E1B2E]/80">
          {isEn
            ? 'The questions stay hidden until you join. No scores on this page.'
            : 'Sorular katılana kadar gizli. Bu sayfada skor yok.'}
        </p>
        <p className="mt-3 text-sm font-bold text-[#1E1B2E]/70">
          {countLabel} · {isEn ? 'Room' : 'Oda'} {code}
        </p>
        <Link
          href={duelJoinHref(code, lang)}
          data-testid="duel-join-cta"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-violet-600 px-6 text-sm font-black text-white shadow-lg shadow-violet-500/25"
        >
          {isEn ? 'Join the duel' : 'Düelloya katıl'}
        </Link>
      </div>
    </main>
  );
}
