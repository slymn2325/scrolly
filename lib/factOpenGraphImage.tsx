import { ImageResponse } from 'next/og';
import { getCategoryMeta, type Language } from '@/i18n/translations';
import { getFactBySlugServer } from '@/lib/db';
import type { FactCard } from '@/types/fact';

export const factOgSize = { width: 1200, height: 630 };

const FALLBACK = {
  tr: {
    title: 'Scrolly Mikro Keşif Kartı',
    summary: 'Bilimsel kaynaklara dayalı bilgi kartı.',
    source: 'Kaynak',
  },
  en: {
    title: 'Scrolly Micro-Learning Card',
    summary: 'A source-checked fact card.',
    source: 'Source',
  },
} as const;

export function renderFactOpenGraphImage(fact: FactCard | null, lang: Language) {
  const copy = FALLBACK[lang];
  const content = fact?.[lang];
  const accentColor = fact?.accentColor || '#7C3AED';
  const catMeta = getCategoryMeta(fact?.category || 'science');
  const titleText = content?.title || copy.title;
  const summaryTextRaw = content?.factText || copy.summary;
  const summaryText =
    summaryTextRaw.length > 130 ? `${summaryTextRaw.slice(0, 127)}...` : summaryTextRaw;
  const sourceName = content?.sourceName || fact?.sourceName || content?.sourceHint || 'scrolly.live';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 64px',
          background: `linear-gradient(135deg, #FFFDF9 0%, #F5F3FF 55%, ${accentColor}1E 100%)`,
          fontFamily: 'sans-serif',
          color: '#18181B',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background: accentColor,
                color: '#FFFFFF',
                fontSize: '28px',
                fontWeight: 800,
              }}
            >
              S
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: '#18181B' }}>Scrolly</span>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#52525B' }}>scrolly.live</span>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 24px',
              borderRadius: '9999px',
              background: '#FFFFFF',
              border: `2px solid ${accentColor}44`,
              fontSize: '22px',
              fontWeight: 800,
              color: accentColor,
            }}
          >
            <span>{catMeta.emoji}</span>
            <span>{catMeta.label[lang]}</span>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            marginTop: '16px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: titleText.length > 52 ? '46px' : '54px',
              fontWeight: 800,
              lineHeight: 1.15,
              color: '#18181B',
            }}
          >
            {titleText}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '26px',
              fontWeight: 500,
              lineHeight: 1.4,
              color: '#3F3F46',
            }}
          >
            {summaryText}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            paddingTop: '20px',
            borderTop: '2px solid rgba(24,24,27,0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 20px',
              borderRadius: '9999px',
              background: '#ECFDF5',
              border: '1.5px solid #A7F3D0',
              fontSize: '20px',
              fontWeight: 700,
              color: '#065F46',
            }}
          >
            <span>
              {copy.source}: {sourceName}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 22px',
              borderRadius: '9999px',
              background: '#18181B',
              color: '#FFFFFF',
              fontSize: '20px',
              fontWeight: 700,
            }}
          >
            <span>scrolly.live</span>
          </div>
        </div>
      </div>
    ),
    { ...factOgSize }
  );
}

export async function loadFactOpenGraphImage(slug: string, lang: Language) {
  const fact = await getFactBySlugServer(slug);
  return renderFactOpenGraphImage(fact ?? null, lang);
}
