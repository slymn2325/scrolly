import { getCategoryMeta, type Language, translations } from '@/i18n/translations';
import { detectMediaProvider } from '@/lib/mediaProvider';
import type { FactCard } from '@/types/fact';
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

const SOYULAN_S_PATH =
  'M328 186c-6-44-46-70-102-70-62 0-104 32-110 86h54c4-26 24-42 56-42 28 0 46 12 48 34 2 24-18 34-68 46-62 14-100 40-96 92 4 56 52 90 122 90 70 0 116-36 124-94h-56c-6 30-28 50-68 50-34 0-56-16-58-42-2-26 22-38 74-50 58-14 94-42 90-100Z';

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

/** Same geometry as `public/brand/01-peel-s.svg`. */
export function drawSoyulanS(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  const scale = size / 512;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  drawRoundedRect(ctx, 0, 0, 512, 512, 114);
  ctx.fillStyle = '#FFD6E6';
  ctx.fill();

  drawRoundedRect(ctx, 36, 36, 440, 440, 92);
  ctx.fillStyle = '#FFF4F7';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 16;
  ctx.stroke();

  ctx.fillStyle = '#FFE8A3';
  ctx.fill(new Path2D('M384 36h52c22 0 40 18 40 40v52L384 36Z'));
  ctx.fillStyle = '#FFC29B';
  ctx.fill(new Path2D('M384 36l92 92v-12c0-6-2-12-6-16L400 42c-4-4-10-6-16-6h-0Z'));

  const flap = new Path2D('M384 36l92 92h-56c-20 0-36-16-36-36V36Z');
  ctx.fillStyle = '#FFF4F7';
  ctx.fill(flap);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.stroke(flap);

  ctx.fillStyle = '#5B2A43';
  ctx.fill(new Path2D(SOYULAN_S_PATH));

  ctx.fillStyle = '#FF8DB8';
  ctx.beginPath();
  ctx.arc(148, 140, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#CFF5E7';
  ctx.beginPath();
  ctx.arc(176, 118, 8, 0, Math.PI * 2);
  ctx.fill();

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
  ctx.fillStyle = '#3F1D30';
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
  ctx.fillStyle = options.accentColor || '#FF8DB8';
  ctx.fill();

  y += options.dividerBottomGap;
  ctx.font = `500 ${options.bodyFontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.fillStyle = '#7A4A63';
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

  ctx.fillStyle = '#FFF4F7';
  ctx.fillRect(0, 0, width, height);

  const cardX = 56;
  const cardY = 48;
  const cardW = width - 112;
  const cardH = 1664;

  drawRoundedRect(ctx, cardX, cardY + 10, cardW, cardH, 48);
  ctx.fillStyle = '#FF8DB8';
  ctx.fill();

  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 48);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#F3C5D6';
  ctx.lineWidth = 3;
  ctx.stroke();

  const catLabelText = catMeta.label[lang].toUpperCase();
  ctx.font = '800 30px "Plus Jakarta Sans", system-ui, sans-serif';
  const catIconSpace = catImg ? 56 : 0;
  const catTextWithFallback = catImg ? catLabelText : `${fact.emoji ?? catMeta.emoji}  ${catLabelText}`;
  const catWidth = Math.max(280, ctx.measureText(catTextWithFallback).width + 72 + catIconSpace);
  const catX = cardX + 28;
  const catY = cardY + 28;

  drawRoundedRect(ctx, catX, catY, catWidth, 64, 32);
  ctx.fillStyle = '#FFD6E6';
  ctx.fill();

  if (catImg) {
    ctx.drawImage(catImg, catX + 16, catY + 8, 48, 48);
  }
  ctx.fillStyle = '#3F1D30';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(catTextWithFallback, catImg ? catX + 72 : catX + 24, catY + 32);

  const textMaxW = cardW - 112;
  const srcY = cardY + cardH - 220;

  if (gifImg && gifImg.naturalWidth > 0 && gifImg.naturalHeight > 0) {
    const heroX = cardX + 28;
    const heroY = cardY + 112;
    const heroW = cardW - 56;
    const heroH = 560;

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
    ctx.restore();

    drawRoundedRect(ctx, heroX, heroY, heroW, heroH, 40);
    ctx.strokeStyle = '#F3C5D6';
    ctx.lineWidth = 3;
    ctx.stroke();

    drawStoryTextBlock(ctx, {
      canvasWidth: width,
      textMaxWidth: textMaxW,
      startY: heroY + heroH + 40,
      maxBottomY: srcY - 26,
      title: localized.title,
      factText: localized.factText,
      accentColor: fact.accentColor || '#FF8DB8',
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
    drawRoundedRect(ctx, width / 2 - 84, cardY + 120, 168, 168, 84);
    ctx.fillStyle = '#FFD6E6';
    ctx.fill();
    if (catImg) {
      ctx.drawImage(catImg, width / 2 - 58, cardY + 146, 116, 116);
    } else {
      ctx.font = '74px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#3F1D30';
      ctx.fillText(fact.emoji ?? catMeta.emoji, width / 2, cardY + 204);
    }
    ctx.restore();

    drawStoryTextBlock(ctx, {
      canvasWidth: width,
      textMaxWidth: textMaxW,
      startY: cardY + 330,
      maxBottomY: srcY - 28,
      title: localized.title,
      factText: localized.factText,
      accentColor: fact.accentColor || '#FF8DB8',
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
  ctx.fillStyle = '#FFF4F7';
  ctx.fill();
  ctx.strokeStyle = '#F3C5D6';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#7A4A63';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sourceLabel, width / 2, srcY + 28, srcW - 36);

  const ctaY = srcY + 76;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  drawRoundedRect(ctx, cardX + 28, ctaY, cardW - 56, 88, 44);
  ctx.fillStyle = '#C44569';
  ctx.fill();

  if (verifiedSealImg) {
    ctx.drawImage(verifiedSealImg, cardX + 48, ctaY + 19, 50, 50);
  }
  ctx.font = '800 30px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(
    t.storyCtaLine,
    verifiedSealImg ? width / 2 + 16 : width / 2,
    ctaY + 44,
    cardW - 180
  );

  const mark = 96;
  const lockupY = 1764;
  drawSoyulanS(ctx, 64, lockupY, mark);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#3F1D30';
  ctx.font = '800 40px "Fredoka", "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('scrolly.live', 64 + mark + 20, lockupY + mark / 2);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#7A4A63';
  ctx.font = '700 22px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(
    lang === 'tr' ? 'Doğrulanmış Mikro Bilgi · TR | EN' : 'Verified Micro-Knowledge · TR | EN',
    width - 64,
    lockupY + mark / 2
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
