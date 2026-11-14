import { ImageResponse } from 'next/og';
import { getCategoryMeta } from '@/i18n/translations';
import { getFactBySlugServer } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const alt = 'Scrolly — Doğrulanmış Mikro Öğrenme Kartı';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

interface OgProps {
  params: Promise<{ slug: string }>;
}

export default async function FactOpenGraphImage({ params }: OgProps) {
  const { slug } = await params;
  const fact = await getFactBySlugServer(slug);

  const accentColor = fact?.accentColor || '#7C3AED';
  const catMeta = getCategoryMeta(fact?.category || 'science');
  const titleText = fact?.tr.title || 'Scrolly Mikro Keşif Kartı';
  const summaryTextRaw = fact?.tr.factText || 'Bilimsel kaynaklara dayalı iki dilli bilgi kartı.';
  const summaryText =
    summaryTextRaw.length > 130 ? `${summaryTextRaw.slice(0, 127)}...` : summaryTextRaw;
  const sourceName =
    fact?.tr.sourceName || fact?.sourceName || fact?.tr.sourceHint || 'scrolly.live';

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
        {/* Top Row: Brand & Category Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
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
              <span style={{ fontSize: '28px', fontWeight: 800, color: '#18181B' }}>
                Scrolly
              </span>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#52525B' }}>
                scrolly.live
              </span>
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
            <span>{catMeta.label.tr}</span>
            <span style={{ color: '#A1A1AA' }}>•</span>
            <span>{catMeta.label.en}</span>
          </div>
        </div>

        {/* Center Main Headline & Summary */}
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

        {/* Footer: Verified Source Pill & CTA */}
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
            <span>✓</span>
            <span>Kaynak / Source: {sourceName}</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
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
    {
      ...size,
    }
  );
}
