const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.PWA_PROOF_URL || 'http://127.0.0.1:3000';
const PWA_KEY = 'scrolly_pwa_prompt_dismissed';
const OUT_DIR = path.join(
  process.env.USERPROFILE || '',
  'AppData/Local/Cursor/AgentStores/cursor_agent_stores/bc-1e66afab-2658-4f9b-a85b-b0571dba97c7/files/media'
);

async function advanceToSlide(page, index) {
  await page.getByTestId('tiktok-feed-container').waitFor({ state: 'visible', timeout: 30000 });
  await page.evaluate((idx) => {
    const c = document.querySelector('[data-testid="tiktok-feed-container"]');
    if (!c) throw new Error('no feed');
    c.scrollTo({ top: c.clientHeight * idx, behavior: 'instant' });
  }, index);
  await page.waitForTimeout(900);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'en-US',
  });

  // Seed welcome/cookie every load; clear PWA dismissed ONLY once per tab session
  await context.addInitScript(() => {
    localStorage.setItem('scrolly_welcome_dismissed_v1', '1');
    localStorage.setItem(
      'merak_user_state_v1',
      JSON.stringify({
        playerId: 'proof-player',
        nickname: 'Proof',
        lang: 'en',
        darkMode: false,
        xp: 12,
        weeklyXp: 12,
        dailyBestScore: 0,
        lastDailyQuizDate: '',
        highestLeagueId: 'bronze',
        notificationsEnabled: false,
        seenIds: [],
        recentFiveIds: [],
        cardsSinceLastQuiz: 0,
        totalSwipes: 0,
        favoriteIds: [],
        categoryWeights: {},
        categoryAccuracy: {},
        streakDays: 1,
        lastVisitDate: new Date().toISOString().slice(0, 10),
        badges: [],
        soundEnabled: false,
        cookieAccepted: true,
        isReturningUser: true,
        rewindsRemaining: 2,
        unlimitedRewindsUnlocked: false,
      })
    );
    if (!sessionStorage.getItem('pwa_proof_cleared_once')) {
      sessionStorage.setItem('pwa_proof_cleared_once', '1');
      localStorage.removeItem('scrolly_pwa_prompt_dismissed');
    }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(800);

  const welcome = page.getByTestId('welcome-start-btn');
  if (await welcome.isVisible().catch(() => false)) {
    await welcome.click();
    await page.waitForTimeout(400);
  }

  await advanceToSlide(page, 2);

  const prompt = page.getByTestId('pwa-install-prompt');
  await prompt.waitFor({ state: 'visible', timeout: 20000 });
  console.log('PASS: banner visible');

  const dismiss = page.getByTestId('pwa-install-dismiss-btn');
  await dismiss.waitFor({ state: 'visible' });

  const dbox = await dismiss.boundingBox();
  if (!dbox) throw new Error('no dismiss box');
  const cx = dbox.x + dbox.width / 2;
  const cy = dbox.y + dbox.height / 2;
  const top = await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const btn = el.closest('[data-testid="pwa-install-dismiss-btn"]');
    return btn ? 'pwa-install-dismiss-btn' : el.getAttribute('data-testid') || el.tagName;
  }, { x: cx, y: cy });
  if (top !== 'pwa-install-dismiss-btn') {
    throw new Error('X not topmost at center, got: ' + top);
  }
  console.log('PASS: X is topmost hit target');

  await dismiss.click();
  await prompt.waitFor({ state: 'hidden', timeout: 10000 });
  console.log('PASS: banner gone after X');

  const stored = await page.evaluate((k) => localStorage.getItem(k), PWA_KEY);
  if (stored !== 'true') throw new Error('localStorage not set, got: ' + stored);
  console.log('PASS: localStorage persisted');

  await page.screenshot({
    path: path.join(OUT_DIR, 'mobile-390x844-pwa-dismissed.png'),
    fullPage: false,
  });

  await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(800);

  const afterReloadKey = await page.evaluate((k) => localStorage.getItem(k), PWA_KEY);
  if (afterReloadKey !== 'true') {
    throw new Error('localStorage cleared on reload by test harness: ' + afterReloadKey);
  }

  await advanceToSlide(page, 3);

  const stillVisible = await page.getByTestId('pwa-install-prompt').isVisible().catch(() => false);
  if (stillVisible) throw new Error('banner reappeared after reload');
  console.log('PASS: banner stays gone after reload + scroll');

  const stored2 = await page.evaluate((k) => localStorage.getItem(k), PWA_KEY);
  if (stored2 !== 'true') throw new Error('localStorage lost after reload: ' + stored2);
  console.log('PASS: localStorage still true after reload');

  await browser.close();
  console.log('ALL PASS');
}

main().catch((err) => {
  console.error('FAIL', err);
  process.exit(1);
});
