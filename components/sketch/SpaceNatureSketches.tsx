'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { DimLine, type DomainSketchProps, HotspotPin, InkPath } from './SketchPrimitives';

export function SpaceNatureSketch({
  factId,
  lang,
  accentColor,
  active,
  shouldAnimate,
}: DomainSketchProps) {
  const isTr = lang === 'tr';

  switch (factId) {
    case 'space-01':
      // Venus retrograde 243d vs 225d solar orbit
      return (
        <g>
          <ellipse
            cx="155"
            cy="92"
            rx="105"
            ry="46"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.35"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
          {/* Sun center */}
          <circle cx="155" cy="92" r="18" fill="#F59E0B" fillOpacity="0.22" stroke="#F59E0B" strokeWidth="2" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line
              key={a}
              x1="155"
              y1="66"
              x2="155"
              y2="71"
              stroke="#F59E0B"
              strokeWidth="1.6"
              strokeLinecap="round"
              transform={`rotate(${a} 155 92)`}
            />
          ))}
          <text x="155" y="95" textAnchor="middle" fontSize="9" fontWeight="800" fill="currentColor">
            {isTr ? 'GÜNEŞ' : 'SUN'}
          </text>
          {/* Orbiting Venus sketch */}
          <motion.g
            animate={
              shouldAnimate
                ? { rotate: active ? [0, -360] : [0, 360] }
                : undefined
            }
            transition={{ duration: active ? 9 : 6, repeat: Infinity, ease: 'linear' }}
            style={{ originX: '155px', originY: '92px' }}
          >
            <circle cx="255" cy="92" r="15" fill={accentColor} fillOpacity="0.25" stroke={accentColor} strokeWidth="2" />
            <path d="M 245 86 Q 255 90 265 86 M 244 96 Q 255 100 266 96" stroke={accentColor} strokeWidth="1.4" fill="none" />
            {/* Retrograde axial spin arrow */}
            <path d="M 244 73 A 14 14 0 0 1 267 73" stroke="#F43F5E" strokeWidth="1.8" fill="none" />
            <polygon points="242,73 247,70 247,76" fill="#F43F5E" />
          </motion.g>
          <DimLine
            x1="48"
            y1="152"
            x2="262"
            y2="152"
            label={active ? (isTr ? 'EKSEN: 243 GÜN (TERS ↺)' : 'AXIS: 243d (RETROGRADE ↺)') : (isTr ? 'YÖRÜNGE: 225 GÜN' : 'ORBIT: 225 DAYS')}
            color={accentColor}
          />
          <HotspotPin
            cx="255"
            cy="64"
            accentColor={accentColor}
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? (isTr ? 'BATIDAN DOĞAR' : 'RISES WEST') : 'VENUS'}
            align="left"
          />
        </g>
      );

    case 'space-02':
      // Neutron star teaspoon balance scale
      return (
        <g>
          {/* Fulcrum & Beam */}
          <polygon points="160,126 146,154 174,154" fill="none" stroke="currentColor" strokeWidth="2" />
          <motion.g
            animate={{ rotate: active ? -16 : -6 }}
            transition={{ type: 'spring', stiffness: 180, damping: 14 }}
            style={{ originX: '160px', originY: '124px' }}
          >
            <line x1="64" y1="124" x2="256" y2="124" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            {/* Left Pan: Neutron Teaspoon */}
            <line x1="68" y1="124" x2="68" y2="146" stroke="currentColor" strokeWidth="1.4" />
            <path d="M 48 146 L 88 146 L 80 154 L 56 154 Z" fill={accentColor} fillOpacity="0.22" stroke={accentColor} strokeWidth="1.6" />
            {/* Spoon sketch */}
            <path d="M 54 114 Q 64 118 76 113 L 94 106" stroke={accentColor} strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <motion.circle
              cx="63"
              cy="111"
              r={active ? 6.5 : 4.5}
              fill={accentColor}
              animate={shouldAnimate ? { scale: [1, 1.25, 1] } : undefined}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ originX: '63px', originY: '111px' }}
            />
            {/* Right Pan: Everest mountain */}
            <line x1="252" y1="124" x2="252" y2="142" stroke="currentColor" strokeWidth="1.4" />
            <path d="M 226 142 L 246 106 L 258 122 L 266 112 L 280 142 Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </motion.g>
          <text x="64" y="42" textAnchor="middle" fontSize="9.5" fontWeight="800" fill={accentColor}>
            {isTr ? '1 ÇAY KAŞIĞI' : '1 TEASPOON'}
          </text>
          <text x="64" y="54" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="currentColor">
            {active ? '≈ 4×10⁹ TON!' : '10¹⁵ g/cm³'}
          </text>
          <HotspotPin
            cx="250"
            cy="88"
            accentColor="#F59E0B"
            active={active}
            shouldAnimate={shouldAnimate}
            label={isTr ? 'EVEREST ×1000' : 'MT EVEREST ×1000'}
            align="left"
          />
        </g>
      );

    case 'space-03':
      // Neptune & Uranus diamond rain chamber
      return (
        <g>
          <InkPath
            d="M 42 54 Q 78 36 118 46 Q 156 32 198 46 Q 242 36 278 56 Q 268 74 232 72 Q 160 80 88 72 Q 48 74 42 54 Z"
            stroke="#0284C7"
            fill="#38BDF8"
            shouldAnimate={shouldAnimate}
          />
          <text x="160" y="58" textAnchor="middle" fontSize="9" fontWeight="800" fill="currentColor">
            CH₄ + H₂ ({active ? '200+ GPa' : isTr ? 'YÜKSEK BASINÇ' : 'EXTREME PRESSURE'})
          </text>
          {[
            { x: 96, y: 102, d: 0 },
            { x: 140, y: 118, d: 0.4 },
            { x: 184, y: 100, d: 0.8 },
            { x: 224, y: 120, d: 0.2 },
          ].map((dm, idx) => (
            <motion.g
              key={idx}
              animate={shouldAnimate ? { y: active ? [0, 32, 0] : [0, 14, 0], opacity: [0.6, 1, 0.6] } : undefined}
              transition={{ duration: active ? 1.5 : 2.6, repeat: Infinity, delay: dm.d }}
            >
              <polygon
                points={`${dm.x},${dm.y - 11} ${dm.x + 9},${dm.y - 3} ${dm.x},${dm.y + 11} ${dm.x - 9},${dm.y - 3}`}
                fill="#38BDF8"
                fillOpacity="0.28"
                stroke={accentColor}
                strokeWidth="1.7"
              />
              <line x1={dm.x - 9} y1={dm.y - 3} x2={dm.x + 9} y2={dm.y - 3} stroke={accentColor} strokeWidth="1.1" />
            </motion.g>
          ))}
          <DimLine x1="72" y1="156" x2="248" y2="156" label={active ? 'C → ELMAS / DIAMOND' : '~5000 K MANTLE'} color={accentColor} />
        </g>
      );

    case 'space-04':
      // Moon footprints in 0 atm vacuum
      return (
        <g>
          {/* Regolith horizon */}
          <InkPath d="M 28 134 Q 95 126 160 134 Q 225 142 292 132" stroke="currentColor" strokeWidth="2" shouldAnimate={shouldAnimate} />
          {/* Hatch lines below soil */}
          {[42, 74, 106, 138, 170, 202, 234, 266].map((hx) => (
            <line key={hx} x1={hx} y1="138" x2={hx - 8} y2="150" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.2" />
          ))}
          {/* Bootprint tread top-down / isometric sketch */}
          <g transform="translate(118, 52)">
            <ellipse cx="42" cy="36" rx="34" ry="20" fill={accentColor} fillOpacity={active ? 0.25 : 0.14} stroke={accentColor} strokeWidth="2" />
            {[20, 28, 36, 44, 52, 60].map((lx) => (
              <line key={lx} x1={lx} y1="22" x2={lx} y2="50" stroke={accentColor} strokeWidth="1.8" strokeDasharray="3 2" />
            ))}
          </g>
          <HotspotPin
            cx="215"
            cy="52"
            accentColor="#10B981"
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? (isTr ? 'EROZYON = 0' : 'EROSION = 0') : 'P = 0 atm'}
            align="left"
          />
          <DimLine x1="88" y1="158" x2="232" y2="158" label={active ? (isTr ? '10+ MİLYON YIL KALICI' : '10M+ YEARS INTACT') : 'APOLLO 11 / 1969'} color={accentColor} />
        </g>
      );

    case 'space-05':
      // Sun holds 99.86% of Solar System mass
      return (
        <g>
          <motion.circle
            cx="126"
            cy="88"
            r={active ? 54 : 48}
            fill="#F59E0B"
            fillOpacity="0.24"
            stroke="#F59E0B"
            strokeWidth="2.4"
            strokeDasharray="6 3"
            animate={shouldAnimate ? { rotate: 360 } : undefined}
            transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
            style={{ originX: '126px', originY: '88px' }}
          />
          <text x="126" y="86" textAnchor="middle" fontSize="14" fontWeight="900" fill="currentColor">
            99.86%
          </text>
          <text x="126" y="100" textAnchor="middle" fontSize="8" fontWeight="700" fill="currentColor">
            {isTr ? 'GÜNEŞ KÜTLESİ' : 'SOLAR MASS'}
          </text>
          {/* Tiny 0.14% slice magnification */}
          <line x1="184" y1="88" x2="238" y2="88" stroke="currentColor" strokeDasharray="3 2" strokeWidth="1.3" />
          <circle cx="256" cy="88" r={active ? 16 : 9} fill={accentColor} fillOpacity="0.22" stroke={accentColor} strokeWidth="1.8" />
          <circle cx="252" cy="86" r="2.5" fill={accentColor} />
          <circle cx="261" cy="91" r="1.5" fill="#3B82F6" />
          <HotspotPin
            cx="256"
            cy="64"
            accentColor={accentColor}
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? (isTr ? 'TÜM GEZEGENLER: %0.14' : 'ALL PLANETS: 0.14%') : '0.14%'}
            align="left"
          />
        </g>
      );

    case 'space-06':
      // Cold welding in space vacuum
      return (
        <g>
          <motion.g animate={{ x: active ? 22 : 0 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
            <rect x="64" y="54" width="66" height="58" rx="8" fill={accentColor} fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />
            <text x="97" y="86" textAnchor="middle" fontSize="10" fontWeight="800" fill="currentColor">Fe / Cu</text>
          </motion.g>
          <motion.g animate={{ x: active ? -22 : 0 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
            <rect x="190" y="54" width="66" height="58" rx="8" fill={accentColor} fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />
            <text x="223" y="86" textAnchor="middle" fontSize="10" fontWeight="800" fill="currentColor">Fe / Cu</text>
          </motion.g>
          {active && (
            <motion.path
              d="M 152 62 L 166 74 L 154 84 L 168 96 L 154 106"
              stroke="#F59E0B"
              strokeWidth="2.5"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
            />
          )}
          <DimLine
            x1="92"
            y1="142"
            x2="228"
            y2="142"
            label={active ? (isTr ? 'SOĞUK KAYNAK: ATOMİK BAĞ' : 'COLD WELD: FUSED LATTICE') : (isTr ? 'OKSİT TABAKASI YOK' : 'NO OXIDE LAYER')}
            color={accentColor}
          />
        </g>
      );

    case 'space-07':
      // Sagittarius B2 raspberry cloud molecule
      return (
        <g>
          <InkPath
            d="M 66 96 Q 60 64 94 56 Q 114 34 152 44 Q 190 32 216 58 Q 254 62 252 94 Q 258 126 218 130 Q 156 142 98 128 Q 62 126 66 96 Z"
            stroke={accentColor}
            fill={accentColor}
            shouldAnimate={shouldAnimate}
          />
          {/* Chemical skeleton HCOOC2H5 */}
          <g stroke="currentColor" strokeWidth="1.8">
            <line x1="126" y1="88" x2="152" y2="74" />
            <line x1="152" y1="74" x2="178" y2="88" />
            <line x1="178" y1="88" x2="204" y2="74" />
            <circle cx="126" cy="88" r="5" fill="#F43F5E" />
            <circle cx="152" cy="74" r="5" fill={accentColor} />
            <circle cx="178" cy="88" r="5" fill="#F43F5E" />
            <circle cx="204" cy="74" r="5" fill={accentColor} />
          </g>
          <HotspotPin
            cx="162"
            cy="52"
            accentColor="#F43F5E"
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? (isTr ? 'ETİL FORMAT (AHUDUDU)' : 'ETHYL FORMATE') : 'C₃H₆O₂'}
            align="top"
          />
          <DimLine x1="78" y1="154" x2="242" y2="154" label="SAGITTARIUS B2 • 26,000 ly" color={accentColor} />
        </g>
      );

    case 'space-08':
      // Saturn floats in water (0.687 g/cm3)
      return (
        <g>
          {/* Giant beaker tank */}
          <path d="M 64 46 L 64 148 L 256 148 L 256 46" fill="none" stroke="currentColor" strokeWidth="2.2" />
          {/* Water wave */}
          <path d="M 66 96 Q 98 88 130 96 Q 162 104 194 96 Q 226 88 254 96 L 254 146 L 66 146 Z" fill="#0EA5E9" fillOpacity="0.2" stroke="#0EA5E9" strokeWidth="1.8" />
          {/* Saturn bobbing */}
          <motion.g
            animate={{ y: active ? [0, -8, 0] : [0, -3, 0], rotate: active ? -8 : -4 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: '160px', originY: '84px' }}
          >
            <circle cx="160" cy="84" r="24" fill="#FDE68A" stroke="currentColor" strokeWidth="2" />
            <ellipse cx="160" cy="84" rx="48" ry="11" fill="none" stroke={accentColor} strokeWidth="2.4" />
          </motion.g>
          <HotspotPin
            cx="228"
            cy="64"
            accentColor={accentColor}
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? 'ρ = 0.687 < H₂O (1.0)' : 'ρ = 0.687 g/cm³'}
            align="left"
          />
        </g>
      );

    case 'space-09':
      // Mars blue sunset Mie scattering
      return (
        <g>
          <path d="M 30 136 Q 160 122 290 136" stroke="#D97706" strokeWidth="2.2" fill="none" />
          <motion.circle
            cx="160"
            cy={active ? 116 : 96}
            r="20"
            fill={active ? '#38BDF8' : '#BAE6FD'}
            fillOpacity="0.45"
            stroke="#0284C7"
            strokeWidth="2"
            transition={{ type: 'spring', stiffness: 180 }}
          />
          {/* Sun rays */}
          {[-28, -14, 0, 14, 28].map((dx, i) => (
            <line
              key={i}
              x1={160 + dx}
              y1="66"
              x2={160 + dx * 1.8}
              y2="42"
              stroke={i % 2 === 0 ? '#0284C7' : '#D97706'}
              strokeWidth="1.6"
              strokeDasharray={i % 2 === 0 ? undefined : '3 3'}
            />
          ))}
          <HotspotPin
            cx="160"
            cy="52"
            accentColor="#0284C7"
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? (isTr ? 'MİE SAÇILMASI: MAVİ' : 'MIE SCATTER: BLUE') : 'MARS Fe₂O₃'}
            align="top"
          />
          <DimLine x1="80" y1="154" x2="240" y2="154" label={isTr ? 'GÜN BATIMI ~MAVİ HALO' : 'BLUE HORIZON HALO'} color="#0284C7" />
        </g>
      );

    case 'space-10':
      // Voyager 1 24 Billion km telemetry
      return (
        <g>
          {/* Earth dish left */}
          <path d="M 46 122 A 22 22 0 0 1 78 90" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <circle cx="52" cy="128" r="10" fill="#3B82F6" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.8" />
          {/* Voyager probe right */}
          <g transform="translate(232, 60)">
            <ellipse cx="22" cy="22" rx="18" ry="10" fill="none" stroke={accentColor} strokeWidth="2" transform="rotate(-30 22 22)" />
            <line x1="22" y1="22" x2="48" y2="42" stroke="currentColor" strokeWidth="1.6" />
            <line x1="22" y1="22" x2="-4" y2="36" stroke="currentColor" strokeWidth="1.6" />
          </g>
          {/* Radio waves */}
          {[0, 1, 2].map((w) => (
            <motion.path
              key={w}
              d={`M ${100 + w * 32} ${104 - w * 8} Q ${112 + w * 32} ${86 - w * 8} ${102 + w * 32} ${70 - w * 8}`}
              fill="none"
              stroke={accentColor}
              strokeWidth="2"
              animate={shouldAnimate ? { opacity: active ? [0.2, 1, 0.2] : [0.4, 0.9, 0.4] } : undefined}
              transition={{ duration: 1.4, repeat: Infinity, delay: w * 0.25 }}
            />
          ))}
          <DimLine
            x1="56"
            y1="154"
            x2="256"
            y2="154"
            label={active ? (isTr ? '22+ SAAT IŞIK HIZI SİNYALİ' : '22+ HRS AT LIGHT SPEED') : '24,000,000,000+ KM'}
            color={accentColor}
          />
        </g>
      );

    case 'nature-01':
      // Octopus: 3 hearts + Cu blue blood
      return (
        <g>
          <InkPath
            d="M 118 76 C 114 42 152 34 152 64 C 152 78 134 84 128 84 M 118 82 Q 86 108 66 132 Q 74 142 94 120 M 126 86 Q 112 122 104 146 M 136 86 Q 154 122 162 146 M 144 82 Q 178 106 196 130"
            stroke="currentColor"
            fill={accentColor}
            shouldAnimate={shouldAnimate}
          />
          {/* 3 pulsating hearts */}
          {[
            { cx: 128, cy: 56, main: true },
            { cx: 118, cy: 70, main: false },
            { cx: 140, cy: 70, main: false },
          ].map((h, i) => (
            <motion.circle
              key={i}
              cx={h.cx}
              cy={h.cy}
              r={h.main ? 6 : 4.5}
              fill="#0284C7"
              stroke="#FFFFFF"
              strokeWidth="1.2"
              animate={shouldAnimate ? { scale: active ? [1, 1.4, 1] : [1, 1.2, 1] } : undefined}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
              style={{ originX: `${h.cx}px`, originY: `${h.cy}px` }}
            />
          ))}
          <HotspotPin
            cx="210"
            cy="68"
            accentColor="#0284C7"
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? (isTr ? '3 KALP • Cu MAVİ KAN' : '3 HEARTS • Cu BLOOD') : '3× ♥ + Hemosiyanin'}
            align="left"
          />
        </g>
      );

    case 'nature-02':
      // Wood Wide Web forest tree roots mycorrhizal signals
      return (
        <g>
          {/* Two trees */}
          <path d="M 96 110 L 96 72 M 96 74 L 74 52 L 118 52 Z" stroke="currentColor" strokeWidth="2" fill={accentColor} fillOpacity="0.2" />
          <path d="M 224 110 L 224 64 M 224 68 L 198 42 L 250 42 Z" stroke="currentColor" strokeWidth="2" fill={accentColor} fillOpacity="0.2" />
          {/* Soil horizon */}
          <line x1="36" y1="110" x2="284" y2="110" stroke="currentColor" strokeWidth="1.6" />
          {/* Underground fungal hyphae */}
          <InkPath
            d="M 96 110 C 110 144 148 134 160 132 C 178 130 208 144 224 110"
            stroke="#F59E0B"
            strokeWidth="2.2"
            dash="4 3"
            shouldAnimate={shouldAnimate}
          />
          <motion.circle
            cx="110"
            cy="130"
            r="4"
            fill="#10B981"
            animate={shouldAnimate ? { cx: [100, 160, 220], cy: [116, 132, 116] } : undefined}
            transition={{ duration: active ? 1.4 : 2.6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <DimLine
            x1="96"
            y1="156"
            x2="224"
            y2="156"
            label={active ? (isTr ? 'KARBON & UYARI TRANSFERİ' : 'CARBON & WARNING SIGNAL') : 'WOOD WIDE WEB'}
            color="#059669"
          />
        </g>
      );

    case 'nature-03':
      // Sharks (400M yrs) vs Trees (350M) vs Saturn Rings (100M)
      return (
        <g>
          {/* Shark dorsal sketch */}
          <InkPath
            d="M 52 72 Q 108 46 164 68 L 182 44 L 194 70 Q 238 72 264 60 L 248 80 L 266 96 Q 218 88 164 92 Q 106 94 52 72 Z"
            stroke="currentColor"
            fill={accentColor}
            shouldAnimate={shouldAnimate}
          />
          <DimLine x1="48" y1="122" x2="272" y2="122" label={active ? '400M+ YIL (SHARKS)' : 'DEVONIAN (~400M YIL)'} color={accentColor} />
          <DimLine x1="100" y1="146" x2="272" y2="146" label={active ? (isTr ? 'AĞAÇLAR: 350M • SATÜRN: ~100M' : 'TREES: 350M • RINGS: ~100M') : 'TIMELINE CALIPER'} color="currentColor" />
        </g>
      );

    case 'nature-04':
      // Honeybee recognizing human face mosaic
      return (
        <g>
          {/* Bee sketch left */}
          <ellipse cx="86" cy="88" rx="22" ry="14" fill="#FBBF24" fillOpacity="0.3" stroke="currentColor" strokeWidth="2" />
          <line x1="80" y1="75" x2="80" y2="101" stroke="currentColor" strokeWidth="2" />
          <line x1="92" y1="75" x2="92" y2="101" stroke="currentColor" strokeWidth="2" />
          <ellipse cx="88" cy="68" rx="10" ry="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
          {/* Scan beam */}
          <line x1="112" y1="88" x2="188" y2="62" stroke={accentColor} strokeDasharray="4 3" strokeWidth="1.5" />
          <line x1="112" y1="88" x2="188" y2="114" stroke={accentColor} strokeDasharray="4 3" strokeWidth="1.5" />
          {/* Face landmark sketch grid right */}
          <circle cx="222" cy="88" r="28" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="212" cy="80" r="3" fill={accentColor} />
          <circle cx="232" cy="80" r="3" fill={accentColor} />
          <path d="M 212 98 Q 222 106 232 98" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <HotspotPin
            cx="222"
            cy="52"
            accentColor={accentColor}
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? (isTr ? 'EŞLEŞTİRME: %90+' : 'MATCH: 90%+') : 'FACE PATTERN'}
            align="left"
          />
        </g>
      );

    case 'nature-05':
      // Flamingo grey -> pink via beta-carotene
      return (
        <g>
          <InkPath
            d="M 118 148 L 118 106 M 118 112 Q 148 112 152 94 Q 152 72 130 74 Q 112 76 112 52 Q 114 34 128 38 Q 138 40 144 48 L 136 52"
            stroke="currentColor"
            fill={active ? '#F43F5E' : '#94A3B8'}
            fillOpacity={0.35}
            shouldAnimate={shouldAnimate}
          />
          <HotspotPin
            cx="190"
            cy="72"
            accentColor={active ? '#F43F5E' : '#64748B'}
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? (isTr ? 'BETA-KAROTEN → PEMBE' : 'BETA-CAROTENE → PINK') : (isTr ? 'DOĞUŞTA GRİ' : 'BORN GREY')}
            align="left"
          />
          <DimLine x1="76" y1="158" x2="244" y2="158" label="PIGMENT FILTER" color={accentColor} />
        </g>
      );

    case 'nature-06':
      // Koala fingerprint whorls vs human
      return (
        <g>
          {[96, 224].map((cx, side) => (
            <g key={cx}>
              {[12, 20, 28, 36].map((r, i) => (
                <motion.circle
                  key={r}
                  cx={cx}
                  cy="86"
                  r={r}
                  fill="none"
                  stroke={side === 0 ? accentColor : 'currentColor'}
                  strokeWidth="1.6"
                  strokeDasharray={`${8 + i * 3} 4`}
                  animate={shouldAnimate && active ? { rotate: side === 0 ? 15 : -15 } : undefined}
                  transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse' }}
                  style={{ originX: `${cx}px`, originY: '86px' }}
                />
              ))}
              <text x={cx} y="136" textAnchor="middle" fontSize="9" fontWeight="800" fill="currentColor">
                {side === 0 ? 'KOALA' : (isTr ? 'İNSAN / HUMAN' : 'HUMAN')}
              </text>
            </g>
          ))}
          <text x="160" y="90" textAnchor="middle" fontSize="14" fontWeight="900" fill={accentColor}>
            ≈
          </text>
          <DimLine x1="96" y1="154" x2="224" y2="154" label={active ? (isTr ? 'MİKROSKOPİK EŞLEŞME' : 'MICROSCOPIC MATCH') : 'LOOP / WHORL'} color={accentColor} />
        </g>
      );

    case 'nature-07':
      // Dolphin signature whistle acoustics
      return (
        <g>
          <InkPath
            d="M 52 94 Q 94 56 146 72 Q 168 58 176 74 Q 204 82 222 72 L 210 92 L 224 106 Q 178 96 142 104 Q 92 112 52 94 Z"
            stroke="currentColor"
            fill={accentColor}
            shouldAnimate={shouldAnimate}
          />
          <motion.path
            d="M 176 48 Q 202 36 226 50 T 274 44"
            fill="none"
            stroke={accentColor}
            strokeWidth="2.2"
            animate={shouldAnimate ? { pathLength: [0.2, 1, 0.2] } : undefined}
            transition={{ duration: active ? 1.1 : 2.2, repeat: Infinity }}
          />
          <HotspotPin
            cx="210"
            cy="54"
            accentColor={accentColor}
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? (isTr ? 'ÖZEL İSİM ISLIĞI' : 'SIGNATURE WHISTLE') : '8–20 kHz ID'}
            align="top"
          />
        </g>
      );

    case 'nature-08':
      // Sea otters holding paws in current
      return (
        <g>
          <path d="M 32 118 Q 96 106 160 118 Q 224 130 288 118" stroke="#0EA5E9" strokeWidth="2" fill="none" />
          <ellipse cx="112" cy="90" rx="34" ry="18" fill={accentColor} fillOpacity="0.2" stroke="currentColor" strokeWidth="1.8" />
          <ellipse cx="208" cy="90" rx="34" ry="18" fill={accentColor} fillOpacity="0.2" stroke="currentColor" strokeWidth="1.8" />
          <motion.path
            d="M 142 94 Q 160 80 178 94"
            stroke="#F43F5E"
            strokeWidth="3"
            fill="none"
            animate={{ scale: active ? 1.15 : 1 }}
            style={{ originX: '160px', originY: '88px' }}
          />
          <DimLine x1="112" y1="148" x2="208" y2="148" label={active ? (isTr ? 'EL ELE KENETLENME' : 'PAW-LOCK VECTOR') : 'KELP RAFT'} color="#0284C7" />
        </g>
      );

    case 'nature-09':
      // Giant Armillaria underground fungus (9.6 km2)
      return (
        <g>
          <rect x="64" y="42" width="192" height="92" rx="12" fill={accentColor} fillOpacity="0.1" stroke="currentColor" strokeWidth="1.8" strokeDasharray="5 3" />
          <InkPath
            d="M 88 92 Q 124 62 162 84 Q 204 58 232 96 Q 198 118 156 108 Q 112 122 88 92 Z"
            stroke={accentColor}
            fill={accentColor}
            shouldAnimate={shouldAnimate}
          />
          <HotspotPin
            cx="162"
            cy="84"
            accentColor={accentColor}
            active={active}
            shouldAnimate={shouldAnimate}
            label={active ? '9.6 km² (1,665 SAHA)' : 'ARMILLARIA OSTOYAE'}
            align="top"
          />
          <DimLine x1="64" y1="152" x2="256" y2="152" label={isTr ? 'TEK MİSELYUM ORGANİZMASI' : 'SINGLE MYCELIUM NETWORK'} color={accentColor} />
        </g>
      );

    case 'nature-10':
    default:
      // Saguaro cactus accordion pleats water expansion
      return (
        <g>
          <motion.g animate={{ scaleX: active ? 1.24 : 1 }} transition={{ type: 'spring', stiffness: 180 }} style={{ originX: '160px', originY: '100px' }}>
            <rect x="140" y="42" width="40" height="106" rx="18" fill="#10B981" fillOpacity="0.22" stroke="currentColor" strokeWidth="2" />
            <path d="M 140 88 L 114 88 L 114 64" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 180 96 L 206 96 L 206 72" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
            {[152, 160, 168].map((px) => (
              <line key={px} x1={px} y1="48" x2={px} y2="144" stroke="#059669" strokeWidth="1.2" strokeDasharray="4 2" />
            ))}
          </motion.g>
          <DimLine x1="110" y1="158" x2="210" y2="158" label={active ? (isTr ? 'SU DOLU (+5,000 LİTRE)' : 'EXPANDED (+5,000 L)') : (isTr ? 'AKORDEON KIVRIMLAR' : 'ACCORDION PLEATS')} color="#059669" />
        </g>
      );
  }
}
