import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 180,
  height: 180,
};

export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #6C5CE7 0%, #8B5CF6 48%, #FF7675 100%)',
        }}
      >
        <svg
          width="116"
          height="116"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="60" cy="60" r="46" stroke="rgba(255,255,255,0.45)" strokeWidth="5" />
          <path
            d="M60 14L70 50L106 60L70 70L60 106L50 70L14 60L50 50L60 14Z"
            fill="#FFFFFF"
          />
          <circle cx="60" cy="60" r="11" fill="#FDE047" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
