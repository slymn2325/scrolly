import { ImageResponse } from 'next/og';
import BrandLogo from '@/components/BrandLogo';
import { dailyPuzzleNumber, parseIsoDate } from '@/utils/viralShare';

export const VIRAL_OG_SIZE = { width: 1200, height: 630 };

function card(kicker: string, title: string, subtitle: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#FFF4F7',
          padding: '36px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
            background: '#FFFFFF',
            borderRadius: '36px',
            border: '3px solid #F3C5D6',
            borderBottom: '10px solid #FF8DB8',
            padding: '44px 52px 36px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '0.08em', color: '#C44569' }}>
              {kicker}
            </span>
            <span style={{ fontSize: '56px', fontWeight: 800, lineHeight: 1.1, color: '#3F1D30', maxWidth: '980px' }}>
              {title}
            </span>
            <span style={{ fontSize: '26px', lineHeight: 1.35, fontWeight: 600, color: '#7A4A63', maxWidth: '960px' }}>
              {subtitle}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <BrandLogo size={72} id="viral-og-brand" title="Scrolly" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: '#3F1D30' }}>Scrolly</span>
              <span style={{ fontSize: '22px', fontWeight: 700, color: '#7A4A63' }}>scrolly.live</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...VIRAL_OG_SIZE }
  );
}

export function dailyOgImage(rawDate: string, lang: 'tr' | 'en') {
  const iso = parseIsoDate(rawDate);
  const number = iso ? dailyPuzzleNumber(iso) : 0;
  if (lang === 'en') {
    return card(
      'DAILY SPRINT',
      iso ? `Scrolly Daily #${number}` : 'Scrolly Daily',
      '5 sourced questions. No spoilers here — play and share your grid.'
    );
  }
  return card(
    'GÜNLÜK SPRİNT',
    iso ? `Scrolly Günlük #${number}` : 'Scrolly Günlük',
    '5 kaynaklı soru. Bu sayfada cevap yok — oyna, ızgaranı paylaş.'
  );
}

export function duelOgImage(title: string, lang: 'tr' | 'en') {
  return card(
    lang === 'en' ? '1V1 DUEL' : '1V1 DÜELLO',
    title,
    lang === 'en'
      ? 'Same questions, one winner. Join the Scrolly duel.'
      : 'Aynı sorular, tek kazanan. Scrolly düellosuna katıl.'
  );
}

export function challengeOgImage(
  creator: string,
  score: number,
  correct: number,
  total: number,
  lang: 'tr' | 'en'
) {
  const safeCreator = String(creator || '').trim() || (lang === 'en' ? 'Explorer' : 'Kâşif');
  const safeScore = Math.max(0, Math.round(score));
  const safeCorrect = Math.max(0, Math.round(correct));
  const safeTotal = Math.max(1, Math.round(total));
  if (lang === 'en') {
    return card(
      'ASYNC CHALLENGE',
      `${safeCreator} scored ${safeScore} XP — Can you beat it?`,
      `${safeCorrect}/${safeTotal} correct · Same questions, instant side-by-side comparison.`
    );
  }
  return card(
    'MEYDAN OKUMA',
    `${safeCreator} ${safeScore} XP yaptı — Geçebilir misin?`,
    `${safeCorrect}/${safeTotal} doğru · Aynı sorularla hemen çöz ve skorunu kıyasla.`
  );
}
