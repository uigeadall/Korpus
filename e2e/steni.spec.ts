import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { otvoriChisto } from './pomoshtni';

/**
 * Покритието на стените: избира се, рисува се в обема и се помни.
 *
 * Шарката е смятана с unit тестове; тук е другото — че щракването по
 * мострата стига до обема и че акцентната стена остава само на една.
 */

/** Колко парчета шарка има по вътрешните лица на всяка стена в обема. */
const sharka = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const out: Record<string, number> = {};
    for (const g of document.querySelectorAll('svg[aria-label^="Обемен"] g[data-wall]')) {
      const side = g.getAttribute('data-wall')!;
      out[side] = (out[side] ?? 0) + g.querySelectorAll('path').length;
    }
    return out;
  });

/** До стъпката „Как да изглежда" — бъдещите стъпки не се щракват, минава се с „Напред". */
async function doVida(page: import('@playwright/test').Page) {
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: /Напред/ }).first().click();
    await page.waitForTimeout(300);
  }
  await expect(page.getByRole('heading', { name: 'Стени' })).toBeVisible();
}

async function kamVida(page: import('@playwright/test').Page) {
  await otvoriChisto(page, '/proekt');
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /Кухня/ }).first().click();
  await page.waitForTimeout(300);
  await doVida(page);
}

test.describe('стени', () => {
  test('гола стая е без шарка — както преди', async ({ page }) => {
    await kamVida(page);
    const s = await sharka(page);
    expect(Object.values(s).every((n) => n === 0)).toBe(true);
    await expect(page.getByText('Избрано: Топло бяло')).toBeVisible();
  });

  test('тухла на всички стени, после тапет само на една', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await kamVida(page);

    await page.getByRole('tab', { name: /Тухла/ }).click();
    await page.getByRole('button', { name: 'Червена тухла' }).click();
    await page.waitForTimeout(300);
    const vsichki = await sharka(page);
    expect(Object.keys(vsichki).length).toBeGreaterThan(0);
    for (const n of Object.values(vsichki)) expect(n).toBeGreaterThan(0);

    // Акцентна стена: само горната става тапет.
    await page.getByRole('group', { name: 'Коя стена' }).getByRole('button', { name: /^Горе/ }).click();
    await page.getByRole('tab', { name: /Тапет/ }).click();
    await page.getByRole('button', { name: 'дамаска кремава' }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Избрано: Тапет: дамаска кремава')).toBeVisible();
    await expect(page.getByRole('button', { name: /като останалите стени/ })).toBeVisible();

    // Обратно към общото — само горната се връща.
    await page.getByRole('button', { name: /като останалите стени/ }).click();
    await expect(page.getByText('Избрано: Червена тухла')).toBeVisible();

    // Изборът преживява презареждане.
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await doVida(page);
    await expect(page.getByText('Избрано: Червена тухла')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('търсенето намира покритие по име', async ({ page }) => {
    await kamVida(page);
    await page.getByRole('searchbox', { name: 'Търсене на покритие' }).fill('метро бели');
    await expect(page.getByRole('button', { name: 'Метро плочки бели' })).toBeVisible();
    await page.getByRole('searchbox', { name: 'Търсене на покритие' }).fill('няма-такова');
    await expect(page.getByText(/Нищо не отговаря/)).toBeVisible();
  });

  test('панелът със стените няма нарушения на достъпността', async ({ page }) => {
    await kamVida(page);
    const result = await new AxeBuilder({ page }).include('main').analyze();
    expect(
      result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.failureSummary + ' @ ' + n.html.slice(0, 120)).join(' | ')}`),
    ).toEqual([]);
  });
});
