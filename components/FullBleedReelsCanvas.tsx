'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { CategoryId } from '@/types/fact';

interface FullBleedReelsCanvasProps {
  category: CategoryId;
  accentColor: string;
  isActive?: boolean;
  lang?: 'tr' | 'en';
  onInteract?: () => void;
}

type Particle = { x: number; y: number; vx: number; vy: number; r: number; a: number; life: number };

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');
  const full =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned.padEnd(6, '0').slice(0, 6);
  const num = Number.parseInt(full, 16);
  if (!Number.isFinite(num)) return { r: 129, g: 140, b: 248 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export default function FullBleedReelsCanvas({
  category,
  accentColor,
  isActive = true,
  lang = 'tr',
  onInteract,
}: FullBleedReelsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [boostUntil, setBoostUntil] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const particlesRef = useRef<Particle[]>([]);
  const ripplesRef = useRef<Array<{ x: number; y: number; t: number }>>([]);
  const tRef = useRef(0);
  const rafRef = useRef<number>(0);

  const spawnParticles = useCallback((w: number, h: number, count: number) => {
    const list: Particle[] = [];
    for (let i = 0; i < count; i += 1) {
      list.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        r: 0.8 + Math.random() * 2.4,
        a: 0.2 + Math.random() * 0.55,
        life: 0.4 + Math.random() * 0.6,
      });
    }
    particlesRef.current = list;
  }, []);

  useEffect(() => {
    if (!showHint) return;
    const tid = window.setTimeout(() => setShowHint(false), 4200);
    return () => window.clearTimeout(tid);
  }, [showHint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rgb = hexToRgb(accentColor);
    let running = true;
    let last = performance.now();

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      spawnParticles(rect.width, rect.height, reduceMotion ? 18 : 56);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const drawBackground = (w: number, h: number, t: number) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#050508');
      g.addColorStop(0.45, `rgba(${rgb.r},${rgb.g},${rgb.b},0.22)`);
      g.addColorStop(1, '#09090B');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // soft vignette
      const vg = ctx.createRadialGradient(w * 0.5, h * 0.35, h * 0.1, w * 0.5, h * 0.5, h * 0.85);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
    };

    const drawSpace = (w: number, h: number, t: number, speed: number) => {
      const cx = w * 0.52;
      const cy = h * 0.38;
      const planetR = Math.min(w, h) * 0.16;
      // orbit rings
      for (let i = 0; i < 3; i += 1) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * (0.12 + i * 0.04) * speed + i);
        ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.18 + i * 0.08})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, planetR * (1.55 + i * 0.42), planetR * (0.55 + i * 0.12), 0.35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      // planet
      const pg = ctx.createRadialGradient(cx - planetR * 0.3, cy - planetR * 0.3, planetR * 0.2, cx, cy, planetR);
      pg.addColorStop(0, `rgba(${Math.min(255, rgb.r + 40)},${Math.min(255, rgb.g + 40)},${Math.min(255, rgb.b + 60)},0.95)`);
      pg.addColorStop(1, `rgba(${rgb.r * 0.25},${rgb.g * 0.2},${rgb.b * 0.35},1)`);
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(cx, cy, planetR, 0, Math.PI * 2);
      ctx.fill();
      // atmosphere halo
      ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.35)`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, planetR + 8, 0, Math.PI * 2);
      ctx.stroke();
    };

    const drawNature = (w: number, h: number, t: number, speed: number) => {
      for (let layer = 0; layer < 3; layer += 1) {
        ctx.beginPath();
        const baseY = h * (0.55 + layer * 0.1);
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 8) {
          const y =
            baseY +
            Math.sin(x * 0.012 + t * (0.8 + layer * 0.25) * speed + layer) * (10 + layer * 6) +
            Math.sin(x * 0.03 - t * speed) * 4;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.08 + layer * 0.05})`;
        ctx.fill();
      }
    };

    const drawHuman = (w: number, h: number, t: number, speed: number) => {
      // EKG line
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.75)`;
      ctx.lineWidth = 2;
      const mid = h * 0.42;
      for (let x = 0; x <= w; x += 3) {
        const phase = (x / w) * Math.PI * 8 + t * 2.2 * speed;
        let y = mid + Math.sin(phase * 0.35) * 8;
        const beat = Math.abs(Math.sin(phase));
        if (beat > 0.92) y -= 28 * ((beat - 0.92) / 0.08);
        if (beat > 0.96) y += 18;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // organic net
      for (let i = 0; i < 8; i += 1) {
        const ax = w * (0.15 + (i % 4) * 0.22);
        const ay = h * (0.55 + Math.floor(i / 4) * 0.18);
        ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.2)`;
        ctx.beginPath();
        ctx.arc(ax, ay, 18 + Math.sin(t + i) * 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    const drawHistory = (w: number, h: number, t: number, speed: number) => {
      const cx = w * 0.5;
      const cy = h * 0.36;
      for (let i = 0; i < 5; i += 1) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * (0.15 + i * 0.05) * speed * (i % 2 === 0 ? 1 : -1));
        ctx.strokeStyle = `rgba(251, 191, 36,${0.18 + i * 0.08})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, 40 + i * 18, 0.2, Math.PI * 1.6);
        ctx.stroke();
        // tick marks
        for (let k = 0; k < 12; k += 1) {
          const a = (k / 12) * Math.PI * 2;
          const r = 40 + i * 18;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4));
          ctx.lineTo(Math.cos(a) * (r + 4), Math.sin(a) * (r + 4));
          ctx.stroke();
        }
        ctx.restore();
      }
    };

    const drawScience = (w: number, h: number, t: number, speed: number) => {
      const cx = w * 0.5;
      const cy = h * 0.4;
      // interference waves
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.15 + i * 0.05})`;
        for (let x = 0; x <= w; x += 4) {
          const y =
            cy +
            Math.sin(x * 0.02 + t * speed + i) * (20 + i * 8) +
            Math.sin(x * 0.05 - t * 1.4 * speed) * 10;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // molecule
      ctx.save();
      ctx.translate(cx, cy - 30);
      ctx.rotate(t * 0.4 * speed);
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        const x = Math.cos(a) * 36;
        const y = Math.sin(a) * 22;
        ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.45)`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.85)`;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawRecords = (w: number, h: number, t: number, speed: number) => {
      // kinetic crystal shards
      for (let i = 0; i < 12; i += 1) {
        const x = ((i * 97 + t * 30 * speed) % (w + 40)) - 20;
        const y = h * 0.25 + Math.sin(t * 0.8 + i) * h * 0.12 + (i % 4) * 40;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * 0.6 * speed + i);
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.25 + (i % 3) * 0.12})`;
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(10, 0);
        ctx.lineTo(0, 14);
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      drawScience(w, h, t, speed * 0.7);
    };

    const drawGeography = (w: number, h: number, t: number, speed: number) => {
      // night-map continents (abstract blobs)
      const blobs = [
        { x: 0.28, y: 0.34, rx: 0.16, ry: 0.1 },
        { x: 0.55, y: 0.4, rx: 0.22, ry: 0.12 },
        { x: 0.72, y: 0.32, rx: 0.12, ry: 0.09 },
        { x: 0.42, y: 0.55, rx: 0.14, ry: 0.08 },
      ];
      for (const b of blobs) {
        ctx.fillStyle = 'rgba(30, 58, 48, 0.55)';
        ctx.beginPath();
        ctx.ellipse(w * b.x, h * b.y, w * b.rx, h * b.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.25)`;
        ctx.stroke();
      }
      // neon arc Norway → Russia → NK (abstract path)
      const pts = [
        { x: w * 0.34, y: h * 0.28 },
        { x: w * 0.52, y: h * 0.3 },
        { x: w * 0.7, y: h * 0.36 },
      ];
      ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.85)`;
      ctx.shadowColor = `rgba(${rgb.r},${rgb.g},${rgb.b},0.9)`;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.quadraticCurveTo(w * 0.45, h * 0.18, pts[1].x, pts[1].y);
      ctx.quadraticCurveTo(w * 0.62, h * 0.22, pts[2].x, pts[2].y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      pts.forEach((p, i) => {
        const pulse = 0.5 + 0.5 * Math.sin(t * 3 * speed + i);
        ctx.fillStyle = `rgba(255,255,255,${0.55 + pulse * 0.4})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5 + pulse * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.7)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8 + pulse * 4, 0, Math.PI * 2);
        ctx.stroke();
      });
    };

    const tick = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const rect = wrap.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const boosting = now < boostUntil;
      const speed = reduceMotion ? 0.15 : boosting ? 2.4 : 1;
      tRef.current += dt * speed;
      const t = tRef.current;

      drawBackground(w, h, t);

      if (!reduceMotion || isActive) {
        switch (category) {
          case 'space':
            drawSpace(w, h, t, speed);
            break;
          case 'nature':
            drawNature(w, h, t, speed);
            break;
          case 'human_body':
            drawHuman(w, h, t, speed);
            break;
          case 'history':
            drawHistory(w, h, t, speed);
            break;
          case 'science':
            drawScience(w, h, t, speed);
            break;
          case 'records':
            drawRecords(w, h, t, speed);
            break;
          default:
            drawGeography(w, h, t, speed);
        }
        // geography neon arcs also for cold-weld / border-ish science cards: blend for science too sometimes
        if (category === 'science' && !reduceMotion) {
          // subtle extra particles only
        }
      } else {
        // static soft field when reduced motion
        drawSpace(w, h, 0, 0);
      }

      // particles
      for (const p of particlesRef.current) {
        p.x += p.vx * speed * (boosting ? 2 : 1);
        p.y += p.vy * speed * (boosting ? 2 : 1);
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${p.a * p.life})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // ripples
      ripplesRef.current = ripplesRef.current.filter((r) => now - r.t < 900);
      for (const r of ripplesRef.current) {
        const age = (now - r.t) / 900;
        ctx.strokeStyle = `rgba(255,255,255,${1 - age})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 12 + age * 70, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (isActive && !reduceMotion) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (isActive && reduceMotion) {
        // draw once-ish slowly
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    if (isActive) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      // paint one static frame
      const rect = wrap.getBoundingClientRect();
      drawBackground(rect.width, rect.height, 0);
    }

    return () => {
      running = false;
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [accentColor, boostUntil, category, isActive, reduceMotion, spawnParticles]);

  const handlePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isActive) return;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    ripplesRef.current.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, t: performance.now() });
    setBoostUntil(performance.now() + 1400);
    setShowHint(false);
    onInteract?.();
  };

  return (
    <div
      ref={wrapRef}
      data-testid="full-bleed-reels-canvas"
      data-category={category}
      onPointerDown={handlePointer}
      className="pointer-events-auto absolute inset-0 z-0 overflow-hidden"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      {showHint && isActive && !reduceMotion && (
        <div className="pointer-events-none absolute right-3 top-[112px] z-[5] rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-[10px] font-bold text-white/85 backdrop-blur-md">
          {lang === 'tr' ? 'Dokun & Hızlandır' : 'Tap & Boost'}
        </div>
      )}
    </div>
  );
}
