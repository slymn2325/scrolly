'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { DimLine, type DomainSketchProps, HotspotPin, InkPath } from './SketchPrimitives';

export function ScienceWeirdSketch({
  factId,
  lang,
  accentColor,
  active,
  shouldAnimate,
}: DomainSketchProps) {
  const isTr = lang === 'tr';

  switch (factId) {
    case 'science-01':
      // Triple point of water phase diagram
      return (
        <g>
          <line x1="72" y1="138" x2="256" y2="138" stroke="currentColor" strokeWidth="2" />
          <line x1="72" y1="42" x2="72" y2="138" stroke="currentColor" strokeWidth="2" />
          {/* Phase curves meeting at Triple Point */}
          <path d="M 72 132 Q 124 122 158 92 M 158 92 L 154 44 M 158 92 Q 204 82 248 50" fill="none" stroke={accentColor} strokeWidth="2.2" />
          <motion.circle
            cx="158"
            cy="92"
            r={active ? 9 : 6}
            fill="#F43F5E"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            animate={shouldAnimate ? { scale: [1, 1.3, 1] } : undefined}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ originX: '158px', originY: '92px' }}
          />
          <text x="108" y="84" fontSize="8.5" fontWeight="800" fill="currentColor">{isTr ? 'KATI' : 'SOLID'}</text>
          <text x="192" y="66" fontSize="8.5" fontWeight="800" fill="#0284C7">{isTr ? 'SIVI' : 'LIQUID'}</text>
          <text x="196" y="122" fontSize="8.5" fontWeight="800" fill="currentColor">{isTr ? 'GAZ' : 'GAS'}</text>
          <HotspotPin
            cx="158"
            cy="92"
            accentColor="#F43F5E"
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? '0.01°C • 611.657 Pa!' : 'TRIPLE POINT'}
            align="right"
          />
        </g>
      );

    case 'science-02':
      // Eternal honey jar (low Aw + H2O2 + pH 3.9)
      return (
        <g>
          <rect x="120" y="54" width="80" height="84" rx="14" fill="#FBBF24" fillOpacity="0.28" stroke="currentColor" strokeWidth="2.2" />
          <rect x="128" y="42" width="64" height="12" rx="4" fill="#D97706" fillOpacity="0.4" stroke="currentColor" strokeWidth="1.8" />
          <path d="M 136 86 L 152 76 L 168 86 L 168 104 L 152 114 L 136 104 Z" fill="none" stroke="#B45309" strokeWidth="1.8" />
          <HotspotPin
            cx="202"
            cy="78"
            accentColor="#D97706"
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? 'pH 3.9 + H₂O₂ = 0 BAKTERİ' : '3,000+ YIL'}
            align="left"
          />
        </g>
      );

    case 'science-03':
      // Gravitational time dilation skyscraper clocks
      return (
        <g>
          <rect x="142" y="46" width="36" height="98" fill={accentColor} fillOpacity="0.16" stroke="currentColor" strokeWidth="2" />
          <polygon points="160,30 144,46 176,46" fill={accentColor} stroke="currentColor" strokeWidth="1.6" />
          {/* Top fast clock */}
          <circle cx="96" cy="54" r="18" fill="none" stroke={accentColor} strokeWidth="2" />
          <motion.line
            x1="96"
            y1="54"
            x2="96"
            y2="41"
            stroke="#F43F5E"
            strokeWidth="2"
            animate={shouldAnimate ? { rotate: 360 } : undefined}
            transition={{ duration: active ? 2.5 : 5, repeat: Infinity, ease: 'linear' }}
            style={{ originX: '96px', originY: '54px' }}
          />
          {/* Bottom slower clock */}
          <circle cx="96" cy="126" r="18" fill="none" stroke="currentColor" strokeWidth="2" />
          <motion.line
            x1="96"
            y1="126"
            x2="96"
            y2="113"
            stroke="currentColor"
            strokeWidth="2"
            animate={shouldAnimate ? { rotate: 360 } : undefined}
            transition={{ duration: active ? 4 : 6, repeat: Infinity, ease: 'linear' }}
            style={{ originX: '96px', originY: '126px' }}
          />
          <HotspotPin
            cx="210"
            cy="56"
            accentColor={accentColor}
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? (isTr ? 'TEPE: DAHA HIZLI t' : 'TOP: FASTER TIME') : 'GENERAL RELATIVITY'}
            align="left"
          />
        </g>
      );

    case 'science-04':
      // Bananas radioactive K-40 BED dose
      return (
        <g>
          <InkPath
            d="M 88 106 Q 146 124 218 68 Q 204 114 148 128 Q 108 134 88 106 Z"
            stroke="currentColor"
            fill="#FBBF24"
            fillOpacity={0.35}
            shouldAnimate={shouldAnimate}
          />
          {[0, 1, 2].map((w) => (
            <motion.circle
              key={w}
              cx="166"
              cy="90"
              r={18 + w * 14}
              fill="none"
              stroke={accentColor}
              strokeDasharray="4 4"
              strokeWidth="1.5"
              animate={shouldAnimate ? { opacity: active ? [0.8, 0.2, 0.8] : [0.4, 0.15, 0.4] } : undefined}
              transition={{ duration: 1.6, repeat: Infinity, delay: w * 0.25 }}
            />
          ))}
          <HotspotPin
            cx="218"
            cy="68"
            accentColor={accentColor}
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? 'K-40 ≈ 0.1 µSv (GÜVENLİ)' : 'BED = 0.1 µSv'}
            align="left"
          />
        </g>
      );

    case 'science-05':
      // Cumulus cloud weighs ~500 tons
      return (
        <g>
          <InkPath
            d="M 88 92 Q 86 64 116 60 Q 134 38 164 48 Q 198 38 214 62 Q 242 64 238 92 Z"
            stroke="currentColor"
            fill="#BAE6FD"
            fillOpacity={0.35}
            shouldAnimate={shouldAnimate}
          />
          <line x1="160" y1="92" x2="160" y2="128" stroke={accentColor} strokeWidth="2" strokeDasharray="3 2" />
          <rect x="112" y="124" width="96" height="24" rx="8" fill={accentColor} fillOpacity="0.2" stroke={accentColor} strokeWidth="1.8" />
          <text x="160" y="140" textAnchor="middle" fontSize="10" fontWeight="900" fill="currentColor">
            {active ? (isTr ? '≈ 500 TON (~100 FİL)' : '≈ 500 TONS (~100 ELEPHANTS)') : '500,000 KG'}
          </text>
        </g>
      );

    case 'science-06':
      // Sound 4x faster in water vs air
      return (
        <g>
          {/* Air lane */}
          <text x="52" y="66" fontSize="8.5" fontWeight="800" fill="currentColor">{isTr ? 'HAVA' : 'AIR'}</text>
          <line x1="92" y1="62" x2="262" y2="62" stroke="currentColor" strokeOpacity="0.3" strokeDasharray="3 3" />
          <motion.circle cx="96" cy="62" r="6" fill="currentColor" animate={shouldAnimate ? { cx: [96, 152, 96] } : undefined} transition={{ duration: 2.2, repeat: Infinity }} />
          <text x="220" y="66" fontSize="8.5" fontWeight="700" fill="currentColor">343 m/s</text>
          {/* Water lane */}
          <rect x="44" y="88" width="232" height="46" rx="10" fill="#0EA5E9" fillOpacity="0.18" stroke="#0284C7" strokeWidth="1.6" />
          <text x="52" y="114" fontSize="8.5" fontWeight="800" fill="#0284C7">{isTr ? 'SU' : 'H₂O'}</text>
          <motion.circle cx="96" cy="111" r="7" fill="#0284C7" animate={shouldAnimate ? { cx: [96, 258, 96] } : undefined} transition={{ duration: active ? 0.9 : 1.4, repeat: Infinity }} />
          <text x="234" y="128" fontSize="8.5" fontWeight="900" fill="#0284C7">1,480 m/s (4.3×)</text>
        </g>
      );

    case 'science-07':
      // Full 360 degree circle rainbow
      return (
        <g>
          {[42, 35, 28].map((r, i) => (
            <motion.circle
              key={r}
              cx="160"
              cy="88"
              r={r}
              fill="none"
              stroke={['#F43F5E', '#F59E0B', '#38BDF8'][i]}
              strokeWidth="2.4"
              strokeDasharray={active ? '0' : '120 140'}
              transition={{ duration: 0.6 }}
            />
          ))}
          <line x1="56" y1="98" x2="264" y2="98" stroke="currentColor" strokeOpacity="0.35" strokeDasharray="4 4" />
          <HotspotPin
            cx="210"
            cy="88"
            accentColor={accentColor}
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? (isTr ? 'TAM 360° ÇEMBER' : 'FULL 360° CIRCLE') : (isTr ? 'UFUK KESER' : 'HORIZON MASK')}
            align="left"
          />
        </g>
      );

    case 'science-08':
      // 3 Trillion Trees on Earth vs 100-400B Milky Way Stars
      return (
        <g>
          <rect x="64" y="56" width="192" height="22" rx="6" fill="#10B981" fillOpacity="0.25" stroke="#059669" strokeWidth="1.8" />
          <text x="160" y="71" textAnchor="middle" fontSize="9.5" fontWeight="900" fill="currentColor">
            {isTr ? 'DÜNYA AĞAÇLARI ≈ 3.04 TRİLYON' : 'EARTH TREES ≈ 3.04 TRILLION'}
          </text>
          <motion.rect
            x="64"
            y="96"
            width={active ? 44 : 26}
            height="22"
            rx="6"
            fill="#7C3AED"
            fillOpacity="0.28"
            stroke="#7C3AED"
            strokeWidth="1.8"
          />
          <text x="122" y="111" fontSize="9" fontWeight="800" fill="currentColor">
            {isTr ? 'SAMANYOLU YILDIZ ≈ 0.25 TRİLYON' : 'MILKY WAY STARS ≈ 0.25T'}
          </text>
          <DimLine x1="64" y1="148" x2="256" y2="148" label={active ? '~12× DAHA FAZLA AĞAÇ' : 'RATIO 12 : 1'} color="#059669" />
        </g>
      );

    case 'science-09':
      // Photon random walk 100k years inside Sun -> 8m 20s to Earth
      return (
        <g>
          <circle cx="88" cy="88" r="36" fill="#F59E0B" fillOpacity="0.22" stroke="#D97706" strokeWidth="2" />
          {/* Zigzag random walk inside core */}
          <InkPath d="M 88 88 L 76 76 L 98 82 L 80 100 L 106 94 L 122 88" stroke="#F43F5E" strokeWidth="1.8" shouldAnimate={shouldAnimate} />
          {/* Straight vacuum laser path to Earth */}
          <motion.line
            x1="124"
            y1="88"
            x2="246"
            y2="88"
            stroke="#F59E0B"
            strokeWidth="2.4"
            strokeDasharray={active ? '0' : '6 4'}
          />
          <circle cx="256" cy="88" r="10" fill="#0EA5E9" fillOpacity="0.35" stroke="currentColor" strokeWidth="1.8" />
          <DimLine x1="88" y1="148" x2="256" y2="148" label={active ? (isTr ? 'İÇ ÇIKIŞ: 100K YIL • UZAY: 8 DK!' : 'CORE: 100K YRS • SPACE: 8 MIN!') : 'RANDOM WALK → c'} color="#D97706" />
        </g>
      );

    case 'science-10':
      // Spun medieval crown glass mounted thick side down
      return (
        <g>
          <polygon points="150,42 170,42 184,136 136,136" fill="#38BDF8" fillOpacity="0.25" stroke="currentColor" strokeWidth="2" />
          <line x1="160" y1="42" x2="160" y2="136" stroke={accentColor} strokeDasharray="3 3" strokeWidth="1.4" />
          <HotspotPin
            cx="178"
            cy="126"
            accentColor={accentColor}
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? (isTr ? 'KALIN KENAR AŞAĞIDA MONTAJ' : 'MOUNTED THICK END DOWN') : 'AMORPHOUS SOLID'}
            align="left"
          />
        </g>
      );

    case 'weird-01':
      // Titin protein 189,819 letters
      return (
        <g>
          <InkPath
            d="M 52 94 Q 76 52 100 94 T 148 94 T 196 94 T 244 94 T 268 78"
            stroke={accentColor}
            strokeWidth="2.6"
            shouldAnimate={shouldAnimate}
          />
          <HotspotPin
            cx="160"
            cy="68"
            accentColor={accentColor}
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? '189,819 HARF • ~3.5 SAAT' : 'TITIN PROTEIN'}
            align="top"
          />
          <DimLine x1="52" y1="146" x2="268" y2="146" label="METHIONYLTHREONYL..." color={accentColor} />
        </g>
      );

    case 'weird-02':
      // Eiffel Tower thermal expansion +15cm
      return (
        <g>
          <motion.g
            animate={{ scaleY: active ? 1.09 : 1 }}
            transition={{ type: 'spring', stiffness: 180 }}
            style={{ originX: '160px', originY: '144px' }}
          >
            <path d="M 122 144 L 152 44 L 168 44 L 198 144 M 136 108 L 184 108 M 146 78 L 174 78" fill="none" stroke="currentColor" strokeWidth="2.2" />
          </motion.g>
          <HotspotPin
            cx="196"
            cy="52"
            accentColor="#F43F5E"
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? '40°C YAZ: +15 CM!' : 'ΔL = α · L · ΔT'}
            align="left"
          />
          <DimLine x1="120" y1="156" x2="200" y2="156" label={isTr ? 'PUDEL DEMİR GENLEŞMESİ' : 'THERMAL EXPANSION'} color="#F43F5E" />
        </g>
      );

    case 'weird-03':
      // Wombat cube-shaped elastic intestine molding
      return (
        <g>
          <path d="M 52 88 Q 92 70 132 88" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 3" />
          <motion.g
            animate={{ rotate: active ? 14 : 0, scale: active ? 1.12 : 1 }}
            transition={{ type: 'spring' }}
            style={{ originX: '192px', originY: '88px' }}
          >
            <rect x="166" y="62" width="52" height="52" rx="4" fill="#D97706" fillOpacity="0.28" stroke="currentColor" strokeWidth="2.2" />
            <line x1="166" y1="74" x2="180" y2="62" stroke="currentColor" strokeWidth="1.4" />
            <line x1="218" y1="62" x2="230" y2="74" stroke="currentColor" strokeWidth="1.4" />
          </motion.g>
          <DimLine x1="156" y1="146" x2="228" y2="146" label={active ? (isTr ? 'ELASTİK BAĞIRSAK KÖŞELERİ' : 'VARIABLE INTESTINE STIFFNESS') : 'CUBE PROFILE'} color={accentColor} />
        </g>
      );

    case 'weird-04':
      // Susami underwater mailbox 10m deep
      return (
        <g>
          <path d="M 38 56 Q 98 48 160 56 Q 222 64 282 56" stroke="#0284C7" strokeWidth="2" fill="none" />
          <rect x="136" y="92" width="48" height="52" rx="10" fill="#F43F5E" fillOpacity="0.32" stroke="currentColor" strokeWidth="2" />
          <line x1="146" y1="108" x2="174" y2="108" stroke="currentColor" strokeWidth="3" />
          <DimLine x1="214" y1="56" x2="214" y2="142" />
          <HotspotPin
            cx="214"
            cy="102"
            accentColor="#0284C7"
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? '-10M • SUSAMİ BAY!' : 'DEPTH: 10M'}
            align="left"
          />
        </g>
      );

    case 'weird-05':
      // Mayor Stubbs Cat of Talkeetna 20 years
      return (
        <g>
          {/* Cat ears & whiskered head */}
          <path d="M 122 62 L 132 36 L 148 54 L 172 54 L 188 36 L 198 62 A 42 40 0 1 1 122 62 Z" fill="#F59E0B" fillOpacity="0.22" stroke="currentColor" strokeWidth="2" />
          <circle cx="146" cy="76" r="3.5" fill="currentColor" />
          <circle cx="174" cy="76" r="3.5" fill="currentColor" />
          <polygon points="156,86 164,86 160,92" fill="#F43F5E" />
          <HotspotPin
            cx="214"
            cy="68"
            accentColor="#F43F5E"
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? 'BAŞKAN STUBBS • 20 YIL' : '1997–2017'}
            align="left"
          />
        </g>
      );

    case 'weird-06':
      // Norway — Russia (1 country bridge) — North Korea
      return (
        <g>
          <circle cx="68" cy="88" r="22" fill="#38BDF8" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.8" />
          <text x="68" y="92" textAnchor="middle" fontSize="8.5" fontWeight="900" fill="currentColor">NOR</text>
          <motion.rect
            x="114"
            y="68"
            width="92"
            height="40"
            rx="10"
            fill={accentColor}
            fillOpacity={active ? 0.35 : 0.18}
            stroke={accentColor}
            strokeWidth="2"
          />
          <text x="160" y="92" textAnchor="middle" fontSize="9.5" fontWeight="900" fill="currentColor">
            {isTr ? 'RUSYA (1 ÜLKE)' : 'RUSSIA (1 COUNTRY)'}
          </text>
          <circle cx="252" cy="88" r="22" fill="#F43F5E" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.8" />
          <text x="252" y="92" textAnchor="middle" fontSize="8.5" fontWeight="900" fill="currentColor">PRK</text>
          <line x1="90" y1="88" x2="114" y2="88" stroke="currentColor" strokeWidth="2" />
          <line x1="206" y1="88" x2="230" y2="88" stroke="currentColor" strokeWidth="2" />
        </g>
      );

    case 'weird-07':
      // Pineapple bromelain enzyme digesting tongue
      return (
        <g>
          <path d="M 110 88 A 50 36 0 1 1 210 88 Z" fill="#FB7185" fillOpacity="0.24" stroke="currentColor" strokeWidth="2" />
          {/* Bromelain enzyme scissors */}
          <motion.g animate={shouldAnimate ? { rotate: active ? [0, -18, 0] : [0, -8, 0] } : undefined} transition={{ duration: 1.2, repeat: Infinity }} style={{ originX: '160px', originY: '72px' }}>
            <line x1="142" y1="54" x2="178" y2="90" stroke={accentColor} strokeWidth="2.4" />
            <line x1="178" y1="54" x2="142" y2="90" stroke={accentColor} strokeWidth="2.4" />
          </motion.g>
          <DimLine x1="94" y1="144" x2="226" y2="144" label={active ? (isTr ? 'BROMELAIN PROTEİN KESER!' : 'BROMELAIN ENZYME ACTION') : 'PROTEASE'} color={accentColor} />
        </g>
      );

    case 'weird-08':
      // Duck quack DOES echo (overlapping fade-in waveform)
      return (
        <g>
          {[0, 1, 2].map((w) => (
            <motion.path
              key={w}
              d={`M ${56 + w * 48} 96 Q ${80 + w * 48} 48 ${104 + w * 48} 96 T ${152 + w * 48} 96`}
              fill="none"
              stroke={w === 0 ? 'currentColor' : accentColor}
              strokeWidth="2.2"
              strokeDasharray={w > 0 && !active ? '4 4' : undefined}
              animate={shouldAnimate ? { opacity: [0.35, 1, 0.35] } : undefined}
              transition={{ duration: 1.8, repeat: Infinity, delay: w * 0.2 }}
            />
          ))}
          <DimLine x1="56" y1="144" x2="264" y2="144" label={active ? (isTr ? 'YANKI VAR • SADECE ÖRTÜŞÜR!' : 'ECHO EXISTS • OVERLAPPED!') : 'SALFORD ANECHOIC TEST'} color={accentColor} />
        </g>
      );

    case 'weird-09':
      // 639-year John Cage Halberstadt organ concert (2001 -> 2640)
      return (
        <g>
          {[104, 126, 148, 170, 192, 214].map((x, i) => (
            <rect key={x} x={x} y={48 + (i % 3) * 12} width="12" height={78 - (i % 3) * 12} rx="2" fill={i === 2 && active ? accentColor : 'none'} fillOpacity="0.35" stroke="currentColor" strokeWidth="1.8" />
          ))}
          <DimLine x1="88" y1="148" x2="232" y2="148" label={active ? '2001 ──── 639 YIL ────▶ 2640' : 'AS SLOW AS POSSIBLE'} color={accentColor} />
        </g>
      );

    case 'weird-10':
    default:
      // Swiss cheese holes caused by microscopic hay particles
      return (
        <g>
          <polygon points="84,126 236,126 218,52 102,72" fill="#FDE68A" fillOpacity="0.4" stroke="currentColor" strokeWidth="2.2" />
          {[
            [128, 100, 10],
            [172, 88, 13],
            [200, 108, 9],
          ].map(([cx, cy, r], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.65)" stroke="currentColor" strokeWidth="1.4" />
              {active && <circle cx={cx} cy={cy} r="2.2" fill="#D97706" />}
            </g>
          ))}
          <DimLine x1="84" y1="148" x2="236" y2="148" label={active ? (isTr ? 'SAMAN PARTİKÜLÜ + CO₂ ÇEKİRDEĞİ' : 'HAY MICRO-PARTICLE NUCLEATION') : 'MICRO-BUBBLE SEEDS'} color={accentColor} />
        </g>
      );
  }
}
