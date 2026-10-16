import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const base = process.env.LIVE_PUBLIC_TEST_URL;
test.skip(!base, 'Requires an explicitly selected live-configured local preview. Read-only; no fixtures or submissions.');

test('live-configured cinematic home, navigation and responsive layout remain usable', async ({ page }, info) => {
  let browserErrors = 0;
  page.on('pageerror', () => browserErrors++);
  page.on('console', message => { if (message.type() === 'error') browserErrors++; });
  await page.goto(`${base}/`);
  await expect(page.getByRole('heading', { name: 'Exceptional Properties in Kumasi.' })).toBeVisible();
  for (const name of [/More than property/, /Discover the/, /Your next chapter/]) await page.getByRole('heading', { name }).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.getByRole('heading', { name: 'Exceptional Properties in Kumasi.' })).toBeVisible();
  expect(browserErrors).toBe(0);
  if (info.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: /Our philosophy/ }).click();
    await expect(page).toHaveURL(`${base}/about`); await expect(page.getByRole('dialog')).not.toBeVisible();
  }
  await page.setViewportSize({ width: 320, height: 740 }); await page.goto(`${base}/`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('live public pages remain accessible and administration stays private', async ({ page, request }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ['/', '/properties', '/about', '/contact', '/admin/login']) {
    await page.goto(`${base}${route}`);
    const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(accessibility.violations.map(v => v.id), `${route} accessibility`).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  const protectedPage = await request.get(`${base}/admin`); expect(protectedPage.url()).toContain('/admin/login');
  const missing = await request.get(`${base}/properties/strong-qa-nonexistent-property`); expect(missing.status()).toBe(404);
});
