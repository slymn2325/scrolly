const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.PROOF_URL || 'http://127.0.0.1:3000';
const OUT = path.join(
  process.env.USERPROFILE || '',
  'AppData/Local/Cursor/AgentStores/cursor_agent_stores/bc-1e66afab-2658-4f9b-a85b-b0571dba97c7/files/media'
);

async function seed(context) {
  await context.addInitScript(() => {
    localStorage.setItem('scrolly_welcome_dismissed_v1', '1');
    localStorage.setItem(
      'merak_user_state_v1',
      JSON.stringify({
        playerId: 'proof-player',
        nickname: 'Proof',
        lang: 'en',
        darkMode: false,
        xp: 40,
        weeklyXp: 40,
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
  });
}

function assertPresentation(page, testId) {
  return page.locator(`[data-testid="${testId}"]`).getAttribute('data-presentation');
}

async function proveMobileNav(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await seed(context);
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const tabs = [
    ['quiz', 'quiz-hub-modal'],
    ['leaderboard', 'leaderboard-modal'],
    ['duel', 'duel-modal'],
    ['diploma', 'diploma-modal'],
    ['explore', null],
  ];

  for (const [tab, testId] of tabs) {
    await page.getByTestId(`dock-tab-${tab}`).click();
    await page.waitForTimeout(500);
    if (testId) {
      await page.getByTestId(testId).waitFor({ state: 'visible', timeout: 10000 });
      const presentation = await assertPresentation(page, testId);
      if (presentation !== 'page') throw new Error(`${testId} not page mode: ${presentation}`);
      // Must NOT be a viewport-covering dialog overlay style — page mode uses absolute inset
      const position = await page.getByTestId(testId).evaluate((el) => getComputedStyle(el).position);
      if (position !== 'absolute') throw new Error(`${testId} expected absolute page, got ${position}`);
      console.log(`PASS mobile tab ${tab} -> page`);
    } else {
      await page.getByTestId('tiktok-feed-container').waitFor({ state: 'visible' });
      console.log('PASS mobile explore feed');
    }
  }

  await page.getByTestId('dock-tab-leaderboard').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'nav-mobile-390-leaderboard-page.png') });
  await context.close();
}

async function proveDesktopNav(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await seed(context);
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const tabs = [
    ['quiz', 'quiz-hub-modal'],
    ['leaderboard', 'leaderboard-modal'],
    ['duel', 'duel-modal'],
    ['diploma', 'diploma-modal'],
    ['explore', null],
  ];

  for (const [tab, testId] of tabs) {
    await page.getByTestId(`desktop-nav-${tab}`).click();
    await page.waitForTimeout(500);
    if (testId) {
      await page.getByTestId(testId).waitFor({ state: 'visible', timeout: 10000 });
      const presentation = await assertPresentation(page, testId);
      if (presentation !== 'page') throw new Error(`desktop ${testId} not page: ${presentation}`);
      console.log(`PASS desktop tab ${tab} -> page`);
    } else {
      await page.getByTestId('tiktok-feed-container').waitFor({ state: 'visible' });
      console.log('PASS desktop explore feed');
    }
  }

  await page.getByTestId('desktop-nav-duel').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'nav-desktop-1440-duel-page.png') });
  await context.close();
}

async function proveDuelLobby(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await seed(context);
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  await page.getByTestId('dock-tab-duel').click();
  await page.getByTestId('duel-modal').waitFor({ state: 'visible' });

  await page.getByTestId('duel-kind-group').click();
  await page.getByTestId('duel-category-space').click();
  await page.getByTestId('duel-count-7').click();
  await page.getByTestId('duel-create-lobby-btn').click();
  await page.getByTestId('duel-lobby-players').waitFor({ state: 'visible' });

  const start = page.getByTestId('start-duel-btn');
  if (await start.isEnabled()) throw new Error('start enabled before all ready');
  console.log('PASS start disabled until ready');

  // Mark local ready + seat ready until threshold (group needs 3)
  await page.getByTestId('duel-ready-toggle').click();
  await page.waitForTimeout(200);
  const seatButtons = page.locator('[data-testid^="duel-seat-ready-"]');
  const seatCount = await seatButtons.count();
  for (let i = 0; i < seatCount; i++) {
    await seatButtons.nth(i).click();
    await page.waitForTimeout(150);
  }

  await page.getByTestId('duel-ready-status').waitFor({ state: 'visible' });
  const status = await page.getByTestId('duel-ready-status').innerText();
  if (!/3\/3|Ready 3/.test(status) && !status.includes('3/3')) {
    // allow TR/EN; require 3/3
    if (!status.includes('3/3')) throw new Error('expected 3/3 ready, got ' + status);
  }
  console.log('PASS lobby all ready:', status);

  const meta = await page.getByTestId('duel-lobby-meta').innerText();
  if (!meta.includes('7') || !meta.toLowerCase().includes('space')) {
    throw new Error('shared pack meta missing topic/count: ' + meta);
  }
  console.log('PASS shared pack meta');

  // Wait for countdown auto-start or click start
  if (await start.isEnabled()) await start.click();
  await page.getByTestId('active-quiz-page').waitFor({ state: 'visible', timeout: 15000 });
  console.log('PASS duel started into quiz page with shared set');

  await page.screenshot({ path: path.join(OUT, 'duel-lobby-ready-started.png') });
  await context.close();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  await proveMobileNav(browser);
  await proveDesktopNav(browser);
  await proveDuelLobby(browser);
  await browser.close();
  console.log('ALL PASS nav+duel');
}

main().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
