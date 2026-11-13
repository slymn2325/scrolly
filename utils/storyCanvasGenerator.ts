import { getCategoryMeta, type Language, translations } from '@/i18n/translations';
import type { CategoryId, FactCard } from '@/types/fact';
import {
  CATEGORY_ILLUSTRATION_MAP,
  loadImageElement,
  UI_ICON_PATHS,
} from '@/utils/icons8Assets';

export interface GeneratedCanvasAsset {
  blob: Blob;
  file: File;
  dataUrl: string;
}

const STORY_PALETTE: Record<
  CategoryId,
  { top: string; mid: string; bottom: string; orb1: string; orb2: string; badgeBg: string; badgeText: string }
> = {
  space: {
    top: '#1E1148',
    mid: '#31186E',
    bottom: '#140C2E',
    orb1: 'rgba(167, 139, 250, 0.35)',
    orb2: 'rgba(56, 189, 248, 0.25)',
    badgeBg: 'rgba(167, 139, 250, 0.26)',
    badgeText: '#EDE9FE',
  },
  nature: {
    top: '#0D3B38',
    mid: '#115E59',
    bottom: '#082221',
    orb1: 'rgba(52, 211, 153, 0.34)',
    orb2: 'rgba(45, 212, 191, 0.25)',
    badgeBg: 'rgba(52, 211, 153, 0.24)',
    badgeText: '#D1FAE5',
  },
  human_body: {
    top: '#4C132A',
    mid: '#7A1F42',
    bottom: '#250A17',
    orb1: 'rgba(251, 113, 133, 0.35)',
    orb2: 'rgba(251, 191, 36, 0.2)',
    badgeBg: 'rgba(251, 113, 133, 0.25)',
    badgeText: '#FFE4E6',
  },
  history: {
    top: '#432B0B',
    mid: '#784E14',
    bottom: '#221508',
    orb1: 'rgba(251, 191, 36, 0.32)',
    orb2: 'rgba(245, 158, 11, 0.22)',
    badgeBg: 'rgba(251, 191, 36, 0.24)',
    badgeText: '#FEF3C7',
  },
  science: {
    top: '#0D3256',
    mid: '#0E4E80',
    bottom: '#071B32',
    orb1: 'rgba(56, 189, 248, 0.35)',
    orb2: 'rgba(167, 139, 250, 0.24)',
    badgeBg: 'rgba(56, 189, 248, 0.24)',
    badgeText: '#E0F2FE',
  },
  records: {
    top: '#4A1245',
    mid: '#791D6E',
    bottom: '#230823',
    orb1: 'rgba(244, 114, 182, 0.35)',
    orb2: 'rgba(251, 191, 36, 0.22)',
    badgeBg: 'rgba(244, 114, 182, 0.24)',
    badgeText: '#FCE7F3',
  },
};

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        const dataUrl = canvas.toDataURL('image/png');
        const byteString = atob(dataUrl.split(',')[1]);
        const bytes = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i += 1) {
          bytes[i] = byteString.charCodeAt(i);
        }
        resolve(new Blob([bytes], { type: 'image/png' }));
      },
      'image/png',
      1
    );
  });
}

export async function generateStoryCardImage(
  fact: FactCard,
  lang: Language
): Promise<GeneratedCanvasAsset> {
  const width = 1080;
  const height = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D Canvas context unavailable');
  }

  const t = translations[lang];
  const catMeta = getCategoryMeta(fact.category);
  const palette = STORY_PALETTE[fact.category] ?? STORY_PALETTE.space;
  const localized = fact[lang];

  const [catImg, verifiedSealImg] = await Promise.all([
    loadImageElement(CATEGORY_ILLUSTRATION_MAP[fact.category] ?? catMeta.iconPath),
    loadImageElement(UI_ICON_PATHS.verifiedSeal),
  ]);

  // 1. Aurora Background Gradient (1080 x 1920)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, palette.top);
  bgGrad.addColorStop(0.52, palette.mid);
  bgGrad.addColorStop(1, palette.bottom);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Corner Glowing Geometric Light Rings & Ambient Orbs
  const drawGlow = (cx: number, cy: number, radius: number, color: string) => {
    const grad = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  };
  drawGlow(150, 260, 440, palette.orb1);
  drawGlow(930, 1580, 490, palette.orb2);

  // Subtle decorative orbital arcs
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(140, 200, 240, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(960, 1740, 290, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 3. Top Header Row: Left Category Pill (with local 3D icon) + Right Scrolly Brand Stamp
  const catLabelText = catMeta.label[lang].toUpperCase();
  ctx.font = '800 30px "Plus Jakarta Sans", system-ui, sans-serif';
  const catIconSpace = catImg ? 56 : 0;
  const catTextWithFallback = catImg ? catLabelText : `${fact.emoji ?? catMeta.emoji}  ${catLabelText}`;
  const catWidth = Math.max(280, ctx.measureText(catTextWithFallback).width + 72 + catIconSpace);

  drawRoundedRect(ctx, 72, 110, catWidth, 74, 37);
  ctx.fillStyle = palette.badgeBg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (catImg) {
    ctx.drawImage(catImg, 92, 122, 48, 48);
  }
  ctx.fillStyle = palette.badgeText;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(catTextWithFallback, catImg ? 152 : 108, 148);

  // Right Scrolly Brand Stamp (with verified 3D seal)
  const brandText = t.brandName;
  ctx.font = '800 32px "Fredoka", "Plus Jakarta Sans", system-ui, sans-serif';
  const sealSpace = verifiedSealImg ? 50 : 0;
  const brandW = ctx.measureText(brandText).width + 64 + sealSpace;
  const brandX = width - 72 - brandW;
  drawRoundedRect(ctx, brandX, 110, brandW, 74, 37);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fill();
  if (verifiedSealImg) {
    ctx.drawImage(verifiedSealImg, brandX + 20, 125, 44, 44);
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(brandText, brandX + (verifiedSealImg ? 74 : 29), 148);

  // 4. Center Frosted Glass Typography Card
  const cardX = 68;
  const cardY = 300;
  const cardW = width - 136;
  const cardH = 1230;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.32)';
  ctx.shadowBlur = 46;
  ctx.shadowOffsetY = 20;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 56);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.fill();
  ctx.restore();

  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 56);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.34)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Subtle Hero Watermark behind Card Center
  if (catImg) {
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.drawImage(catImg, width - 410, cardY + cardH - 420, 320, 320);
    ctx.restore();
  }

  // Large 3D Category Illustration inside Card Top
  ctx.save();
  drawRoundedRect(ctx, width / 2 - 84, cardY + 66, 168, 168, 84);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
  ctx.lineWidth = 3;
  ctx.stroke();
  if (catImg) {
    ctx.drawImage(catImg, width / 2 - 58, cardY + 92, 116, 116);
  } else {
    ctx.font = '74px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fact.emoji ?? catMeta.emoji, width / 2, cardY + 150);
  }
  ctx.restore();

  // Headline (word-wrapped)
  const textMaxW = cardW - 128;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 58px "Fredoka", "Plus Jakarta Sans", system-ui, sans-serif';
  const titleLines = wrapCanvasText(ctx, localized.title, textMaxW).slice(0, 4);

  let cursorY = cardY + 266;
  for (const line of titleLines) {
    ctx.fillText(line, width / 2, cursorY);
    cursorY += 74;
  }

  // Accent Divider
  cursorY += 24;
  drawRoundedRect(ctx, width / 2 - 64, cursorY, 128, 8, 4);
  ctx.fillStyle = fact.accentColor || '#FBBF24';
  ctx.fill();

  // Body Text (word-wrapped)
  cursorY += 54;
  ctx.font = '500 39px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  const bodyLines = wrapCanvasText(ctx, localized.factText, textMaxW).slice(0, 7);
  for (const line of bodyLines) {
    ctx.fillText(line, width / 2, cursorY);
    cursorY += 56;
  }

  // Source Hint Pill at Card Bottom
  const sourceLabel = `📚 ${localized.sourceHint}`;
  ctx.font = '700 26px "Plus Jakarta Sans", system-ui, sans-serif';
  const srcW = Math.min(textMaxW, ctx.measureText(sourceLabel).width + 64);
  const srcY = cardY + cardH - 110;
  drawRoundedRect(ctx, width / 2 - srcW / 2, srcY, srcW, 56, 28);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.textBaseline = 'middle';
  ctx.fillText(sourceLabel, width / 2, srcY + 29, srcW - 36);

  // 5. Bottom CTA Pill & Footer URL Band
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  drawRoundedRect(ctx, 88, 1608, width - 176, 108, 54);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fill();

  if (verifiedSealImg) {
    ctx.drawImage(verifiedSealImg, 120, 1637, 50, 50);
  }
  ctx.font = '800 32px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = '#1E1B2E';
  ctx.fillText(t.storyCtaLine, verifiedSealImg ? width / 2 + 16 : width / 2, 1663, width - 290);

  // Footer domain strip
  ctx.font = '700 30px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
  ctx.fillText('scrolly.live  •  TR | EN', width / 2, 1796);

  const dataUrl = canvas.toDataURL('image/png');
  const blob = await canvasToBlob(canvas);
  const file = new File([blob], `scrolly-story-${fact.id}.png`, { type: 'image/png' });

  return { blob, file, dataUrl };
}
