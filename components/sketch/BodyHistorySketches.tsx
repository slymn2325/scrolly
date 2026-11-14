'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { DimLine, type DomainSketchProps, HotspotPin, InkPath } from './SketchPrimitives';

export function BodyHistorySketch({
  factId,
  lang,
  accentColor,
  active,
  shouldAnimate,
}: DomainSketchProps) {
  const isTr = lang === 'tr';

  switch (factId) {
    case 'human-01':
      // Babies ~300 bones -> Adults 206 bones fusion
      return (
        <g>
          {/* Two bone segments fusing on active */}
          <motion.g animate={{ x: active ? 16 : 0 }} transition={{ type: 'spring', stiffness: 180 }}>
            <path d="M 68 82 L 138 82 M 64 74 A 8 8 0 1 0 64 90" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          </motion.g>
          <motion.g animate={{ x: active ? -16 : 0 }} transition={{ type: 'spring', stiffness: 180 }}>
            <path d="M 182 82 L 252 82 M 256 74 A 8 8 0 1 1 256 90" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          </motion.g>
          <circle cx="160" cy="82" r={active ? 10 : 6} fill={accentColor} fillOpacity="0.28" stroke={accentColor} strokeWidth="1.6" strokeDasharray="3 2" />
          <DimLine
            x1="64"
            y1="142"
            x2="256"
            y2="142"
            label={active ? (isTr ? 'YETİŞKİN: 206 KAYNAŞMIŞ KEMİK' : 'ADULT: 206 FUSED BONES') : (isTr ? 'BEBEK: ~300 KEMİK/KIKIRDAK' : 'INFANT: ~300 BONES')}
            color={accentColor}
          />
        </g>
      );

    case 'human-02':
      // Brain itself has zero nociceptors
      return (
        <g>
          <InkPath
            d="M 110 110 Q 94 74 128 54 Q 160 40 192 56 Q 226 76 208 110 Q 194 124 162 120 Q 124 126 110 110 Z"
            stroke="currentColor"
            fill={accentColor}
            shouldAnimate={shouldAnimate}
          />
          <path d="M 134 72 Q 160 88 186 70 M 140 96 Q 160 84 182 98" stroke={accentColor} strokeWidth="1.6" fill="none" />
          {/* Pain probe touching skull vs cortex */}
          <HotspotPin
            cx="160"
            cy="64"
            accentColor={active ? '#10B981' : '#F43F5E'}
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? (isTr ? 'KORTEKS: 0 NOSİSEPTÖR' : 'CORTEX: 0 PAIN RECEPTORS') : (isTr ? 'BEYİN DOKUSU' : 'BRAIN TISSUE')}
            align="top"
          />
          <DimLine x1="90" y1="150" x2="230" y2="150" label={isTr ? 'ZARLAR ACI HİSSEDER • BEYİN HİSSETMEZ' : 'MENINGES FEEL • BRAIN DOES NOT'} color={accentColor} />
        </g>
      );

    case 'human-03':
      // Blood vessels 100,000 km circle Earth twice
      return (
        <g>
          <circle cx="160" cy="88" r="36" fill="#0EA5E9" fillOpacity="0.18" stroke="currentColor" strokeWidth="2" />
          <path d="M 136 78 Q 154 70 168 84 T 192 92" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.4" />
          <motion.ellipse
            cx="160"
            cy="88"
            rx="66"
            ry="24"
            fill="none"
            stroke="#F43F5E"
            strokeWidth="2.4"
            strokeDasharray={active ? '0' : '8 4'}
            animate={shouldAnimate ? { rotate: active ? [18, 28, 18] : 18 } : undefined}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ originX: '160px', originY: '88px' }}
          />
          <HotspotPin
            cx="226"
            cy="88"
            accentColor="#F43F5E"
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? '≈ 100,000 KM (2.5× DÜNYA)' : '40,075 KM EKVATOR'}
            align="left"
          />
        </g>
      );

    case 'human-04':
      // Stomach HCl acid beaker pH 1.5 - 2.0
      return (
        <g>
          <path d="M 108 42 L 108 136 Q 108 148 122 148 L 198 148 Q 212 148 212 136 L 212 42" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <path d="M 110 92 Q 135 84 160 92 Q 185 100 210 92 L 210 144 L 110 144 Z" fill="#F59E0B" fillOpacity="0.25" stroke="#D97706" strokeWidth="1.6" />
          {/* Razor blade dissolving */}
          <motion.rect
            x="136"
            y="108"
            width="48"
            height="18"
            rx="2"
            fill="none"
            stroke={accentColor}
            strokeWidth="2"
            strokeDasharray={active ? '3 3' : undefined}
            animate={active ? { opacity: [1, 0.35, 1] } : undefined}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
          <HotspotPin
            cx="214"
            cy="72"
            accentColor="#D97706"
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? 'HCl • pH 1.5–2.0!' : 'pH TEST'}
            align="left"
          />
        </g>
      );

    case 'human-05':
      // Cornea direct O2 from air
      return (
        <g>
          <path d="M 78 90 Q 160 44 242 90 Q 160 136 78 90 Z" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <circle cx="160" cy="90" r="24" fill={accentColor} fillOpacity="0.22" stroke={accentColor} strokeWidth="2" />
          <circle cx="160" cy="90" r="9" fill="currentColor" />
          {/* O2 arrows straight from air */}
          {[132, 160, 188].map((ox, i) => (
            <motion.text
              key={ox}
              x={ox}
              y={active ? 68 : 48}
              textAnchor="middle"
              fontSize="10"
              fontWeight="900"
              fill="#0284C7"
              animate={shouldAnimate ? { y: [46, 70, 46] } : undefined}
              transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.2 }}
            >
              O₂ ↓
            </motion.text>
          ))}
          <DimLine x1="78" y1="150" x2="242" y2="150" label={isTr ? 'KAN DAMARSIZ KORNEA' : 'AVASCULAR CORNEA'} color={accentColor} />
        </g>
      );

    case 'human-06':
      // Humans & bananas share ~60% homologous genes
      return (
        <g>
          {/* Stylized DNA Helix sketch */}
          <InkPath
            d="M 76 58 Q 108 118 140 58 Q 172 118 204 58 Q 236 118 256 68"
            stroke={accentColor}
            strokeWidth="2.4"
            shouldAnimate={shouldAnimate}
          />
          <InkPath
            d="M 76 112 Q 108 52 140 112 Q 172 52 204 112 Q 236 52 256 102"
            stroke="currentColor"
            strokeWidth="2.2"
            shouldAnimate={shouldAnimate}
          />
          {[92, 124, 156, 188, 220].map((rx, i) => (
            <line
              key={rx}
              x1={rx}
              y1="68"
              x2={rx}
              y2="102"
              stroke={active && i < 3 ? '#F59E0B' : 'currentColor'}
              strokeWidth={active && i < 3 ? '2.8' : '1.4'}
              strokeOpacity={i < 3 ? 0.9 : 0.35}
            />
          ))}
          <DimLine x1="76" y1="148" x2="244" y2="148" label={active ? (isTr ? '~%60 ORTAK TEMEL HÜCRE GENİ' : '~60% CONSERVED HOUSEKEEPING GENES') : 'DNA HOMOLOGY'} color={accentColor} />
        </g>
      );

    case 'human-07':
      // Unique tongue print biometrics
      return (
        <g>
          <path d="M 118 50 L 202 50 L 202 98 A 42 42 0 0 1 118 98 Z" fill="#FB7185" fillOpacity="0.22" stroke="currentColor" strokeWidth="2.2" />
          <line x1="160" y1="54" x2="160" y2="128" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
          {[
            [142, 74], [176, 78], [148, 98], [172, 102], [160, 114],
          ].map(([px, py], i) => (
            <motion.circle
              key={i}
              cx={px}
              cy={py}
              r={active ? 5 : 3.5}
              fill={accentColor}
              animate={shouldAnimate && active ? { scale: [1, 1.4, 1] } : undefined}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.12 }}
              style={{ originX: `${px}px`, originY: `${py}px` }}
            />
          ))}
          <DimLine x1="108" y1="154" x2="212" y2="154" label={active ? (isTr ? 'BENZERSİZ PAPİLLA HARİTASI' : 'UNIQUE PAPILLAE PRINT') : 'BIOMETRIC SCAN'} color={accentColor} />
        </g>
      );

    case 'human-08':
      // Heart 2.5 billion beats ECG wave
      return (
        <g>
          <motion.path
            d="M 38 94 L 96 94 L 114 64 L 130 124 L 148 44 L 166 116 L 182 82 L 198 94 L 282 94"
            fill="none"
            stroke="#F43F5E"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={shouldAnimate ? { pathLength: active ? [0.1, 1] : [0.3, 1, 0.3] } : undefined}
            transition={{ duration: active ? 1.0 : 2.1, repeat: Infinity }}
          />
          <HotspotPin
            cx="148"
            cy="44"
            accentColor="#F43F5E"
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? '≈ 2,500,000,000 ATIM' : '100,000 / GÜN'}
            align="left"
          />
          <DimLine x1="48" y1="150" x2="272" y2="150" label={isTr ? 'ÖMÜR BOYU SÜREKLİ POMPA' : 'LIFETIME ECG TRACE'} color="#F43F5E" />
        </g>
      );

    case 'human-09':
      // Stapes bone 3mm vs rice grain
      return (
        <g>
          {/* Rice grain left */}
          <ellipse cx="104" cy="88" rx="22" ry="10" fill="#FDE68A" fillOpacity="0.45" stroke="currentColor" strokeWidth="1.8" transform="rotate(-14 104 88)" />
          <text x="104" y="118" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="currentColor">
            {isTr ? 'PİRİNÇ (≈6 mm)' : 'RICE (≈6 mm)'}
          </text>
          {/* Stirrup / Stapes bone right */}
          <motion.g animate={{ scale: active ? 1.25 : 1 }} style={{ originX: '214px', originY: '86px' }}>
            <path d="M 214 66 L 214 78 M 202 98 Q 214 76 226 98 Z" fill={accentColor} fillOpacity="0.24" stroke={accentColor} strokeWidth="2.2" />
          </motion.g>
          <text x="214" y="118" textAnchor="middle" fontSize="8.5" fontWeight="800" fill={accentColor}>
            {isTr ? 'ÜZENGİ (2.8 mm)' : 'STAPES (2.8 mm)'}
          </text>
          <DimLine x1="184" y1="146" x2="244" y2="146" label="2.8–3.3 mm" color={accentColor} />
        </g>
      );

    case 'human-10':
      // Olfactory gate shut during deep sleep
      return (
        <g>
          {/* Vapor molecules */}
          {[76, 94, 112].map((vx, i) => (
            <motion.circle
              key={vx}
              cx={vx}
              cy="88"
              r="5"
              fill="#F59E0B"
              animate={shouldAnimate ? { x: active ? [0, 26, 0] : [0, 12, 0] } : undefined}
              transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
          {/* Closed Gate Valve */}
          <line x1="160" y1="48" x2="160" y2="128" stroke="#F43F5E" strokeWidth="3.5" strokeDasharray={active ? undefined : '6 4'} />
          <rect x="192" y="66" width="66" height="44" rx="10" fill={accentColor} fillOpacity="0.18" stroke="currentColor" strokeWidth="1.8" />
          <text x="225" y="92" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="currentColor">
            {isTr ? 'DERİN UYKU' : 'DEEP SLEEP'}
          </text>
          <DimLine x1="76" y1="150" x2="258" y2="150" label={active ? (isTr ? 'KOKU EŞİĞİ KAPALI' : 'OLFACTORY GATE OFF') : 'NOSE → CORTEX'} color={accentColor} />
        </g>
      );

    case 'history-01':
      // Cleopatra timeline: Pyramids (2560 BCE) <- 2500 yrs -> Cleopatra (30 BCE) <- 2000 yrs -> Moon (1969)
      return (
        <g>
          <line x1="40" y1="92" x2="280" y2="92" stroke="currentColor" strokeWidth="2.2" />
          {/* Pyramid sketch */}
          <polygon points="56,92 42,68 70,68" transform="rotate(180 56 80)" fill="#F59E0B" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.6" />
          <text x="56" y="54" textAnchor="middle" fontSize="8" fontWeight="800" fill="currentColor">-2560</text>
          {/* Cleopatra crown */}
          <circle cx="176" cy="92" r="6" fill={accentColor} />
          <text x="176" y="76" textAnchor="middle" fontSize="8.5" fontWeight="900" fill={accentColor}>
            {isTr ? 'KLEOPATRA (-30)' : 'CLEOPATRA (-30)'}
          </text>
          {/* Moon Rocket */}
          <polygon points="266,64 258,84 274,84" fill="#38BDF8" fillOpacity="0.35" stroke="currentColor" strokeWidth="1.6" />
          <text x="266" y="54" textAnchor="middle" fontSize="8" fontWeight="800" fill="currentColor">1969</text>
          <DimLine x1="56" y1="118" x2="176" y2="118" label="~2,530 YIL" color="currentColor" />
          <DimLine x1="176" y1="142" x2="266" y2="142" label={active ? (isTr ? 'DAHA YAKIN (~1,999 YIL)!' : 'CLOSER (~1,999 YRS)!') : '~1,999 YIL'} color={accentColor} />
        </g>
      );

    case 'history-02':
      // Oxford (1096) vs Aztec Empire (1428)
      return (
        <g>
          <line x1="48" y1="92" x2="272" y2="92" stroke="currentColor" strokeWidth="2" />
          <rect x="64" y="54" width="44" height="38" fill={accentColor} fillOpacity="0.2" stroke="currentColor" strokeWidth="1.8" />
          <text x="86" y="77" textAnchor="middle" fontSize="8.5" fontWeight="900" fill="currentColor">1096</text>
          <polygon points="214,92 234,54 254,92" fill="#F59E0B" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.8" />
          <text x="234" y="84" textAnchor="middle" fontSize="8" fontWeight="900" fill="currentColor">1428</text>
          <DimLine x1="86" y1="138" x2="234" y2="138" label={active ? (isTr ? 'OXFORD +332 YIL DAHA ESKİ' : 'OXFORD +332 YRS OLDER') : 'OXFORD → AZTEC'} color={accentColor} />
        </g>
      );

    case 'history-03':
      // 38-minute Anglo-Zanzibar war stopwatch
      return (
        <g>
          <circle cx="160" cy="90" r="44" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <rect x="150" y="34" width="20" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          {/* 38 minute arc */}
          <path d="M 160 46 A 44 44 0 1 1 124 116 L 160 90 Z" fill="#F43F5E" fillOpacity={active ? 0.32 : 0.18} stroke="#F43F5E" strokeWidth="1.8" />
          <text x="160" y="94" textAnchor="middle" fontSize="13" fontWeight="900" fill="currentColor">38 dk</text>
          <DimLine x1="90" y1="154" x2="230" y2="154" label={active ? '1896 • 09:02 – 09:40' : (isTr ? 'TARİHİN EN KISA SAVAŞI' : 'SHORTEST WAR')} color="#F43F5E" />
        </g>
      );

    case 'history-04':
      // Tyrian Royal Purple Murex snail
      return (
        <g>
          {/* Snail spiral sketch */}
          <InkPath
            d="M 122 96 A 26 26 0 1 1 148 122 A 16 16 0 1 1 132 106 A 8 8 0 1 1 140 114"
            stroke="currentColor"
            fill="#7E22CE"
            fillOpacity={0.22}
            shouldAnimate={shouldAnimate}
          />
          <motion.circle
            cx="216"
            cy="92"
            r={active ? 22 : 16}
            fill="#6B21A8"
            fillOpacity="0.65"
            stroke="#581C87"
            strokeWidth="2"
            transition={{ type: 'spring' }}
          />
          <text x="216" y="96" textAnchor="middle" fontSize="9" fontWeight="900" fill="#FFFFFF">6,6′-Br</text>
          <DimLine x1="88" y1="150" x2="232" y2="150" label={active ? (isTr ? '10,000 SALYANGOZ = 1 GRAM BOYA' : '10,000 SNAILS = 1g DYE') : 'TYRIAN PURPLE'} color="#7E22CE" />
        </g>
      );

    case 'history-05':
      // Woolly mammoths walked Wrangel Island while Pyramids stood
      return (
        <g>
          <polygon points="96,122 128,60 160,122" fill="#F59E0B" fillOpacity="0.25" stroke="currentColor" strokeWidth="2" />
          {/* Mammoth silhouette sketch right */}
          <InkPath
            d="M 192 122 L 192 92 Q 192 70 218 70 Q 240 70 244 88 L 246 122 M 244 88 Q 262 94 256 112"
            stroke="currentColor"
            fill={accentColor}
            shouldAnimate={shouldAnimate}
          />
          <DimLine x1="86" y1="146" x2="254" y2="146" label={active ? (isTr ? 'WRANGEL ADASI • MÖ 2000 EŞZAMANLI' : 'OVERLAP ≈ 2560–2000 BCE') : 'PARALLEL ERA'} color={accentColor} />
        </g>
      );

    case 'history-06':
      // Pompeii Thermopolium street food counter amphorae
      return (
        <g>
          <rect x="64" y="82" width="192" height="44" rx="6" fill="#D97706" fillOpacity="0.18" stroke="currentColor" strokeWidth="2" />
          {[100, 140, 180, 220].map((ax, i) => (
            <ellipse key={ax} cx={ax} cy="82" rx="14" ry="7" fill={active && i % 2 === 0 ? '#F59E0B' : '#FFFDF9'} stroke="currentColor" strokeWidth="1.8" />
          ))}
          <HotspotPin
            cx="140"
            cy="68"
            accentColor="#D97706"
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? (isTr ? 'POMPEİ FAST-FOOD (MS 79)' : 'ROMAN THERMOPOLIUM') : 'AMPHORAE'}
            align="top"
          />
        </g>
      );

    case 'history-07':
      // Hero's Aeolipile steam sphere
      return (
        <g>
          <line x1="94" y1="138" x2="226" y2="138" stroke="currentColor" strokeWidth="2.2" />
          <path d="M 118 138 L 118 86 L 136 86 M 202 138 L 202 86 L 184 86" fill="none" stroke="currentColor" strokeWidth="2" />
          <motion.g
            animate={shouldAnimate ? { rotate: active ? 360 : 120 } : undefined}
            transition={{ duration: active ? 2.5 : 6, repeat: Infinity, ease: 'linear' }}
            style={{ originX: '160px', originY: '86px' }}
          >
            <circle cx="160" cy="86" r="24" fill="#38BDF8" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />
            <path d="M 160 62 L 160 50 L 172 50 M 160 110 L 160 122 L 148 122" fill="none" stroke={accentColor} strokeWidth="2.2" />
          </motion.g>
          <DimLine x1="94" y1="156" x2="226" y2="156" label={active ? (isTr ? 'BUHAR İTKİSİ • MÖ/MS 1. YY' : 'AEOLIPILE • ~50 CE') : 'HERO STEAM TURBINE'} color={accentColor} />
        </g>
      );

    case 'history-08':
      // Human knocker-uppers window tapping pole
      return (
        <g>
          <rect x="188" y="42" width="56" height="62" rx="4" fill="#FDE68A" fillOpacity={active ? 0.45 : 0.18} stroke="currentColor" strokeWidth="2" />
          <line x1="216" y1="42" x2="216" y2="104" stroke="currentColor" strokeWidth="1.4" />
          <line x1="188" y1="73" x2="244" y2="73" stroke="currentColor" strokeWidth="1.4" />
          {/* Tapping pole */}
          <motion.line
            x1="86"
            y1="146"
            x2="188"
            y2="74"
            stroke={accentColor}
            strokeWidth="2.6"
            strokeLinecap="round"
            animate={shouldAnimate ? { rotate: active ? [-6, 4, -6] : 0 } : undefined}
            transition={{ duration: 0.7, repeat: Infinity }}
            style={{ originX: '86px', originY: '146px' }}
          />
          <DimLine x1="78" y1="156" x2="244" y2="156" label={active ? 'TAP-TAP! 05:30 AM' : '19TH-CENTURY ALARM'} color={accentColor} />
        </g>
      );

    case 'history-09':
      // 18th-century rented pineapple pedestal
      return (
        <g>
          <rect x="134" y="114" width="52" height="32" fill="none" stroke="currentColor" strokeWidth="2" />
          <ellipse cx="160" cy="86" rx="22" ry="28" fill="#FBBF24" fillOpacity="0.3" stroke="currentColor" strokeWidth="2" />
          <path d="M 146 62 L 154 42 L 160 56 L 166 40 L 174 62" fill="#10B981" fillOpacity="0.35" stroke="currentColor" strokeWidth="1.6" />
          <HotspotPin
            cx="196"
            cy="82"
            accentColor="#D97706"
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? (isTr ? 'GECELİK KİRA ≈ $8,000 BUGÜN' : 'RENTAL ≈ $8,000 TODAY') : 'STATUS SYMBOL'}
            align="left"
          />
        </g>
      );

    case 'history-10':
    default:
      // Piri Reis 1513 portolan compass rose & coastline
      return (
        <g>
          <InkPath d="M 78 46 Q 94 74 88 106 Q 108 134 94 148" stroke="#D97706" strokeWidth="2.4" shouldAnimate={shouldAnimate} />
          <circle cx="192" cy="90" r="34" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1="192" y1="90" x2="192" y2="52" stroke={accentColor} strokeOpacity="0.55" strokeWidth="1.2" transform={`rotate(${a} 192 90)`} />
          ))}
          <motion.polygon
            points="192,62 198,90 192,96 186,90"
            fill="#F43F5E"
            animate={{ rotate: active ? 25 : 0 }}
            style={{ originX: '192px', originY: '90px' }}
          />
          <DimLine x1="78" y1="156" x2="232" y2="156" label="PİRİ REİS • 1513 CE" color={accentColor} />
        </g>
      );
  }
}
