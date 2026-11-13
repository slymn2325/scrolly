import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 512,
  height: 512,
};

export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 116,
          background: 'linear-gradient(135deg, #6C5CE7 0%, #8B5CF6 46%, #FF7675 100%)',
        }}
      >
        <div
          style={{
            width: 396,
            height: 396,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 96,
            background: 'rgba(255, 255, 255, 0.14)',
            border: '4px solid rgba(255, 255, 255, 0.35)',
          }}
        >
          <svg
            width="230"
            height="230"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="60" cy="60" r="46" stroke="rgba(255,255,255,0.45)" strokeWidth="4" />
            <path
              d="M60 12L71 49L108 60L71 71L60 108L49 71L12 60L49 49L60 12Z"
              fill="#FFFFFF"
            />
            <circle cx="60" cy="60" r="10" fill="#FDE047" />
          </svg>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
