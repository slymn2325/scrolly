import React from 'react';

export function ScrollyAppIconArtwork({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'linear-gradient(140deg, #31107A 0%, #5B21B6 52%, #7C3AED 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Top-right warm violet radial aura & bottom-left indigo depth */}
      <div
        style={{
          position: 'absolute',
          top: -Math.round(size * 0.16),
          right: -Math.round(size * 0.14),
          width: Math.round(size * 0.78),
          height: Math.round(size * 0.78),
          borderRadius: 9999,
          background:
            'radial-gradient(circle, rgba(196,181,253,0.42) 0%, rgba(124,58,237,0) 72%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -Math.round(size * 0.22),
          left: -Math.round(size * 0.18),
          width: Math.round(size * 0.75),
          height: Math.round(size * 0.75),
          borderRadius: 9999,
          background:
            'radial-gradient(circle, rgba(30,10,76,0.55) 0%, rgba(49,16,122,0) 70%)',
        }}
      />

      {/* Full-precision layered cards + golden 4-point discovery star */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 1024 1024"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="frontCardBg" x1="286" y1="226" x2="738" y2="798" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F5F3FF" />
          </linearGradient>
          <linearGradient id="goldStarFill" x1="600" y1="158" x2="808" y2="390" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="45%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <linearGradient id="barAccent" x1="354" y1="316" x2="554" y2="316" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#5B21B6" />
          </linearGradient>
          <radialGradient id="starGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#FDE047" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Back Card 1 (Deep Frosted Layer) */}
        <g transform="rotate(-12 512 512) translate(-28 18)">
          <rect
            x="292"
            y="238"
            width="440"
            height="548"
            rx="72"
            fill="#FFFFFF"
            fillOpacity="0.14"
            stroke="#FFFFFF"
            strokeOpacity="0.28"
            strokeWidth="6"
          />
        </g>

        {/* Back Card 2 (Mid Frosted Layer) */}
        <g transform="rotate(-5 512 512) translate(-12 8)">
          <rect
            x="292"
            y="238"
            width="440"
            height="548"
            rx="72"
            fill="#FFFFFF"
            fillOpacity="0.26"
            stroke="#FFFFFF"
            strokeOpacity="0.48"
            strokeWidth="6"
          />
        </g>

        {/* Soft Card Drop Shadow */}
        <rect
          x="292"
          y="256"
          width="440"
          height="548"
          rx="74"
          fill="#1E084D"
          fillOpacity="0.34"
        />

        {/* Crisp White Front Fact Card */}
        <rect
          x="292"
          y="234"
          width="440"
          height="548"
          rx="74"
          fill="url(#frontCardBg)"
          stroke="#FFFFFF"
          strokeWidth="4"
        />

        {/* Card Inner Micro-Learning Composition */}
        {/* Category pill */}
        <rect x="352" y="302" width="164" height="44" rx="22" fill="#EDE9FE" />
        <circle cx="378" cy="324" r="10" fill="#7C3AED" />
        <rect x="400" y="316" width="88" height="16" rx="8" fill="#6D28D9" />

        {/* Headline & Fact Text Lines */}
        <rect x="352" y="390" width="316" height="44" rx="20" fill="url(#barAccent)" />
        <rect x="352" y="458" width="246" height="36" rx="18" fill="#5B21B6" fillOpacity="0.86" />

        <rect x="352" y="534" width="316" height="24" rx="12" fill="#DDD6FE" />
        <rect x="352" y="576" width="268" height="24" rx="12" fill="#E9D5FF" />

        {/* Bottom Interactive Action Pill */}
        <rect x="352" y="646" width="316" height="72" rx="28" fill="#F3E8FF" stroke="#DDD6FE" strokeWidth="4" />
        <circle cx="394" cy="682" r="16" fill="#7C3AED" />
        <rect x="426" y="672" width="196" height="20" rx="10" fill="#6D28D9" fillOpacity="0.65" />

        {/* Golden Radial Aura Behind Discovery Star */}
        <circle cx="708" cy="264" r="156" fill="url(#starGlow)" />

        {/* Golden 4-Point Discovery Star at Top-Right Corner */}
        <path
          d="M708 136L737 228L829 258L737 288L708 380L679 288L587 258L679 228L708 136Z"
          fill="url(#goldStarFill)"
          stroke="#FFFFFF"
          strokeWidth="10"
          strokeLinejoin="round"
        />

        {/* Crisp Star Core Highlight & Secondary Twinkles */}
        <circle cx="708" cy="258" r="14" fill="#FFFBEB" />
        <path
          d="M812 154L820 176L842 184L820 192L812 214L804 192L782 184L804 176L812 154Z"
          fill="#FEF08A"
        />
        <circle cx="606" cy="172" r="9" fill="#FDE68A" fillOpacity="0.95" />
      </svg>
    </div>
  );
}
