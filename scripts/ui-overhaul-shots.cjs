const { chromium } = require('playwright');
const path = require('path');

const outDir = process.argv[2];
const base = 'http://127.0.0.1:3450/';
const sizes = [
  { w: 375, h: 812, name: '375' },
  { w: 768, h: 1024, name: '768' },
  { w: 1280, h: 800, name: '1280' },
  { w: 1440, h: 900, name: '1440' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);

  async function dismissChrome() {
    for (const sel of [
      '[data-testid="welcome-start-btn"]',
      '[data-testid="cookie-accept-btn"]',
      '[data-testid="cookie-dismiss-btn"]',
      '[data-testid="mini-onboarding-dismiss"]',
      '[data-testid="pwa-dismiss-btn"]',
    ]) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 800 })) await el.click({ timeout: 1000 });
      } catch {
        // ignore
      }
    }
  }

  async function forceTheme(dark) {
    await page.evaluate((isDark) => {
      try {
        const key = 'merak_user_state_v1';
        const raw = localStorage.getItem(key);
        const state = raw ? JSON.parse(raw) : {};
        state.darkMode = isDark;
        localStorage.setItem(key, JSON.stringify(state));
      } catch {
        // ignore
      }
      document.documentElement.classList.toggle('dark', isDark);
      const shell = document.querySelector('[data-testid="reels-desktop-shell"]');
      if (shell) shell.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }, dark);

    // Prefer real toggle so React state matches
    const toggle = page.locator('[data-testid="theme-toggle-btn"]').first();
    try {
      if (await toggle.isVisible({ timeout: 1000 })) {
        const current = await page.locator('[data-testid="reels-desktop-shell"]').getAttribute('data-theme');
        const want = dark ? 'dark' : 'light';
        if (current !== want) await toggle.click();
      }
    } catch {
      // ignore
    }
    await page.waitForTimeout(400);
  }

  await dismissChrome();

  for (const theme of ['dark', 'light']) {
    await forceTheme(theme === 'dark');
    await dismissChrome();
    for (const s of sizes) {
      await page.setViewportSize({ width: s.w, height: s.h });
      await page.waitForTimeout(500);
      await dismissChrome();
      const file = path.join(outDir, `ui-overhaul-${s.name}-${theme}.png`);
      await page.screenshot({ path: file, fullPage: false });
      console.log('wrote', file);
    }
  }

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
