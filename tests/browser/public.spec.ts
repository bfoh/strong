import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('cinematic home remains usable and free of browser errors', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/'); await expect(page.getByRole('heading', { level: 1, name: 'Spaces Worth Living For.' })).toBeVisible();
  for (const name of [/A Different Standard/, /Find Your/, /Exceptional Places/, /Build Your Future/, /Guidance at/, /Rooted in Kumasi/, /Your Next Move/]) {
    await page.getByRole('heading', { level: 2, name }).scrollIntoViewIfNeeded();
  }
  await expect(page.getByText('Development preview.', { exact: true })).toBeVisible();
  await expect(page.locator('#categories a.category')).toHaveCount(3);
  for (const category of ['land', 'residential', 'commercial']) await expect(page.locator(`#categories a[href="/properties?category=${category}"]`)).toHaveCount(1);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.getByRole('heading', { level: 1, name: 'Spaces Worth Living For.' })).toBeVisible();
  expect(errors).toEqual([]);
  await page.screenshot({ path: `docs/qa/home-${info.project.name}.png`, fullPage: true });
});
test('URL filters, empty state and preview detail gallery work', async ({ page }) => {
  await page.goto('/properties');
  await page.getByLabel('SEARCH', { exact: true }).fill('family');
  await page.getByRole('button', { name: 'Find your space' }).click();
  await expect(page).toHaveURL(/q=family/); await expect(page.getByText('1 media preview · 1–1 shown', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Clear filters', exact: true }).click(); await expect(page.getByLabel('SEARCH', { exact: true })).toHaveValue('');
  await page.goBack(); await expect(page).toHaveURL(/q=family/); await expect(page.getByLabel('SEARCH', { exact: true })).toHaveValue('family');
  await page.getByRole('link', { name: /Family Residence/ }).click();
  await expect(page.getByRole('heading', { name: 'Family Residence', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send viewing request' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Explore gallery' }).click();
  await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible(); await expect(page.getByRole('button', { name: 'Explore gallery' })).toBeFocused();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto('/properties?category=land'); await expect(page.getByRole('heading', { name: 'No spaces found this time.' })).toBeVisible();
  await page.getByRole('link', { name: 'Clear all filters' }).click(); await expect(page).toHaveURL('/properties');
});
test('navigation, accessibility and narrow viewports', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  if (info.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Open navigation' }).click(); await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: /About Us/ }).click();
    await expect(page).toHaveURL('/about'); await expect(page.getByRole('dialog')).not.toBeVisible();
  }
  for (const route of ['/', '/properties', '/properties/executive-residence-preview', '/about', '/contact', '/book-viewing']) {
    await page.goto(route); const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(accessibility.violations, `${route}: ${accessibility.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target).join(', ')}`).join('; ')}`).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${route} horizontal overflow`).toBe(true);
  }
  await page.setViewportSize({ width: 320, height: 740 }); await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `docs/qa/narrow-${info.project.name}.png`, fullPage: true });
});
test('indexing, missing properties and protected admin routes', async ({ page, request }) => {
  await page.goto('/properties/executive-residence-preview');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  const sitemap = await request.get('/sitemap.xml'); expect(sitemap.ok()).toBe(true); expect(await sitemap.text()).not.toContain('executive-residence');
  const robots = await request.get('/robots.txt'); expect(await robots.text()).toContain('Disallow: /');
  await page.goto('/admin'); await expect(page).toHaveURL('/admin/login');
  const notFound = await request.get('/properties/unpublished-or-missing'); expect(notFound.status()).toBe(404);
  const invalid = await request.post('/api/enquiries', { data: { propertyId: 'demo-1', name: 'QA', phone: '+233 000 000 000' } }); expect(invalid.status()).toBe(400);
  const disabled = await request.post('/api/enquiries', { data: { propertyId: '11111111-1111-4111-8111-111111111111', name: 'QA', phone: '+233 000 000 000' } }); expect(disabled.status()).toBe(503);
  const unauthorised = await request.post('/api/admin/status', { data: {}, headers: { origin: 'http://127.0.0.1:3000' } }); expect(unauthorised.status()).toBe(401);
});
test('hero scrubs the supplied 451-frame sequence forwards and backwards', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('[data-hero]'), stage = page.locator('.cine-stage');
  await expect(page.locator('.cine-poster img')).toHaveAttribute('src', /\/cinematic\/hero\/desktop\/frame_0001\.webp$/);
  await expect(stage).toHaveAttribute('data-ready', 'true');
  const distance = await hero.evaluate(el => (el as HTMLElement).offsetHeight - innerHeight);
  const frameAt = async (progress: number) => {
    await page.evaluate(y => scrollTo(0, y), Math.round(distance * progress));
    await expect.poll(async () => Number(await hero.getAttribute('data-frame')), { timeout: 10000 }).toBe(Math.round(progress * 450) + 1);
    expect(Math.abs(await stage.evaluate(el => el.getBoundingClientRect().top))).toBeLessThan(1);
  };
  await frameAt(.5); await frameAt(1); await frameAt(.25);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('canvas.cine-canvas')).toBeHidden();
  await expect(page.locator('.cine-poster img')).toBeVisible();
  expect(await hero.evaluate(el => (el as HTMLElement).offsetHeight)).toBe(await page.evaluate(() => innerHeight));
});
