import { ImageResponse } from 'next/og';
import BrandLogo from '@/components/BrandLogo';

export const runtime = 'nodejs';
export const alt = 'Scrolly — Reels Tarzı İki Dilli Mikro Keşif Platformu';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div
              style={{
                display: 'flex',
                fontSize: '56px',
                fontWeight: 800,
                lineHeight: 1.12,
                color: '#3F1D30',
              }}
            >
              Tek Saniyede Bilimsel Mikro Keşifler
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '26px',
                fontWeight: 600,
                lineHeight: 1.38,
                color: '#7A4A63',
              }}
            >
              Uzay, Doğa, Bilim, Tarih, İnsan Vücudu ve TR/EN Dil Öğrenme · Doğrulanmış kaynaklarla Reels deneyimi.
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <BrandLogo size={72} id="og-brand" title="Scrolly" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '28px', fontWeight: 800, color: '#3F1D30' }}>Scrolly</span>
                <span style={{ fontSize: '22px', fontWeight: 700, color: '#7A4A63' }}>scrolly.live</span>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 22px',
                borderRadius: '999px',
                background: '#FFD6E6',
                color: '#3F1D30',
                fontSize: '20px',
                fontWeight: 800,
              }}
            >
              TR / EN
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
