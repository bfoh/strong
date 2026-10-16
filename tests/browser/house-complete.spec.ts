import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const dir = 'docs/visual-verification/house-v1/checkpoint2';
test('final doorway continuity, exact reverse and destination reveal', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await mkdir(dir, { recursive: true });
  await page.goto('/preview/house', { waitUntil: 'networkidle' });
  await expect(page.locator('.house-canvas')).toHaveClass(/is-ready/);
  const travel = await page.locator('.house-arrival').evaluate(el => el.clientHeight - innerHeight);
  expect(travel).toBe(2160);
  await page.screenshot({ path: dir + '/desktop-exterior.png' });
  let midpoint = '';
  for (const p of [.25, .5, .75, 1]) {
    await page.evaluate(y => scrollTo(0, y), travel * p);
    await expect(page.locator('.house-canvas')).toHaveAttribute('data-progress', p.toFixed(4));
    await page.screenshot({ path: dir + '/arrival-' + p + '.png' });
    if (p === .5) midpoint = createHash('sha256').update(await page.locator('canvas').screenshot()).digest('hex');
  }
  await page.evaluate(y => scrollTo(0, y), travel * .5);
  await expect(page.locator('.house-canvas')).toHaveAttribute('data-progress', '0.5000');
  expect(createHash('sha256').update(await page.locator('canvas').screenshot()).digest('hex')).toBe(midpoint);
  await page.evaluate(y => scrollTo(0, y), travel);
  await page.locator('#door-listings').click();
  await expect(page.locator('.house-home')).toHaveAttribute('data-transition', 'true');
  await expect(page.locator('#listings')).toBeHidden();
  await page.waitForTimeout(300);
  await page.screenshot({ path: dir + '/listing-door-in-motion.png' });
  await expect(page.locator('.house-home')).toHaveAttribute('data-view', 'listings');
  await expect(page.locator('#view-listings')).toBeFocused();
});
test('completed house journey, gallery, returns, form retention and keyboard', async ({ page }, info) => {
  await mkdir(dir, { recursive: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/preview/house#hallway', { waitUntil: 'networkidle' });
  await expect(page.locator('.house-home')).toHaveAttribute('data-view', 'hallway');
  if (info.project.name === 'desktop') await expect(page.locator('.house-canvas')).toHaveClass(/is-ready/);
  await page.screenshot({ path: dir + '/' + info.project.name + '-hallway.png' });
  for (const room of ['team', 'contact', 'listings']) {
    await page.locator('#door-' + room).click();
    await expect(page.locator('.house-home')).toHaveAttribute('data-view', room);
    await expect(page.locator('#view-' + room)).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: dir + '/' + info.project.name + '-' + room + '.png' });
    const section = room === 'team' ? '#our-team' : '#' + room;
    await page.locator(section + ' .house-back').click();
    await expect(page.locator('.house-home')).toHaveAttribute('data-view', 'hallway');
  }
  await page.locator('#door-listings').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.house-home')).toHaveAttribute('data-view', 'listings');
  await page.getByRole('link', { name: 'The Garden Residence', exact: true }).click();
  await expect(page.locator('.house-home')).toHaveAttribute('data-view', 'property');
  for (const label of ['Front', 'Front left', 'Left side', 'Rear', 'Right side', 'Front right']) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator('.house-angle-bar>p')).toContainText(label);
    await expect(page.locator('.house-gallery img')).toHaveJSProperty('complete', true);
    expect(await page.locator('.house-gallery img').evaluate((el: HTMLImageElement) => el.naturalWidth > 0)).toBe(true);
  }
  await page.keyboard.press('ArrowLeft'); await expect(page.locator('.house-angle-bar>p')).toContainText('Right side');
  await expect(page.locator('.house-gallery img')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: dir + '/' + info.project.name + '-gallery.png' });
  await page.goBack();
  await expect(page.locator('.house-home')).toHaveAttribute('data-view', 'listings');
  await expect(page.locator('#house-listing-concept-residence')).toBeFocused();
  await page.locator('#listings .house-back').click();
  await expect(page.locator('.house-home')).toHaveAttribute('data-view', 'hallway');
  if (info.project.name === 'desktop') {
    await page.locator('#door-team').click(); await expect(page.locator('.house-home')).toHaveAttribute('data-transition', 'true');
    await page.keyboard.press('Escape');
    await expect(page.locator('.house-home')).toHaveAttribute('data-view', 'hallway');
    await expect(page.locator('.house-home')).toHaveAttribute('data-transition', 'false');
  }
  await page.locator('#door-contact').click();
  await expect(page.locator('.house-home')).toHaveAttribute('data-view', 'contact');
  await page.getByLabel('Your name', { exact: true }).fill('Local form check');
  await page.getByLabel('Phone number', { exact: true }).fill('+000 000 000 001');
  await page.getByLabel('Your message', { exact: false }).fill('Local UI failure check; never delivered.');
  await page.route('**/api/house-enquiries', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Synthetic unavailable response' }) }));
  await page.getByRole('button', { name: 'Send my enquiry', exact: true }).click();
  await expect(page.locator('.house-contract [role=alert]')).toContainText('Synthetic unavailable response');
  await expect(page.getByLabel('Your name', { exact: true })).toHaveValue('Local form check');
  await page.locator('#contact .house-back').click();
  await expect(page.locator('.house-home')).toHaveAttribute('data-view', 'hallway');
  await page.locator('#door-contact').click();
  await expect(page.locator('.house-home')).toHaveAttribute('data-view', 'contact');
  await expect(page.getByLabel('Your name', { exact: true })).toHaveValue('Local form check');
  const audit = await new AxeBuilder({ page }).include('.house-home').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
  await writeFile(dir + '/' + info.project.name + '-accessibility.json', JSON.stringify(audit.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), null, 2));
  expect(audit.violations.map(v => v.id)).toEqual([]);
  expect(errors).toEqual([]);
});
test('compact short phones, landscape, enlarged text and reduced motion', async ({ page }, info) => {
  if (info.project.name === 'mobile') {
    for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      await page.goto('/preview/house', { waitUntil: 'networkidle' });
      await expect(page.locator('.house-actions a[href="#listings"]')).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: dir + '/phone-' + viewport.width + 'x' + viewport.height + '.png' });
      await page.goto('/preview/house#contact');
      await expect(page.locator('.house-home')).toHaveAttribute('data-view', 'contact');
      await page.getByLabel('Your name', { exact: true }).fill('Small-screen check');
      expect(await page.getByLabel('Your name', { exact: true }).evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/preview/house#listings');
    await page.addStyleTag({ content: '.house-home{font-size:200%}.house-room-lede{font-size:32px!important}' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/preview/house', { waitUntil: 'networkidle' });
  await expect(page.locator('.house-home')).toHaveAttribute('data-motion', 'compact');
  await expect(page.locator('.house-utilities button')).toHaveText(' Motion off');
  expect(await page.locator('.house-arrival').evaluate(el => el.clientHeight)).toBeLessThanOrEqual((page.viewportSize()?.height || 0) + 2);
  await page.locator('.house-actions a[href="#contact"]').click();
  await expect(page.locator('.house-home')).toHaveAttribute('data-view', 'contact');
  if (info.project.name === 'desktop') {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.route('**/hallway-desktop.webp', route => route.abort());
    await page.goto('/preview/house', { waitUntil: 'networkidle' });
    await expect(page.locator('.house-home')).toHaveAttribute('data-motion', 'compact');
    expect(await page.locator('.house-arrival').evaluate(el => el.clientHeight)).toBeLessThanOrEqual(901);
    await page.locator('.house-actions a[href="#contact"]').click();
    await expect(page.locator('.house-home')).toHaveAttribute('data-view', 'contact');
  }
});
test('canvas unavailable and browser data saver preserve compact access', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop');
  for (const capability of ['canvas', 'saveData']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    try {
      await context.addInitScript(mode => {
        if (mode === 'canvas') Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: () => null });
        else Object.defineProperty(navigator, 'connection', { value: Object.assign(new EventTarget(), { saveData: true }) });
      }, capability);
      const page = await context.newPage(), images: string[] = [];
      page.on('request', request => { if (/house-v1\/.*-desktop\.webp/.test(request.url())) images.push(request.url()); });
      await page.goto('http://127.0.0.1:3000/preview/house', { waitUntil: 'networkidle' });
      await expect(page.locator('.house-home')).toHaveAttribute('data-motion', 'compact');
      expect(await page.locator('.house-arrival').evaluate(el => el.clientHeight)).toBeLessThanOrEqual(901);
      if (capability === 'saveData') expect(images.every(url => url.endsWith('/exterior-desktop.webp'))).toBe(true);
      await page.locator('.house-actions a[href="#contact"]').click();
      await expect(page.locator('.house-home')).toHaveAttribute('data-view', 'contact');
      await expect(page.getByLabel('Your name', { exact: true })).toBeVisible();
      if (capability === 'saveData') expect(images.some(url => /\/(hallway|team|listings)-desktop\.webp/.test(url))).toBe(false);
    } finally { await context.close(); }
  }
});
test('initial HTML, metadata, no-JavaScript navigation and protected editor', async ({ page, request, browser }, info) => {
  test.skip(info.project.name !== 'desktop');
  const response = await request.get('/preview/house'), html = await response.text();
  expect(response.status()).toBe(200);
  for (const text of ['Land, homes and commercial property in Kumasi', 'Property enquiry', 'The Garden Residence', 'Our Team']) expect(html).toContain(text);
  expect(html).toMatch(/name="robots" content="noindex, nofollow, noarchive"/);
  expect(html).not.toContain('rel="canonical"');
  const robots = await request.get('/robots.txt'); expect(await robots.text()).toContain('Disallow: /');
  const sitemap = await request.get('/sitemap.xml'); expect(await sitemap.text()).not.toContain('/preview/house');
  const denied = await request.put('/api/admin/house-settings', { headers: { Origin: 'http://127.0.0.1:3000' }, data: {} }); expect(denied.status()).toBe(403);
  await page.goto('/admin'); await expect(page).toHaveURL(/admin\/login/);
  const plain = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  try {
    const p = await plain.newPage(); await p.goto('http://127.0.0.1:3000/preview/house');
    await p.locator('.house-actions a[href="#listings"]').click();
    await expect(p.locator('#view-listings')).toBeVisible();
    await expect(p.locator('#contact')).toBeVisible();
    await expect(p.locator('form.house-contract')).toHaveAttribute('method', 'post');
    await p.screenshot({ path: dir + '/no-javascript.png' });
  } finally { await plain.close(); }
});
