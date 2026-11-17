'use client';

import { useEffect, useRef } from 'react';
import { motionDurationMs } from '@/lib/motion';
import { usePrefersReducedMotion } from '@/components/onboarding/usePrefersReducedMotion';

const PARTICLE_COUNT = 24;
const SPRITES = [
  '/assets/fluent/party-popper.png',
  '/assets/fluent/confetti-ball.png',
  '/assets/fluent/glowing-star.png',
  '/assets/fluent/sparkles.png',
  '/assets/fluent/star.png',
  '/assets/fluent/wrapped-gift.png',
] as const;

interface ConfettiProps {
  active: boolean;
}

/** Confetti plays only when motion is allowed. The canvas is not mounted otherwise. */
export function shouldMountConfetti(reducedMotion: boolean, active: boolean): boolean {
  return active && !reducedMotion;
}

export default function Confetti({ active }: ConfettiProps) {
  const reduced = usePrefersReducedMotion();
  if (!shouldMountConfetti(reduced, active)) return null;
  return <ConfettiCanvas />;
}

function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const images = SPRITES.map((src) => {
      const image = new Image();
      image.src = src;
      return image;
    });

    const particles = Array.from({ length: PARTICLE_COUNT }, (_, index) => {
      const angle = -Math.PI / 2 + (index / PARTICLE_COUNT - 0.5) * 1.6;
      const speed = 280 + (index % 5) * 36;
      return {
        x: width * (0.18 + (index % 8) * 0.08),
        y: height * 0.42,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        spin: ((index % 7) - 3) * 0.4,
        sprite: index % images.length,
      };
    });

    const gravity = 980;
    const duration = motionDurationMs.confetti;
    const started = performance.now();
    let frame = 0;
    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) return;
      const elapsed = now - started;
      const t = Math.min(1, elapsed / duration);
      const seconds = elapsed / 1000;
      context.clearRect(0, 0, width, height);
      const fade = t > 0.72 ? 1 - (t - 0.72) / 0.28 : 1;
      particles.forEach((particle) => {
        const image = images[particle.sprite];
        if (!image || !image.complete || image.naturalWidth === 0) return;
        const x = particle.x + particle.vx * seconds;
        const y = particle.y + particle.vy * seconds + 0.5 * gravity * seconds * seconds;
        context.save();
        context.globalAlpha = Math.max(0, fade);
        context.translate(x, y);
        context.rotate(particle.spin * seconds);
        context.drawImage(image, -12, -12, 24, 24);
        context.restore();
      });
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="confetti-canvas"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-modal"
    />
  );
}
