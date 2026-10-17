import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('private house preview has one site shell and keeps direct and return navigation', async ({ page, request }, info) => {
  await page.goto('/preview/house', { waitUntil: 'networkidle' });
  await expect(page.locator('.house-home')).toHaveAttribute('data-enhanced', 'true');
  await expect(page.locator('header')).toHaveCount(1);
  await expect(page.locator('footer')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText('A place for what’s next.');
  await page.locator('.house-actions a[href="#contact"]').click();
  await expect(page).toHaveURL(/\/preview\/house#contact$/);
  await expect(page.locator('#view-contact')).toBeFocused();
  await page.locator('#contact .house-back').click();
  await expect(page.locator('.house-home')).toHaveAttribute('data-view', 'hallway');
  await page.locator('#door-listings').click();
  await expect(page.locator('.house-home')).toHaveAttribute('data-view', 'listings');
  await page.goBack();
  await expect(page.locator('.house-home')).toHaveAttribute('data-view', 'hallway');
  if (info.project.name === 'desktop') {
    const homepage = await request.get('/', { headers: { Host: 'strong-properties.invalid' } });
    expect(homepage.status()).toBe(200);
    const preview = await request.get('/preview/house', { headers: { Host: 'strong-properties.invalid' } });
    expect(preview.status()).toBe(404);
    const origin = new URL(process.env.TEST_BASE_URL || 'http://127.0.0.1:3000').origin;
    const acknowledgement = await request.post('/api/house-enquiries', {
      headers: { Origin: origin },
      form: { requestId: randomUUID(), name: '', phone: '' },
    });
    expect(acknowledgement.status()).toBe(400);
    expect(await acknowledgement.text()).toContain('href="/contact"');
  }
});
