import { chromium } from '@playwright/test';
import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const temporary = await mkdtemp(join(tmpdir(), 'strong-cinematic-recording-'));
const target = 'docs/visual-verification/cinematic-v2/architectural-journey.webm';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let context;
try {
  await mkdir('docs/visual-verification/cinematic-v2', { recursive: true });
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, recordVideo: { dir: temporary, size: { width: 640, height: 444 } } });
  const page = await context.newPage(); await page.goto(process.env.TEST_BASE_URL || 'http://127.0.0.1:3000');
  await page.locator('#architecture').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('#architecture')?.dataset.sceneMode === 'webgl');
  async function seek(progress) { await page.locator('#architecture').evaluate((el, progress) => { const sticky = el.querySelector('.journey-sticky'); const start = el.getBoundingClientRect().top + scrollY - document.querySelector('header').getBoundingClientRect().height; scrollTo({ top: start + progress * (el.clientHeight - sticky.clientHeight), behavior: 'instant' }); }, progress); }
  await seek(0); await page.waitForTimeout(2000);
  for (let i = 1; i <= 30; i++) { await seek(i / 30); await page.waitForTimeout(140); }
  await page.waitForTimeout(2000);
  for (let i = 28; i >= 8; i -= 2) { await seek(i / 30); await page.waitForTimeout(120); }
  await page.waitForTimeout(1500);
  await page.locator('#collection').scrollIntoViewIfNeeded(); await page.waitForTimeout(1000);
  const video = page.video(); console.log('Captured actual camera motion; exporting compact WebM.'); await context.close(); await copyFile(await video.path(), target);
  console.log(JSON.stringify({ recordedRealBrowser: true, actualWebGL: true, forwardAndReverse: true, video: target }));
} finally { await context?.close().catch(() => {}); await browser.close().catch(() => {}); await rm(temporary, { recursive: true, force: true }); }
