import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile, mkdir } from 'node:fs/promises';
process.loadEnvFile('.env.local');
function scrub(value) { let result = value; for (const name of ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'LIVE_TEST_ADMIN_PASSWORD']) if (process.env[name]) result = result.replaceAll(process.env[name], '[redacted]'); return result.slice(0, 1200); }
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000', directory = 'docs/visual-verification/cinematic-v2';
await mkdir(directory, { recursive: true });
const report = { checkedAt: new Date().toISOString(), profiles: [], shortViewports: [], unsupportedWebGL: {}, contextLoss: {}, passed: false };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
function check(value, message) { if (!value) throw Error(message); }
async function imagesReady(page, selector) {
  await page.locator(selector).evaluate(async element => { await Promise.all([...element.querySelectorAll('img')].map(image => image.decode().catch(() => {}))); });
  return page.locator(selector).evaluate(element => [...element.querySelectorAll('img')].every(image => image.complete && image.naturalWidth > 0));
}
try {
  for (const [profile, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, isMobile: profile === 'mobile', hasTouch: profile === 'mobile' });
    const page = await context.newPage(); const result = { profile, browserErrors: 0, errorDetails: [], screenshots: [], overflows: [] };
    page.on('pageerror', error => { result.browserErrors++; result.errorDetails.push(scrub(error.message)); }); page.on('console', message => { if (message.type() === 'error') { result.browserErrors++; result.errorDetails.push(scrub(message.text())); } });
    report.profiles.push(result);
    await page.goto(base); await page.waitForTimeout(2200);
    check(await imagesReady(page, '.hero-v2'), 'Hero asset did not load');
    await page.screenshot({ path: `${directory}/arrival-${profile}.png` });
    await page.locator('#architecture').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => ['webgl', 'lightweight', 'unsupported'].includes(document.querySelector('#architecture')?.dataset.sceneMode));
    result.sceneMode = await page.locator('#architecture').getAttribute('data-scene-mode');
    if (result.sceneMode === 'webgl') {
      const reveal = page.getByRole('button', { name: 'Reveal', exact: true }); await reveal.focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(() => Math.abs(Number(document.querySelector('.journey-surface')?.dataset.cameraProgress) - .26) < .001);
      result.keyboardCameraPosition = await page.locator('.journey-surface').getAttribute('data-camera-position');
      result.cameraDimensions = await page.locator('.journey-surface').evaluate(el => ({ width: el.clientWidth, height: el.clientHeight }));
      await page.screenshot({ path: `${directory}/journey-${profile}.png` });
      const lastProgress = await page.locator('.journey-surface').getAttribute('data-camera-progress');
      await page.getByRole('button', { name: 'Opportunity', exact: true }).click();
      await page.waitForFunction(() => Number(document.querySelector('.journey-surface')?.dataset.cameraProgress) > .99);
      result.keyboardControlsWork = lastProgress !== await page.locator('.journey-surface').getAttribute('data-camera-progress');
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('#architecture')?.dataset.sceneMode === 'reduced-motion');
    result.reducedMotionFallback = await page.locator('.journey-surface canvas').count() === 0;
    result.reducedMotionHeight = await page.locator('#architecture').evaluate(el => el.clientHeight);
    check(result.reducedMotionFallback && result.reducedMotionHeight < 1100, 'Reduced-motion fallback left a blank extended scroll range');
    await page.locator('#architecture').scrollIntoViewIfNeeded(); await page.screenshot({ path: `${directory}/reduced-motion-${profile}.png` });
    for (const [selector, name] of [['.hero-v2', 'hero'], ['#collection', 'collection'], ['#possibilities', 'categories'], ['#philosophy', 'philosophy'], ['#kumasi', 'kumasi'], ['.confidence-v2', 'confidence'], ['.closing-v2', 'closing']]) {
      await page.locator(selector).scrollIntoViewIfNeeded(); check(await imagesReady(page, selector), `${name} has an unloaded image`);
      await page.locator(selector).screenshot({ path: `${directory}/${name}-${profile}.png` }); result.screenshots.push(`${name}-${profile}.png`);
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) result.overflows.push(name);
    }
    result.brandImages = await page.locator('.hero-v2 img,.category-panel-v2 img,.philosophy-v2 img,.closing-v2 img').evaluateAll(images => images.map(image => new URL(image.currentSrc, location.href).searchParams.get('url') || image.getAttribute('src')));
    check(result.brandImages.length === 6 && new Set(result.brandImages).size === 6, 'Major sections repeat their image');
    result.decorativeNumberLabels = await page.locator('main .section-index,main .chapter-count,main .category-number,main .scene-label,main .principle>span,.mobile-menu nav small').count();
    check(result.decorativeNumberLabels === 0, 'Decorative numbering remains');
    const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    result.accessibilityViolations = accessibility.violations.map(v => ({ id: v.id, targets: v.nodes.map(node => node.target) }));
    check(result.accessibilityViolations.length === 0, 'Homepage accessibility violations found');
    await page.screenshot({ path: `${directory}/home-${profile}-full.png`, fullPage: true });
    if (profile === 'mobile') {
      await page.getByRole('button', { name: 'Open navigation' }).click();
      await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Our philosophy', exact: true }).click();
      await page.waitForURL(url => url.pathname === '/about');
    }
    await page.goto(base); await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('.category-panel-v2.category-land').click(); await page.waitForURL(url => url.searchParams.get('category') === 'land');
    await page.goto(base); await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 320, height: 740 });
    result.narrowOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    check(!result.narrowOverflow && result.overflows.length === 0, 'Horizontal overflow found');
    check(result.browserErrors === 0, 'Browser errors found');
    await context.close();
  }
  for (const viewport of [{ width: 844, height: 390 }, { width: 568, height: 320 }, { width: 1440, height: 600 }]) {
    const short = await browser.newPage({ viewport }); await short.goto(base); await short.locator('#architecture').scrollIntoViewIfNeeded();
    await short.waitForFunction(() => document.querySelector('#architecture')?.dataset.sceneMode === 'webgl');
    await short.getByRole('button', { name: 'Reveal', exact: true }).click();
    await short.waitForFunction(() => Number(document.querySelector('.journey-surface')?.dataset.cameraProgress) > .25);
    const dimensions = await short.locator('#architecture').evaluate(el => ({ viewportWidth: innerWidth, viewportHeight: innerHeight, stickyHeight: el.querySelector('.journey-sticky').clientHeight, controlsBottom: el.querySelector('.journey-bottom').getBoundingClientRect().bottom, overflow: document.documentElement.scrollWidth > innerWidth }));
    check(dimensions.controlsBottom <= dimensions.viewportHeight && !dimensions.overflow, 'Short-viewport controls are clipped');
    report.shortViewports.push(dimensions); await short.screenshot({ path: `${directory}/landscape-${viewport.width}x${viewport.height}.png` }); await short.close();
  }
  const unsupported = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await unsupported.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type === 'webgl2' || type === 'webgl' ? null : original.call(this, type, ...args); }; });
  await unsupported.goto(base); await unsupported.locator('#architecture').scrollIntoViewIfNeeded();
  await unsupported.waitForFunction(() => document.querySelector('#architecture')?.dataset.sceneMode === 'unsupported');
  report.unsupportedWebGL = { simulated: true, fallbackVisible: await unsupported.locator('.journey-fallback').isVisible(), canvasCount: await unsupported.locator('.journey-surface canvas').count(), height: await unsupported.locator('#architecture').evaluate(el => el.clientHeight) };
  check(report.unsupportedWebGL.fallbackVisible && report.unsupportedWebGL.canvasCount === 0 && report.unsupportedWebGL.height < 1100, 'Unsupported-WebGL fallback failed');
  await unsupported.screenshot({ path: `${directory}/webgl-unsupported.png` }); await unsupported.close();
  const lost = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await lost.goto(base); await lost.locator('#architecture').scrollIntoViewIfNeeded();
  await lost.waitForFunction(() => document.querySelector('#architecture')?.dataset.sceneMode === 'webgl');
  await lost.locator('.journey-surface canvas').evaluate(canvas => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await lost.waitForFunction(() => document.querySelector('#architecture')?.dataset.sceneMode === 'unsupported');
  report.contextLoss = { forced: true, fallbackVisible: await lost.locator('.journey-fallback').isVisible(), canvasCount: await lost.locator('.journey-surface canvas').count() };
  check(report.contextLoss.fallbackVisible && report.contextLoss.canvasCount === 0, 'Context-loss fallback failed');
  await lost.locator('#architecture').scrollIntoViewIfNeeded(); await lost.screenshot({ path: `${directory}/webgl-context-loss.png` }); await lost.close();
  report.passed = true;
} catch (error) { report.failure = error instanceof Error ? error.message : 'Layout verification failed'; }
finally { await browser.close(); await writeFile(`${directory}/layout-verification.json`, JSON.stringify(report, null, 2) + '\n'); }
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.passed ? 0 : 1;
