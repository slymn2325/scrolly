import React from 'react';

interface BrandLogoProps {
  size?: number;
  className?: string;
  title?: string;
  id?: string;
}

/** Rounded Scrolly mark: violet-to-coral cards with a spark curve. */
export default function BrandLogo({
  size = 44,
  className = '',
  title = 'Scrolly',
  id = 'scrolly-brand',
}: BrandLogoProps) {
  const gradientId = `${id}-bg`;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      role="img"
      aria-label={title}
      className={`shrink-0 rounded-2xl ${className}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="96" y1="48" x2="960" y2="980" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6B4BFF" />
          <stop offset="100%" stopColor="#FF7A59" />
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" rx="224" fill={`url(#${gradientId})`} />
      <g fill="#FFFFFF">
        <rect x="250" y="214" width="430" height="168" rx="48" opacity="0.28" />
        <rect x="292" y="318" width="430" height="176" rx="48" opacity="0.5" />
        <rect x="334" y="430" width="430" height="196" rx="52" opacity="0.94" />
      </g>
      <path
        d="M250 760C390 620 470 560 560 470C650 380 730 300 820 188"
        stroke="#FFFFFF"
        strokeWidth="36"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="820" cy="188" r="28" fill="#FFFFFF" />
      <path d="M868 132l14 36 36 14-36 14-14 36-14-36-36-14 36-14-14-36z" fill="#FFFFFF" />
    </svg>
  );
}
