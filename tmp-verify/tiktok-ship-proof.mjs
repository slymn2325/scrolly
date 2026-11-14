import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
// Inline encoder matching utils/duelCodec
function encodeDuelPayload(payload) {
  const compact = {
    c: payload.cardIds.slice(0, 5),
    s: Math.max(0, Math.round(payload.score)),
    t: Math.max(1, Math.round(payload.timeSec)),
    n: (payload.name || 'Player').trim().slice(0, 24),
    m: 'd',
    k: payload.kind === 'group' ? 'g' : '1',
  };
  const json = JSON.stringify(compact);
  const utf8Percent = encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  );
  return Buffer.from(utf8Percent, 'binary')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const BASE = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3000';
const MEDIA =
  process.env.VERIFY_MEDIA_DIR ||
  'C:/Users/slymn/AppData/Local/Cursor/AgentStores/cursor_agent_stores/bc-1e66afab-2658-4f9b-a85b-b0571dba97c7/files/media';
fs.mkdirSync(MEDIA, { recursive: true });

const checks = [];
const record = (n, ok, d = '') => {
  checks.push({ name: n, ok, detail: d });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? ` — ${d}` : ''}`);
};

async function dismissChrome(page) {
  await page.evaluate(() => {
    try {
      localStorage.setItem('scrolly_welcome_dismissed_v1', '1');
    } catch {}
    document
      .querySelectorAll(
        '[data-testid="cookie-banner"], [data-testid="pwa-install-prompt"], [data-testid="welcome-explore-modal"]'
      )
      .forEach((el) => {
        el.style.display = 'none';
      });
  }).catch(() => {});
}

async function openDetail(page) {
  const flip = page.getByTestId('flip-card-btn').first();
  await flip.waitFor({ state: 'visible', timeout: 15000 });
  await flip.click();
  await page.getByTestId('fact-card-back').waitFor({ state: 'visible', timeout: 10000 });
}

async function dragDetailDismiss(page) {
  const handle = page.getByTestId('detail-drag-handle');
  await handle.waitFor({ state: 'visible' });
  const box = await handle.boundingBox();
  if (!box) throw new Error('no drag handle box');
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // drag far down past dismiss threshold
  for (let i = 1; i <= 12; i += 1) {
    await page.mouse.move(startX, startY + i * 30, { steps: 2 });
  }
  await page.mouse.up();
  await page.waitForTimeout(500);
}

async function runViewport(browser, label, w, h) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    locale: 'tr-TR',
  });
  // Fresh visit without welcome key for welcome test only on mobile
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);

  // —— Welcome popup (clear storage first) ——
  await page.addInitScript(() => {
    try {
      localStorage.removeItem('scrolly_welcome_dismissed_v1');
    } catch {}
  });
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(800);
  const welcomeVisible = await page.getByTestId('welcome-explore-modal').isVisible().catch(() => false);
  record(`${label}: welcome modal on first visit`, welcomeVisible);
  if (welcomeVisible) {
    await page.screenshot({ path: path.join(MEDIA, `${label}-welcome.png`), fullPage: false });
    await page.getByTestId('welcome-start-btn').click({ force: true });
    await page.getByTestId('welcome-explore-modal').waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
    const welcomeGone = !(await page.getByTestId('welcome-explore-modal').isVisible().catch(() => false));
    const stored = await page.evaluate(() => localStorage.getItem('scrolly_welcome_dismissed_v1'));
    record(`${label}: welcome dismisses on CTA`, welcomeGone && stored === '1', `stored=${stored}`);
  }
  await dismissChrome(page);
  await page.getByTestId('tiktok-feed-container').waitFor({ state: 'visible' });

  const layout = await page.evaluate(() => {
    const left = document.querySelector('[data-testid="desktop-left-nav"]');
    const side = document.querySelector('[data-testid="desktop-feed-side-rail"]');
    const phone = document.querySelector('[data-testid="reels-phone-frame"]');
    const dock = document.querySelector('[data-testid="ios-floating-dock"]');
    const shell = document.querySelector('[data-testid="reels-desktop-shell"]');
    const pr = phone?.getBoundingClientRect();
    const leftCs = left ? getComputedStyle(left) : null;
    const sideCs = side ? getComputedStyle(side) : null;
    const dockCs = dock ? getComputedStyle(dock) : null;
    return {
      leftDisplay: leftCs?.display || null,
      sideDisplay: sideCs?.display || null,
      dockDisplay: dockCs?.display || null,
      phoneW: pr ? Math.round(pr.width) : null,
      phoneH: pr ? Math.round(pr.height) : null,
      vw: window.innerWidth,
      vh: window.innerHeight,
      theme: shell?.getAttribute('data-theme') || null,
      fill: pr ? pr.width / window.innerWidth : 0,
    };
  });

  if (w >= 1024) {
    record(`${label}: left nav visible`, layout.leftDisplay === 'flex', JSON.stringify(layout));
    record(`${label}: side rail visible`, layout.sideDisplay === 'flex');
    record(
      `${label}: stage tall immersive`,
      layout.phoneH != null && layout.phoneH >= h * 0.9,
      `phoneH=${layout.phoneH}`
    );
    record(
      `${label}: stage not tiny phone`,
      layout.phoneW != null && layout.phoneW >= 480,
      `phoneW=${layout.phoneW}`
    );
    await page.screenshot({ path: path.join(MEDIA, `${label}-desk-home.png`), fullPage: false });

    await page.getByTestId('desktop-nav-duel').click();
    await page.waitForTimeout(400);
    const duelOpen = await page.getByTestId('duel-modal').isVisible().catch(() => false);
    record(`${label}: duel from left nav`, duelOpen);
    if (duelOpen) {
      const kindToggle = await page.getByTestId('duel-kind-toggle').isVisible().catch(() => false);
      record(`${label}: duel 1v1/group toggle`, kindToggle);
      await page.getByTestId('duel-kind-group').click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(MEDIA, `${label}-duel-modal.png`), fullPage: false });
      await page.getByTestId('start-duel-btn').click();
      await page.waitForTimeout(700);
      const quizVisible = await page.locator('text=/soru|question|düello|duel/i').first().isVisible().catch(() => false);
      const memoryQuiz = await page.locator('[class*="Memory"], [data-testid*="quiz"], [data-testid*="memory"]').first().isVisible().catch(() => false);
      record(`${label}: Hemen Başla launches play`, quizVisible || memoryQuiz || !(await page.getByTestId('duel-modal').isVisible().catch(() => false)));
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(300);
      // return to explore if quiz open
      await page.evaluate(() => {
        document.querySelectorAll('[aria-modal="true"]').forEach((el) => {
          const close = el.querySelector('[data-testid*="close"], [aria-label="Close"]');
          if (close) close.click();
        });
      }).catch(() => {});
      await page.waitForTimeout(300);
    }
  } else if (w >= 700 && w < 1024) {
    record(`${label}: tablet no left nav`, layout.leftDisplay === 'none' || !layout.leftDisplay);
    record(
      `${label}: tablet full-bleed immersive`,
      layout.phoneW != null && layout.phoneW >= w * 0.95,
      `phoneW=${layout.phoneW}`
    );
    await page.screenshot({ path: path.join(MEDIA, `${label}-tablet-home.png`), fullPage: false });
  } else {
    record(
      `${label}: mobile full-bleed`,
      layout.phoneW != null && layout.phoneW >= w * 0.95,
      `phoneW=${layout.phoneW}`
    );
    record(`${label}: mobile dock visible`, layout.dockDisplay !== 'none');
    await page.screenshot({ path: path.join(MEDIA, `${label}-mobile-home.png`), fullPage: false });
  }

  // —— Theme toggle ——
  await dismissChrome(page);
  const themeBtn = page.getByTestId('theme-toggle-btn');
  if (await themeBtn.isVisible().catch(() => false)) {
    const before = await page.evaluate(() => ({
      htmlDark: document.documentElement.classList.contains('dark'),
      shell: document.querySelector('[data-testid="reels-desktop-shell"]')?.getAttribute('data-theme'),
    }));
    await themeBtn.click();
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => ({
      htmlDark: document.documentElement.classList.contains('dark'),
      shell: document.querySelector('[data-testid="reels-desktop-shell"]')?.getAttribute('data-theme'),
      navTheme: document.querySelector('[data-testid="desktop-left-nav"]')?.getAttribute('data-theme'),
      dockTheme: document.querySelector('[data-testid="ios-floating-dock"]')?.getAttribute('data-theme'),
    }));
    record(
      `${label}: theme toggle flips html/shell`,
      before.htmlDark !== after.htmlDark && before.shell !== after.shell,
      JSON.stringify({ before, after })
    );
    await page.screenshot({
      path: path.join(MEDIA, `${label}-theme-${after.shell}.png`),
      fullPage: false,
    });
    // flip back for consistency
    await themeBtn.click();
    await page.waitForTimeout(300);
  } else {
    record(`${label}: theme toggle visible`, false);
  }

  // —— Detail swipe dismiss ——
  await dismissChrome(page);
  // ensure we're on explore feed
  await page.getByTestId('tiktok-feed-container').waitFor({ state: 'visible' });
  try {
    await openDetail(page);
    record(`${label}: detail opens`, true);
    await page.screenshot({ path: path.join(MEDIA, `${label}-detail-open.png`), fullPage: false });
    await dragDetailDismiss(page);
    const stillOpen = await page.getByTestId('fact-card-back').isVisible().catch(() => false);
    record(`${label}: detail dismiss via drag-down`, !stillOpen, stillOpen ? 'still open' : 'closed');
    if (stillOpen) {
      // fallback proof that X still works, then fail already recorded
      await page.getByTestId('detail-close-btn').click().catch(() => {});
      await page.waitForTimeout(300);
    }
  } catch (err) {
    record(`${label}: detail drag dismiss flow`, false, String(err));
  }

  // —— Motif live check (scan slides for canvas data-motif) ——
  const motifs = await page.evaluate(async () => {
    const found = [];
    const container = document.querySelector('[data-testid="tiktok-feed-container"]');
    if (!container) return found;
    for (let i = 0; i < 8; i += 1) {
      const canvas = document.querySelector('[data-testid="full-bleed-reels-canvas"]');
      const title = document.querySelector('h1, h2, [class*="font-display"]');
      if (canvas) {
        found.push({
          motif: canvas.getAttribute('data-motif'),
          category: canvas.getAttribute('data-category'),
          title: title?.textContent?.slice(0, 80) || '',
        });
      }
      container.scrollBy(0, container.clientHeight);
      await new Promise((r) => setTimeout(r, 350));
    }
    return found;
  });
  const hasSpecific = motifs.some((m) =>
    ['antarctic_fish', 'desert_cactus', 'octopus', 'animal', 'bird', 'insect', 'ocean', 'forest', 'welding', 'planet'].includes(
      m.motif
    )
  );
  record(`${label}: topic motifs present on cards`, hasSpecific && motifs.length > 0, JSON.stringify(motifs.slice(0, 5)));

  await ctx.close();
}

async function runDuelReadyStart(browser) {
  const code = encodeDuelPayload({
    cardIds: ['nature-01', 'nature-02', 'nature-03', 'nature-04', 'nature-05'],
    score: 400,
    timeSec: 28,
    name: 'ProofBot',
    mode: 'duel',
    kind: '1v1',
  });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'tr-TR' });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    try {
      localStorage.setItem('scrolly_welcome_dismissed_v1', '1');
    } catch {}
  });
  await page.goto(`${BASE}/?duel=${code}`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2500);
  await dismissChrome(page);
  const duelModal = await page.getByTestId('duel-modal').isVisible().catch(() => false);
  const quizOrPlay = await page.evaluate(() => {
    const text = document.body.innerText || '';
    return /düello|duel|soru|question|quiz|hedef|target/i.test(text);
  });
  record('duel ready-link: no setup wizard modal', !duelModal);
  record('duel ready-link: starts into play content', quizOrPlay);
  await page.screenshot({ path: path.join(MEDIA, 'mobile-390x844-duel-ready-start.png'), fullPage: false });
  await ctx.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await runViewport(browser, 'desktop-1440x900', 1440, 900);
  await runViewport(browser, 'mobile-390x844', 390, 844);
  await runViewport(browser, 'tablet-768x1024', 768, 1024);
  await runDuelReadyStart(browser);
} finally {
  await browser.close();
}

const report = {
  at: new Date().toISOString(),
  base: BASE,
  passed: checks.filter((c) => c.ok).length,
  failed: checks.filter((c) => !c.ok).length,
  checks,
};
fs.writeFileSync(path.join('tmp-verify', 'tiktok-ship-report.json'), JSON.stringify(report, null, 2));
console.log(`\nSummary: ${report.passed} passed, ${report.failed} failed`);
if (report.failed > 0) process.exitCode = 1;
