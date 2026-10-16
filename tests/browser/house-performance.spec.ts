import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
test.use({ trace: 'off' });
test('production cold-load lab samples', async ({ browser }, info) => {
  test.setTimeout(180000);
  const mobile = info.project.name === 'mobile', samples = [];
  for (let i = 0; i < 3; i++) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage(), cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: mobile ? 150 : 20, downloadThroughput: mobile ? 200000 : 1250000, uploadThroughput: mobile ? 93750 : 625000 });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: mobile ? 4 : 1 });
      await page.addInitScript(() => {
        const target = window as unknown as Window & { __houseLab: { lcp: number; cls: number; longTasks: number[]; eventDurations: number[] } };
        target.__houseLab = { lcp: 0, cls: 0, longTasks: [], eventDurations: [] };
        new PerformanceObserver(list => { for (const entry of list.getEntries()) target.__houseLab.lcp = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver(list => { for (const entry of list.getEntries()) { const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number }; if (!shift.hadRecentInput) target.__houseLab.cls += shift.value; } }).observe({ type: 'layout-shift', buffered: true });
        new PerformanceObserver(list => { for (const entry of list.getEntries()) target.__houseLab.longTasks.push(entry.duration); }).observe({ type: 'longtask', buffered: true });
        if (PerformanceObserver.supportedEntryTypes.includes('event')) new PerformanceObserver(list => { for (const entry of list.getEntries()) target.__houseLab.eventDurations.push(entry.duration); }).observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
      });
      await page.goto('http://127.0.0.1:3000/preview/house', { waitUntil: 'networkidle' });
      await expect(page.locator('.house-home')).toHaveAttribute('data-enhanced', 'true');
      await page.locator('.house-poster img').evaluate((img: HTMLImageElement) => img.decode());
      const initial = await page.evaluate(() => {
        const target = window as unknown as Window & { __houseLab: { lcp: number; cls: number; longTasks: number[]; eventDurations: number[] } };
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return { ...target.__houseLab, documentTiming: { firstByteMs: navigation.responseStart, responseEndMs: navigation.responseEnd, domContentLoadedMs: navigation.domContentLoadedEventEnd }, imageTransferBytes: resources.filter(r => /\.(webp|jpg|png)(\?|$)/.test(r.name)).reduce((n, r) => n + r.encodedBodySize, 0), imageRequests: resources.filter(r => /house-v1.*\.(webp|jpg)/.test(r.name)).map(r => ({ path: new URL(r.name).pathname, bytes: r.encodedBodySize, startMs: r.startTime, responseEndMs: r.responseEnd })), totalTransferBytes: resources.reduce((n,r) => n + r.transferSize, 0) };
      });
      const start = performance.now();
      await page.locator('.house-actions a[href="#listings"]').click();
      await expect(page.locator('.house-home')).toHaveAttribute('data-view', 'listings');
      const navigationCompleteMs = performance.now() - start;
      const events = await page.evaluate(() => (window as unknown as Window & { __houseLab: { eventDurations: number[] } }).__houseLab.eventDurations);
      samples.push({ ...initial, navigationCompleteMs, eventDurations: events, maxLongTaskMs: Math.max(0, ...initial.longTasks) });
    } finally { await context.close(); }
  }
  const median = (values: number[]) => [...values].sort((a,b) => a-b)[Math.floor(values.length/2)];
  await mkdir('docs/visual-verification/house-v1', { recursive: true });
  await writeFile('docs/visual-verification/house-v1/performance-' + info.project.name + '.json', JSON.stringify({
    kind: 'Local production lab only; no physical-device tests, field p75 or measured INP certification',
    conditions: { viewport: mobile ? '390x844' : '1440x900', dpr: 1, cpuThrottle: mobile ? 4 : 1, latencyMs: mobile ? 150 : 20, downloadBytesPerSecond: mobile ? 200000 : 1250000, cacheDisabled: true },
    median: { lcpMs: median(samples.map(s => s.lcp)), cls: median(samples.map(s => s.cls)), initialImageBytes: median(samples.map(s => s.imageTransferBytes)), navigationCompleteMs: median(samples.map(s => s.navigationCompleteMs)) }, samples
  }, null, 2));
});
