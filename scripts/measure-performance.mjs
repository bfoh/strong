import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const filter = process.env.PROFILE_FILTER;
const outputPath = process.env.PERFORMANCE_OUTPUT_PATH || 'docs/qa/performance.json';
const previous = filter ? JSON.parse(await readFile(outputPath, 'utf8')).results : [];
const results = previous.filter(row => row.profile !== filter);
try {
  for (const profile of filter ? [filter] : ['desktop-local', 'mobile-simulated-4g']) {
    for (let run = 1; run <= 3; run++) {
      const context = await browser.newContext({ viewport: profile === 'desktop-local' ? { width: 1440, height: 900 } : { width: 390, height: 844 }, deviceScaleFactor: profile === 'desktop-local' ? 1 : 2, isMobile: profile !== 'desktop-local', hasTouch: profile !== 'desktop-local' });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      if (profile !== 'desktop-local') {
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 });
      }
      await page.addInitScript(() => {
        window.__strongVitals = { lcp: 0, shifts: [], interactions: [], longTasks: 0 };
        new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__strongVitals.lcp = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__strongVitals.shifts.push({ time: entry.startTime, value: entry.value }); }).observe({ type: 'layout-shift', buffered: true });
        new PerformanceObserver(list => { for (const entry of list.getEntries()) if (entry.interactionId) window.__strongVitals.interactions.push(entry.duration); }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
        new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__strongVitals.longTasks += Math.max(0, entry.duration - 50); }).observe({ type: 'longtask', buffered: true });
      });
      await page.goto(process.env.TEST_BASE_URL || 'http://127.0.0.1:3000', { waitUntil: 'networkidle' });
      const initialCanvasCount = await page.locator('canvas.sequence-canvas').count();
      await page.getByRole('link', { name: 'SCROLL TO DISCOVER', exact: true }).focus();
      await page.keyboard.press('Enter');
      await page.locator('#architecture').scrollIntoViewIfNeeded();
      const metrics = await page.evaluate(() => {
        const v = window.__strongVitals;
        let cls = 0, session = 0, first = 0, last = 0;
        for (const shift of v.shifts) {
          if (shift.time - last < 1000 && shift.time - first < 5000) session += shift.value;
          else { session = shift.value; first = shift.time; }
          last = shift.time; cls = Math.max(cls, session);
        }
        const nav = performance.getEntriesByType('navigation')[0];
        return { lcpMs: Math.round(v.lcp), cls: Number(cls.toFixed(4)), sampledInteractionMs: v.interactions.length ? Math.max(...v.interactions) : null, blockingTimeEstimateMs: Math.round(v.longTasks), ttfbMs: Math.round(nav.responseStart), transferredBytes: performance.getEntriesByType('resource').reduce((sum, resource) => sum + (resource.transferSize || 0), 0) };
      });
      results.push({ profile, run, initialCanvasCount, ...metrics }); await context.close();
    }
  }
} finally { await browser.close(); }
await writeFile(outputPath, JSON.stringify({ methodology: 'Production Next.js build, Chrome headless, fresh browser context and disabled cache per run. Mobile simulation: 390×844 at DPR 2, 4× CPU slowdown, 150ms latency, 1.6Mbps download. Single keyboard activation of the scroll link sampled; avoids pointer stability polling on the animated hero. Chrome software rendering used on this host. Lab results; not field p75 Core Web Vitals. Interaction sample is not a certified INP measurement.', results }, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
