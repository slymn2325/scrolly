import { ImageResponse } from 'next/og';

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
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px 68px',
          background: 'linear-gradient(135deg, #FFFDF9 0%, #EDE9FE 52%, #DDD6FE 100%)',
          fontFamily: 'sans-serif',
          color: '#1E1B2E',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '64px',
                height: '64px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, #6D28D9 0%, #4F46E5 100%)',
                color: '#FFFFFF',
                fontSize: '34px',
                fontWeight: 800,
              }}
            >
              S
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '32px', fontWeight: 800, color: '#1E1B2E' }}>
                Scrolly
              </span>
              <span style={{ fontSize: '18px', fontWeight: 600, color: '#5B21B6' }}>
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
              border: '2px solid #DDD6FE',
              fontSize: '20px',
              fontWeight: 800,
              color: '#5B21B6',
            }}
          >
            <span>TR / EN Bilingual Micro-Learning</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              display: 'flex',
              fontSize: '58px',
              fontWeight: 800,
              lineHeight: 1.12,
              color: '#1E1B2E',
            }}
          >
            Tek Saniyede Bilimsel Mikro Keşifler
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '28px',
              fontWeight: 500,
              lineHeight: 1.38,
              color: '#4338CA',
            }}
          >
            Uzay, Doğa, Bilim, Tarih, İnsan Vücudu ve TR/EN Dil Öğrenme · Doğrulanmış kaynaklarla 100dvh Reels deneyimi.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            paddingTop: '22px',
            borderTop: '2px solid rgba(91,33,182,0.14)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 22px',
              borderRadius: '9999px',
              background: '#ECFDF5',
              border: '1.5px solid #A7F3D0',
              fontSize: '20px',
              fontWeight: 700,
              color: '#065F46',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 6L9 17L4 12"
                stroke="#065F46"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Peer-Reviewed Primary Sources</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 24px',
              borderRadius: '9999px',
              background: '#1E1B2E',
              color: '#FFFFFF',
              fontSize: '20px',
              fontWeight: 700,
            }}
          >
            <span>Explore Free</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
