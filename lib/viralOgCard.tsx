import { ImageResponse } from 'next/og';
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
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: 'linear-gradient(135deg, #FFFDF9 0%, #EDE9FE 48%, #DDD6FE 100%)',
          fontFamily: 'sans-serif',
          color: '#1E1B2E',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              background: '#7C3AED',
              color: '#FFFFFF',
              fontSize: '32px',
              fontWeight: 800,
            }}
          >
            S
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '28px', fontWeight: 800 }}>Scrolly</span>
            <span style={{ fontSize: '18px', color: '#6D28D9' }}>scrolly.live</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '0.08em', color: '#6D28D9' }}>
            {kicker}
          </span>
          <span style={{ fontSize: '60px', fontWeight: 800, lineHeight: 1.1, maxWidth: '1000px' }}>
            {title}
          </span>
          <span style={{ fontSize: '28px', lineHeight: 1.35, color: '#3F3A52', maxWidth: '980px' }}>
            {subtitle}
          </span>
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
