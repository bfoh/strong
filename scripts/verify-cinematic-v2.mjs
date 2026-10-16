// Browser evidence from the actual WebGL camera, not a simulated scroll model.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const directory = 'docs/visual-verification/cinematic-v2';
await mkdir(directory, { recursive: true });
const report = { checkedAt: new Date().toISOString(), base, frames: [], reverseScroll: false, browserErrors: 0, failedRequests: 0, cancelledNavigationPrefetches: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
function check(value, message) { if (!value) throw Error(message); }
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  page.on('pageerror', () => report.browserErrors++);
  page.on('console', message => { if (message.type() === 'error') report.browserErrors++; });
  page.on('requestfailed', request => { const path = new URL(request.url()).pathname; if (request.failure()?.errorText === 'net::ERR_ABORTED' && ['/properties', '/about', '/contact'].includes(path)) report.cancelledNavigationPrefetches.push(path); else if (!path.endsWith('/_next/webpack-hmr')) report.failedRequests++; });
  await page.goto(base);
  const journey = page.locator('#architecture');
  await journey.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('#architecture')?.dataset.sceneMode === 'webgl', { timeout: 30000 });
  async function capture(progress, name) {
    await journey.evaluate((el, progress) => {
      const sticky = el.querySelector('.journey-sticky'), header = document.querySelector('header');
      const start = el.getBoundingClientRect().top + scrollY - header.getBoundingClientRect().height;
      scrollTo({ top: start + (el.clientHeight - sticky.clientHeight) * progress, behavior: 'instant' });
    }, progress);
    await page.waitForFunction(value => { const actual = Number(document.querySelector('.journey-surface')?.dataset.cameraProgress); return Number.isFinite(actual) && Math.abs(actual - value) < .0004; }, progress, { timeout: 20000 });
    const measured = await page.locator('.journey-surface').evaluate(el => ({ scrollProgress: Number(el.dataset.cameraProgress), cameraPosition: el.dataset.cameraPosition.split(',').map(Number), cameraTarget: el.dataset.cameraTarget.split(',').map(Number), meshes: Number(el.dataset.meshCount), drawCalls: Number(el.dataset.drawCalls), triangles: Number(el.dataset.triangles), width: el.clientWidth, height: el.clientHeight, canvasPresent: Boolean(el.querySelector('canvas')) }));
    check(measured.canvasPresent && measured.meshes > 20 && measured.width > 1000 && measured.height > 600, 'Viewport-scale real geometry was not demonstrated');
    check(Math.abs(measured.scrollProgress - progress) < .015, 'Camera did not track scroll progress');
    await page.screenshot({ path: `${directory}/${name}.png` });
    return { requestedProgress: progress, ...measured, screenshot: `${name}.png` };
  }
  for (const [progress, name] of [[0, 'journey-000'], [.25, 'journey-025'], [.5, 'journey-050'], [.75, 'journey-075'], [1, 'journey-100']]) report.frames.push(await capture(progress, name));
  const reverse = await capture(.25, 'journey-reverse-025');
  report.reverseFrame = reverse;
  report.reverseScroll = reverse.cameraPosition.every((value, i) => Math.abs(value - report.frames[1].cameraPosition[i]) < .03);
  check(report.reverseScroll, 'Reverse scrolling did not restore the actual camera viewpoint');
  check(new Set(report.frames.map(frame => frame.cameraPosition.join(','))).size === 5, 'Actual camera positions did not change');
  await page.locator('#collection').scrollIntoViewIfNeeded();
  check(await page.locator('#collection').isVisible(), 'Collection did not follow the architectural journey');
  await page.screenshot({ path: `${directory}/journey-to-collection.png` });
  report.noHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  check(report.noHorizontalOverflow, 'Horizontal overflow found');
  check(report.browserErrors === 0, 'Browser errors found');
  check(report.failedRequests === 0, 'Failed requests found');
  report.passed = true;
} catch (error) { report.passed = false; report.failure = error instanceof Error ? error.message : 'Browser verification failed'; }
finally { await browser.close(); await writeFile(`${directory}/journey-verification.json`, JSON.stringify(report, null, 2) + '\n'); }
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.passed ? 0 : 1;
