import { expect, test } from '@playwright/test';
import { otvoriChisto } from './pomoshtni';

/**
 * Над стаята колелцето, щипането на тъчпада и два пръста приближават
 * само стаята. Над шкаф — към него, и го отваря; обратно — връща цялата
 * стая и го затваря. Над пода — към мястото под мишката.
 */
test.describe('приближаване с колелцето', () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name === 'телефон', 'на телефон няма колелце');
    await otvoriChisto(page, '/proekt');
    await page.getByRole('button', { name: /Готова стая: Светла права кухня/ }).click();
    await page.waitForTimeout(600);
  });

  const svg = (page: import('@playwright/test').Page) => page.locator('svg[aria-label^="Обемен"]');
  const shirina = async (page: import('@playwright/test').Page) =>
    Number((await svg(page).getAttribute('viewBox'))!.split(' ')[2]);
  const otvoreni = (page: import('@playwright/test').Page) =>
    page.evaluate(
      () =>
        [...document.querySelectorAll('svg[aria-label^="Обемен"] polygon[role=button]')].filter((e) =>
          /отворен/.test(e.getAttribute('aria-label') ?? ''),
        ).length,
    );

  test('над шкаф приближава и отваря, обратно — връща цялата стая', async ({ page }) => {
    const cqla = await shirina(page);
    const p = await page.evaluate(() => {
      const el = document.querySelectorAll('svg[aria-label^="Обемен"] polygon[data-role=facade]')[4];
      const b = el.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    });
    await page.mouse.move(p.x, p.y, { steps: 3 });
    const skrol = await page.evaluate(() => window.scrollY);

    for (let i = 0; i < 8; i++) await page.mouse.wheel(0, -120);
    await page.waitForTimeout(900);
    expect(await shirina(page)).toBeLessThan(cqla / 2);
    expect(await otvoreni(page)).toBeGreaterThan(0);
    // Приближаването не скролира страницата.
    expect(await page.evaluate(() => window.scrollY)).toBe(skrol);

    for (let i = 0; i < 12; i++) await page.mouse.wheel(0, 150);
    await page.waitForTimeout(900);
    expect(await shirina(page)).toBeCloseTo(cqla, 0);
    expect(await otvoreni(page)).toBe(0);
  });

  test('Esc връща цялата стая', async ({ page }) => {
    const cqla = await shirina(page);
    const p = await page.evaluate(() => {
      const el = document.querySelectorAll('svg[aria-label^="Обемен"] polygon[data-role=facade]')[4];
      const b = el.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    });
    await page.mouse.move(p.x, p.y);
    for (let i = 0; i < 6; i++) await page.mouse.wheel(0, -120);
    await page.waitForTimeout(700);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(900);
    expect(await shirina(page)).toBeCloseTo(cqla, 0);
  });

  test('над пода приближава стаята, а не страницата', async ({ page }) => {
    const cqla = await shirina(page);
    const box = (await svg(page).boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.8);
    const skrol = await page.evaluate(() => window.scrollY);
    for (let i = 0; i < 4; i++) await page.mouse.wheel(0, -150);
    await page.waitForTimeout(600);
    expect(await shirina(page)).toBeLessThan(cqla);
    expect(await page.evaluate(() => window.scrollY)).toBe(skrol);
  });

  test('щипане на тъчпада (Ctrl + колелце) приближава стаята', async ({ page }) => {
    const cqla = await shirina(page);
    const box = (await svg(page).boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.8);
    await page.keyboard.down('Control');
    for (let i = 0; i < 10; i++) await page.mouse.wheel(0, -20);
    await page.keyboard.up('Control');
    await page.waitForTimeout(600);
    expect(await shirina(page)).toBeLessThan(cqla);
  });
});

test('два пръста на телефона приближават стаята', async ({ page }, info) => {
  test.skip(info.project.name !== 'телефон', 'щипане с пръсти има само на телефон');
  await otvoriChisto(page, '/proekt');
  await page.getByRole('button', { name: /Готова стая: Светла права кухня/ }).click();
  await page.waitForTimeout(600);
  const svg = page.locator('svg[aria-label^="Обемен"]');
  await svg.scrollIntoViewIfNeeded();
  const shirina = async () => Number((await svg.getAttribute('viewBox'))!.split(' ')[2]);
  const cqla = await shirina();

  // Два пръста, които се раздалечават — изпратени като истински събития на показалеца.
  await svg.evaluate(async (el) => {
    const b = el.getBoundingClientRect();
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height * 0.75;
    const fire = (type: string, id: number, x: number) =>
      el.dispatchEvent(
        new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: cy, bubbles: true, isPrimary: id === 1 }),
      );
    fire('pointerdown', 1, cx - 20);
    fire('pointerdown', 2, cx + 20);
    for (let i = 1; i <= 10; i++) {
      fire('pointermove', 1, cx - 20 - i * 8);
      fire('pointermove', 2, cx + 20 + i * 8);
      await new Promise((r) => setTimeout(r, 16));
    }
    fire('pointerup', 1, cx - 100);
    fire('pointerup', 2, cx + 100);
  });
  await page.waitForTimeout(700);
  expect(await shirina()).toBeLessThan(cqla);
});
