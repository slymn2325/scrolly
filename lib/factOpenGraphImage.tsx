import { ImageResponse } from 'next/og';
import BrandLogo from '@/components/BrandLogo';
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
  const accentColor = fact?.accentColor || '#C44569';
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
            padding: '40px 48px 32px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 20px',
                borderRadius: '999px',
                background: '#FFD6E6',
                color: '#3F1D30',
                fontSize: '22px',
                fontWeight: 800,
              }}
            >
              <span>{catMeta.emoji}</span>
              <span>{catMeta.label[lang]}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                display: 'flex',
                fontSize: titleText.length > 52 ? '44px' : '52px',
                fontWeight: 800,
                lineHeight: 1.15,
                color: '#3F1D30',
              }}
            >
              {titleText}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '26px',
                fontWeight: 600,
                lineHeight: 1.4,
                color: '#7A4A63',
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
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <BrandLogo size={64} id="fact-og-brand" title="Scrolly" />
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#3F1D30' }}>scrolly.live</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 18px',
                borderRadius: '999px',
                background: '#FFF4F7',
                border: `2px solid ${accentColor}`,
                fontSize: '20px',
                fontWeight: 700,
                color: '#3F1D30',
              }}
            >
              <span>
                {copy.source}: {sourceName}
              </span>
            </div>
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
