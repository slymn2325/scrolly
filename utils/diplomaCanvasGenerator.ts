import { CATEGORIES, type CategoryId, getCategoryMeta, type Language, translations } from '@/i18n/translations';
import type { FactCard } from '@/types/fact';
import { loadImageElement, UI_ICON_PATHS } from '@/utils/icons8Assets';
import type { GeneratedCanvasAsset } from '@/utils/storyCanvasGenerator';
import { getLeagueInfo, type UserMemoryState } from '@/utils/userMemory';

const CATEGORY_ACCENT_HEX: Record<CategoryId, string> = {
  space: '#8B5CF6',
  nature: '#10B981',
  human_body: '#F43F5E',
  history: '#F59E0B',
  science: '#0EA5E9',
  records: '#EC4899',
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

export async function generateDiplomaCertificateImage(
  memory: UserMemoryState,
  allFacts: FactCard[],
  lang: Language
): Promise<GeneratedCanvasAsset> {
  const WIDTH = 1600;
  const HEIGHT = 1120;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }

  const t = translations[lang];
  const league = getLeagueInfo(memory.xp, lang);
  const categoryList = CATEGORIES.filter((c) => c.id !== 'all');

  const [shieldImg, verifiedSealImg, xpIconImg, streakIconImg, ...catImgs] = await Promise.all([
    loadImageElement(league.shieldIcon),
    loadImageElement(UI_ICON_PATHS.verifiedSeal),
    loadImageElement(UI_ICON_PATHS.xpSparkles),
    loadImageElement(UI_ICON_PATHS.streakFire),
    ...categoryList.map((cat) => loadImageElement(cat.iconPath)),
  ]);
  const catImgMap = new Map<string, HTMLImageElement | null>();
  categoryList.forEach((cat, idx) => {
    catImgMap.set(cat.id, catImgs[idx] ?? null);
  });

  // Warm parchment-aurora gradient backdrop
  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, '#FFFDF7');
  bg.addColorStop(0.55, '#FEF9EC');
  bg.addColorStop(1, '#F3EEFF');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Soft decorative orbs
  const orbTopRight = ctx.createRadialGradient(1380, 180, 20, 1380, 180, 360);
  orbTopRight.addColorStop(0, 'rgba(139, 92, 246, 0.16)');
  orbTopRight.addColorStop(1, 'rgba(139, 92, 246, 0)');
  ctx.fillStyle = orbTopRight;
  ctx.fillRect(900, 0, 700, 600);

  const orbBottomLeft = ctx.createRadialGradient(220, 940, 20, 220, 940, 360);
  orbBottomLeft.addColorStop(0, 'rgba(245, 158, 11, 0.16)');
  orbBottomLeft.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = orbBottomLeft;
  ctx.fillRect(0, 520, 700, 600);

  // Outer engraved double gold frame
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 6;
  drawRoundedRect(ctx, 42, 42, WIDTH - 84, HEIGHT - 84, 40);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(217, 119, 6, 0.38)';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 64, 64, WIDTH - 128, HEIGHT - 128, 30);
  ctx.stroke();

  // Top Header Crest & Brand
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  ctx.fillStyle = '#B45309';
  ctx.font = '800 26px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`✦  ${t.brandName.toUpperCase()}  •  ${t.diplomaWeeklyCert.toUpperCase()}  ✦`, WIDTH / 2, 132);

  // Main Certificate Title
  ctx.fillStyle = '#1E1B4B';
  ctx.font = '800 58px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(t.diplomaTitle, WIDTH / 2, 212);

  // Thin gold divider
  const divGrad = ctx.createLinearGradient(WIDTH / 2 - 220, 0, WIDTH / 2 + 220, 0);
  divGrad.addColorStop(0, 'rgba(217,119,6,0)');
  divGrad.addColorStop(0.5, 'rgba(217,119,6,0.9)');
  divGrad.addColorStop(1, 'rgba(217,119,6,0)');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(WIDTH / 2 - 220, 260);
  ctx.lineTo(WIDTH / 2 + 220, 260);
  ctx.stroke();

  // Top-right Official Scrolly Verified Seal Rosette
  if (verifiedSealImg) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(WIDTH - 156, 152, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.drawImage(verifiedSealImg, WIDTH - 192, 114, 72, 72);
    ctx.fillStyle = '#B45309';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 13px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText('SCROLLY VERIFIED', WIDTH - 156, 222);
    ctx.restore();
  }

  // Recipient Nickname & League Ribbon
  ctx.fillStyle = '#312E81';
  ctx.font = '800 72px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(memory.nickname || (lang === 'tr' ? 'Meraklı Kâşif' : 'Curious Explorer'), WIDTH / 2, 344);

  const leaguePillW = 600;
  const leaguePillH = 80;
  const leagueGrad = ctx.createLinearGradient(WIDTH / 2 - leaguePillW / 2, 0, WIDTH / 2 + leaguePillW / 2, 0);
  leagueGrad.addColorStop(0, '#4338CA');
  leagueGrad.addColorStop(1, '#7C3AED');
  ctx.fillStyle = leagueGrad;
  drawRoundedRect(ctx, WIDTH / 2 - leaguePillW / 2, 410, leaguePillW, leaguePillH, 40);
  ctx.fill();

  const ribbonLabel = `${league.label}  •  ${memory.xp} XP`;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 32px system-ui, -apple-system, Segoe UI, sans-serif';
  if (shieldImg) {
    const labelW = ctx.measureText(ribbonLabel).width;
    const totalW = 54 + 14 + labelW;
    const startX = WIDTH / 2 - totalW / 2;
    ctx.drawImage(shieldImg, startX, 423, 54, 54);
    ctx.textAlign = 'left';
    ctx.fillText(ribbonLabel, startX + 68, 450);
    ctx.textAlign = 'center';
  } else {
    ctx.fillText(`${league.emoji}  ${ribbonLabel}`, WIDTH / 2, 450);
  }

  // 3 Stat Plaques
  const stats = [
    { label: 'XP', value: String(memory.xp), accent: '#D97706', iconImg: xpIconImg },
    {
      label: t.drawerDiscovered,
      value: `${memory.seenIds.length}/${allFacts.length}`,
      accent: '#6D28D9',
      iconImg: verifiedSealImg,
    },
    { label: t.drawerStreak, value: `${memory.streakDays}`, accent: '#E11D48', iconImg: streakIconImg },
  ];

  const plaqueW = 360;
  const plaqueH = 158;
  const plaqueGap = 46;
  const totalRowW = plaqueW * 3 + plaqueGap * 2;
  const startX = (WIDTH - totalRowW) / 2;

  stats.forEach((item, idx) => {
    const px = startX + idx * (plaqueW + plaqueGap);
    const py = 542;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    drawRoundedRect(ctx, px, py, plaqueW, plaqueH, 26);
    ctx.fill();

    ctx.strokeStyle = 'rgba(217, 119, 6, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (item.iconImg) {
      ctx.drawImage(item.iconImg, px + 22, py + 22, 36, 36);
    }

    ctx.fillStyle = item.accent;
    ctx.font = '800 54px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(item.value, px + plaqueW / 2 + (item.iconImg ? 12 : 0), py + 62);

    ctx.fillStyle = '#475569';
    ctx.font = '700 22px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(item.label.toUpperCase(), px + plaqueW / 2, py + 118);
  });

  // Mini Category Mastery Strip / Constellation Summary
  const nodeSpacing = 200;
  const nodesStartX = WIDTH / 2 - ((categoryList.length - 1) * nodeSpacing) / 2;
  const nodesY = 824;

  // Connecting constellation line
  ctx.strokeStyle = 'rgba(109, 40, 217, 0.28)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(nodesStartX, nodesY);
  ctx.lineTo(nodesStartX + (categoryList.length - 1) * nodeSpacing, nodesY);
  ctx.stroke();

  categoryList.forEach((cat, idx) => {
    const catId = cat.id as CategoryId;
    const cx = nodesStartX + idx * nodeSpacing;
    const meta = getCategoryMeta(catId);
    const factsInCat = allFacts.filter((f) => f.category === catId);
    const seenInCat = factsInCat.filter((f) => memory.seenIds.includes(f.id)).length;
    const isLit = seenInCat > 0 || (memory.categoryWeights[catId] ?? 0) > 0;
    const catImg = catImgMap.get(catId) ?? null;

    ctx.fillStyle = isLit ? CATEGORY_ACCENT_HEX[catId] : '#E2E8F0';
    ctx.beginPath();
    ctx.arc(cx, nodesY, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.stroke();

    if (catImg) {
      ctx.save();
      if (!isLit) ctx.globalAlpha = 0.55;
      ctx.drawImage(catImg, cx - 23, nodesY - 23, 46, 46);
      ctx.restore();
    } else {
      ctx.font = '32px system-ui, Apple Color Emoji, Segoe UI Emoji, sans-serif';
      ctx.fillStyle = '#1E1B4B';
      ctx.fillText(meta.emoji, cx, nodesY + 2);
    }

    ctx.font = '700 18px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText(`${seenInCat}/${factsInCat.length}`, cx, nodesY + 62);
  });

  // Footer Stamp & Date
  const formattedDate = new Intl.DateTimeFormat(lang === 'tr' ? 'tr-TR' : 'en-US', {
    dateStyle: 'long',
  }).format(new Date());

  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748B';
  ctx.font = '700 22px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`📅  ${formattedDate}`, 110, 998);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#4338CA';
  ctx.font = '800 24px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`scrolly.live  •  ${t.drawerBadges}: ${memory.badges.length}/6`, WIDTH - 110, 998);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((out) => {
      if (out) resolve(out);
      else reject(new Error('Failed to encode diploma PNG blob'));
    }, 'image/png');
  });

  const file = new File([blob], `scrolly-diploma-${Date.now()}.png`, { type: 'image/png' });
  const dataUrl = canvas.toDataURL('image/png');
  return { blob, file, dataUrl };
}
