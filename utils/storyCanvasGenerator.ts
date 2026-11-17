import { getCategoryMeta, type Language, translations } from '@/i18n/translations';
import { detectMediaProvider } from '@/lib/mediaProvider';
import type { CategoryId, FactCard } from '@/types/fact';
import { staticPosterUrl } from '@/utils/cardMediaUrl';
import { getFactPrimarySlug } from '@/utils/factsData';
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

export interface ProxiedMediaFileResult {
  blob: Blob;
  file: File;
  objectUrl: string;
  filename: string;
  mimeType: string;
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
  statistics: {
    top: '#171C54',
    mid: '#312E81',
    bottom: '#0C0F32',
    orb1: 'rgba(99, 102, 241, 0.36)',
    orb2: 'rgba(34, 211, 238, 0.26)',
    badgeBg: 'rgba(99, 102, 241, 0.26)',
    badgeText: '#E0E7FF',
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

function drawBrandMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
  gradient.addColorStop(0, '#6B4BFF');
  gradient.addColorStop(1, '#FF7A59');
  ctx.save();
  drawRoundedRect(ctx, x, y, size, size, size * 0.22);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  drawRoundedRect(ctx, x + size * 0.18, y + size * 0.22, size * 0.58, size * 0.16, size * 0.06);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, x + size * 0.26, y + size * 0.44, size * 0.52, size * 0.22, size * 0.06);
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + size * 0.22, y + size * 0.8);
  ctx.quadraticCurveTo(x + size * 0.55, y + size * 0.42, x + size * 0.82, y + size * 0.2);
  ctx.stroke();
  ctx.restore();
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

function isGiphyHost(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    return (
      parsed.protocol === 'https:' &&
      (host === 'giphy.com' || host.endsWith('.giphy.com'))
    );
  } catch {
    return false;
  }
}

export function buildMediaProxyUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/api/media-proxy')) {
    return trimmed;
  }
  return `/api/media-proxy?url=${encodeURIComponent(trimmed)}`;
}

function loadCanvasImageWithTimeout(
  src: string | null | undefined,
  timeoutMs = 6000
): Promise<HTMLImageElement | null> {
  if (typeof window === 'undefined' || !src) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (img: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(img);
    };
    const timer = window.setTimeout(() => finish(null), timeoutMs);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => finish(img);
    img.onerror = () => finish(null);
    img.src = src;
  });
}

function resolveExtensionAndMime(
  contentTypeHeader: string | null,
  blobType: string,
  sourceUrl: string
): { ext: 'gif' | 'webp' | 'mp4'; mimeType: string } {
  const cleanHeader = (contentTypeHeader || blobType || '').split(';')[0].trim().toLowerCase();
  if (cleanHeader === 'image/webp' || /\.webp(?:\?|$)/i.test(sourceUrl)) {
    return { ext: 'webp', mimeType: 'image/webp' };
  }
  if (cleanHeader === 'video/mp4' || /\.mp4(?:\?|$)/i.test(sourceUrl)) {
    return { ext: 'mp4', mimeType: 'video/mp4' };
  }
  return { ext: 'gif', mimeType: cleanHeader === 'image/gif' || !cleanHeader ? 'image/gif' : cleanHeader };
}

export async function fetchProxiedMediaFile(
  gifUrl: string,
  fileSlug: string
): Promise<ProxiedMediaFileResult> {
  const trimmed = (gifUrl || '').trim();
  if (!trimmed) {
    throw new Error('Missing GIF URL');
  }
  const proxyUrl = trimmed.startsWith('/') && !trimmed.startsWith('/api/media-proxy')
    ? trimmed
    : buildMediaProxyUrl(trimmed);
  const res = await fetch(proxyUrl);
  if (!res.ok) {
    throw new Error(`Media proxy failed with status ${res.status}`);
  }
  const blob = await res.blob();
  const { ext, mimeType } = resolveExtensionAndMime(
    res.headers.get('content-type'),
    blob.type,
    trimmed
  );
  const safeSlug =
    (fileSlug || 'fact')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'fact';
  const filename = `scrolly-${safeSlug}.${ext}`;
  const file = new File([blob], filename, { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  return { blob, file, objectUrl, filename, mimeType };
}

function drawStoryTextBlock(
  ctx: CanvasRenderingContext2D,
  options: {
    canvasWidth: number;
    textMaxWidth: number;
    startY: number;
    maxBottomY: number;
    title: string;
    factText: string;
    accentColor: string;
    titleFontSize: number;
    titleLineHeight: number;
    maxTitleLines: number;
    bodyFontSize: number;
    bodyLineHeight: number;
    maxBodyLinesCap: number;
    dividerWidth: number;
    dividerTopGap: number;
    dividerBottomGap: number;
  }
): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 ${options.titleFontSize}px "Fredoka", "Plus Jakarta Sans", system-ui, sans-serif`;
  const titleLines = wrapCanvasText(ctx, options.title, options.textMaxWidth).slice(
    0,
    options.maxTitleLines
  );

  let y = options.startY;
  for (const line of titleLines) {
    ctx.fillText(line, options.canvasWidth / 2, y);
    y += options.titleLineHeight;
  }

  y += options.dividerTopGap;
  drawRoundedRect(
    ctx,
    options.canvasWidth / 2 - options.dividerWidth / 2,
    y,
    options.dividerWidth,
    8,
    4
  );
  ctx.fillStyle = options.accentColor || '#FBBF24';
  ctx.fill();

  y += options.dividerBottomGap;
  ctx.font = `500 ${options.bodyFontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  const fitLines = Math.max(2, Math.floor((options.maxBottomY - y) / options.bodyLineHeight));
  const bodyLines = wrapCanvasText(ctx, options.factText, options.textMaxWidth).slice(
    0,
    Math.min(options.maxBodyLinesCap, fitLines)
  );
  for (const line of bodyLines) {
    ctx.fillText(line, options.canvasWidth / 2, y);
    y += options.bodyLineHeight;
  }
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
  const rawGifUrl = fact.gifUrl?.trim() || '';
  const posterStill = staticPosterUrl(rawGifUrl, fact.posterUrl);
  const proxiedGifUrl = rawGifUrl
    ? isGiphyHost(rawGifUrl)
      ? buildMediaProxyUrl(rawGifUrl)
      : rawGifUrl.startsWith('/')
        ? rawGifUrl
        : null
    : null;
  const loadableGifUrl =
    proxiedGifUrl && !/\.mp4(?:\?|$)/i.test(rawGifUrl) ? proxiedGifUrl : null;
  const heroSrc = posterStill || loadableGifUrl;

  const [catImg, verifiedSealImg, gifImg] = await Promise.all([
    loadImageElement(CATEGORY_ILLUSTRATION_MAP[fact.category] ?? catMeta.iconPath),
    loadImageElement(UI_ICON_PATHS.verifiedSeal),
    loadCanvasImageWithTimeout(heroSrc, 6000),
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

  // 3. Top Header Row: Left Category Pill + Right Scrolly Brand Stamp
  const catLabelText = catMeta.label[lang].toUpperCase();
  ctx.font = '800 30px "Plus Jakarta Sans", system-ui, sans-serif';
  const catIconSpace = catImg ? 56 : 0;
  const catTextWithFallback = catImg ? catLabelText : `${fact.emoji ?? catMeta.emoji}  ${catLabelText}`;
  const catWidth = Math.max(280, ctx.measureText(catTextWithFallback).width + 72 + catIconSpace);

  drawRoundedRect(ctx, 72, 92, catWidth, 74, 37);
  ctx.fillStyle = palette.badgeBg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (catImg) {
    ctx.drawImage(catImg, 92, 104, 48, 48);
  }
  ctx.fillStyle = palette.badgeText;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(catTextWithFallback, catImg ? 152 : 108, 130);

  // Right Scrolly brand stamp
  const brandText = t.brandName;
  ctx.font = '800 32px "Fredoka", "Plus Jakarta Sans", system-ui, sans-serif';
  const brandW = ctx.measureText(brandText).width + 64 + 58;
  const brandX = width - 72 - brandW;
  drawRoundedRect(ctx, brandX, 92, brandW, 74, 37);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fill();
  drawBrandMark(ctx, brandX + 14, 104, 50);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(brandText, brandX + 74, 130);

  // 4. Center Frosted Glass Typography Card
  const cardX = 68;
  const cardY = 212;
  const cardW = width - 136;
  const cardH = 1326;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.34)';
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

  const textMaxW = cardW - 112;
  const srcY = cardY + cardH - 96;

  if (gifImg && gifImg.naturalWidth > 0 && gifImg.naturalHeight > 0) {
    // Top Visual Hero Window (y: 232..760) with object-fit: cover + bottom dark gradient + GIPHY badge
    const heroX = cardX + 28;
    const heroY = 232;
    const heroW = cardW - 56;
    const heroH = 528;

    ctx.save();
    drawRoundedRect(ctx, heroX, heroY, heroW, heroH, 40);
    ctx.clip();

    const imgRatio = gifImg.naturalWidth / Math.max(1, gifImg.naturalHeight);
    const boxRatio = heroW / heroH;
    let sx = 0;
    let sy = 0;
    let sw = gifImg.naturalWidth;
    let sh = gifImg.naturalHeight;
    if (imgRatio > boxRatio) {
      sw = gifImg.naturalHeight * boxRatio;
      sx = (gifImg.naturalWidth - sw) / 2;
    } else {
      sh = gifImg.naturalWidth / boxRatio;
      sy = (gifImg.naturalHeight - sh) / 2;
    }
    ctx.drawImage(gifImg, sx, sy, sw, sh, heroX, heroY, heroW, heroH);

    // Smooth bottom gradient scrim
    const heroScrim = ctx.createLinearGradient(0, heroY + heroH * 0.4, 0, heroY + heroH);
    heroScrim.addColorStop(0, 'rgba(10, 10, 14, 0)');
    heroScrim.addColorStop(1, 'rgba(10, 10, 14, 0.86)');
    ctx.fillStyle = heroScrim;
    ctx.fillRect(heroX, heroY, heroW, heroH);
    ctx.restore();

    drawRoundedRect(ctx, heroX, heroY, heroW, heroH, 40);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 2;
    ctx.stroke();

    drawStoryTextBlock(ctx, {
      canvasWidth: width,
      textMaxWidth: textMaxW,
      startY: heroY + heroH + 40,
      maxBottomY: srcY - 26,
      title: localized.title,
      factText: localized.factText,
      accentColor: fact.accentColor || '#FBBF24',
      titleFontSize: 48,
      titleLineHeight: 60,
      maxTitleLines: 3,
      bodyFontSize: 34,
      bodyLineHeight: 48,
      maxBodyLinesCap: 6,
      dividerWidth: 116,
      dividerTopGap: 16,
      dividerBottomGap: 36,
    });
  } else {
    // Fallback without GIF: subtle watermark + centered category illustration orb
    if (catImg) {
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.drawImage(catImg, width - 410, cardY + cardH - 420, 320, 320);
      ctx.restore();
    }

    ctx.save();
    drawRoundedRect(ctx, width / 2 - 84, cardY + 70, 168, 168, 84);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.lineWidth = 3;
    ctx.stroke();
    if (catImg) {
      ctx.drawImage(catImg, width / 2 - 58, cardY + 96, 116, 116);
    } else {
      ctx.font = '74px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fact.emoji ?? catMeta.emoji, width / 2, cardY + 154);
    }
    ctx.restore();

    drawStoryTextBlock(ctx, {
      canvasWidth: width,
      textMaxWidth: textMaxW,
      startY: cardY + 280,
      maxBottomY: srcY - 28,
      title: localized.title,
      factText: localized.factText,
      accentColor: fact.accentColor || '#FBBF24',
      titleFontSize: 56,
      titleLineHeight: 72,
      maxTitleLines: 4,
      bodyFontSize: 38,
      bodyLineHeight: 54,
      maxBodyLinesCap: 7,
      dividerWidth: 128,
      dividerTopGap: 24,
      dividerBottomGap: 50,
    });
  }

  // Source Hint Pill at Card Bottom
  const mediaProvider = detectMediaProvider({
    gifUrl: fact.gifUrl,
    posterUrl: fact.posterUrl,
    videoUrl: fact.gifUrl,
  });
  const providerName =
    mediaProvider?.id === 'wikimedia' ? 'Wikimedia' : mediaProvider?.label;
  const sourceLabel = providerName
    ? `📚 ${localized.sourceHint} · ${providerName}`
    : `📚 ${localized.sourceHint}`;
  ctx.font = '700 26px "Plus Jakarta Sans", system-ui, sans-serif';
  const srcW = Math.min(textMaxW, ctx.measureText(sourceLabel).width + 64);
  drawRoundedRect(ctx, width / 2 - srcW / 2, srcY, srcW, 56, 28);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sourceLabel, width / 2, srcY + 29, srcW - 36);

  // 5. Bottom CTA Pill & Stylish Viral scrolly.live Branding Pill
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  drawRoundedRect(ctx, 88, 1582, width - 176, 102, 51);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.fill();

  if (verifiedSealImg) {
    ctx.drawImage(verifiedSealImg, 120, 1608, 50, 50);
  }
  ctx.font = '800 31px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = '#1E1B2E';
  ctx.fillText(t.storyCtaLine, verifiedSealImg ? width / 2 + 16 : width / 2, 1633, width - 290);

  // Stylish scrolly.live watermark pill + short viral callout CTA
  const viralCtaText =
    lang === 'tr' ? 'Kaydır, Keşfet & 1v1 Oyna' : 'Scroll, Discover & Play 1v1';
  const domainText = 'scrolly.live';
  const pillW = 790;
  const pillH = 74;
  const pillX = (width - pillW) / 2;
  const pillY = 1718;

  ctx.save();
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 37);
  ctx.fillStyle = 'rgba(10, 10, 18, 0.56)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.34)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Brand inner badge inside the footer pill
  ctx.font = '800 28px "Fredoka", "Plus Jakarta Sans", system-ui, sans-serif';
  const domainBadgeW = ctx.measureText(domainText).width + 58;
  drawRoundedRect(ctx, pillX + 12, pillY + 11, domainBadgeW, 52, 26);
  ctx.fillStyle = 'rgba(124, 58, 237, 0.92)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(pillX + 34, pillY + 37, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#34D399';
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(domainText, pillX + 48, pillY + 38);

  // Callout CTA right side inside the pill
  ctx.font = '700 26px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  const calloutX = pillX + 12 + domainBadgeW + 22;
  const maxCalloutW = pillX + pillW - 24 - calloutX;
  ctx.fillText(viralCtaText, calloutX, pillY + 38, maxCalloutW);
  ctx.restore();

  // Crisp subtle bilingual caption beneath watermark pill
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 22px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.fillText(
    lang === 'tr'
      ? 'Doğrulanmış Mikro Bilgi · TR | EN'
      : 'Verified Micro-Knowledge · TR | EN',
    width / 2,
    1834
  );

  const safeSlug =
    getFactPrimarySlug(fact)
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '') || fact.id;
  const dataUrl = canvas.toDataURL('image/png');
  const blob = await canvasToBlob(canvas);
  const file = new File([blob], `scrolly-story-${safeSlug}.png`, { type: 'image/png' });

  return { blob, file, dataUrl };
}
