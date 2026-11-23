import { expect, test } from '@playwright/test';
import { otvoriChisto } from './pomoshtni';

/**
 * На широк екран дясната колона се плъзга сама, а обемът стои.
 *
 * Преди страницата скролираше като едно цяло и в края на дясната
 * колона футърът избутваше обема нагоре. Проверява се с истинско
 * въртене на колелцето над дясната колона, не с `scrollTo`.
 */
for (const path of ['/proekt', '/konfigurator']) {
  test(`${path}: скролът вдясно не мести лявата колона`, async ({ page }, info) => {
    test.skip(info.project.name === 'телефон', 'на телефон колоните са една под друга');
    await otvoriChisto(page, path);
    if (path === '/proekt') {
      await page.getByRole('button', { name: /Готова стая: Светла права кухня/ }).click();
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    await page.waitForTimeout(400);

    const left = page.locator('div.lg\\:sticky').first();
    const aside = page.locator('aside').first();
    const predi = (await left.boundingBox())!.y;
    const box = (await aside.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);

    await page.mouse.move(box.x + box.width / 2, box.y + 60);
    for (let i = 0; i < 30; i++) await page.mouse.wheel(0, 400);
    await page.waitForTimeout(400);

    expect((await left.boundingBox())!.y).toBe(predi);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    const [top, max] = await aside.evaluate((e) => [e.scrollTop, e.scrollHeight - e.clientHeight]);
    expect(top).toBeGreaterThan(0);
    // Дробната височина на колоната оставя до пиксел до самото дъно.
    expect(top).toBeGreaterThanOrEqual(max - 1);
  });
}
