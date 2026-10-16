import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844], ['tablet', 768, 1024], ['laptop', 1024, 768], ['narrow', 320, 740]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    for (const [route, label] of [['/', 'home'], ['/properties', 'catalogue'], ['/properties/executive-residence-preview', 'detail']]) {
      await page.goto(`http://127.0.0.1:3000${route}`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement?.blur(); });
      if (!(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))) throw Error(`${name} ${route}: horizontal overflow`);
      if (['desktop', 'mobile'].includes(name)) {
        await page.screenshot({ path: `docs/qa/${label}-${name}.png`, fullPage: true });
        if (route === '/') await page.screenshot({ path: `docs/qa/hero-${name}.png` });
      }
    }
    await context.close();
  }
} finally { await browser.close(); }
console.log('Clean local preview screenshots saved in docs/qa.');
