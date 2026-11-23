import { expect, test } from '@playwright/test';
import { otvoriChisto } from './pomoshtni';

/**
 * Мебелта не минава през стената, а подът се сменя.
 */
test.describe('ограничения и под', () => {
  test.beforeEach(async ({ page }) => {
    await otvoriChisto(page, '/proekt');
    await page.getByRole('button', { name: /Готова стая: Светла права кухня/ }).click();
    await page.waitForTimeout(600);
  });

  const broi = (page: import('@playwright/test').Page) =>
    page.evaluate(
      () => document.querySelectorAll('svg[aria-label^="Обемен"] polygon[role=button], svg[aria-label^="Обемен"] polygon[role=img]').length,
    );

  test('пълна стена не приема още шкаф и казва защо', async ({ page }) => {
    const predi = await broi(page);
    await page.getByRole('button', { name: /^Долен с врата/ }).click();
    await expect(page.getByText(/Няма място на стената/)).toBeVisible();
    expect(await broi(page)).toBe(predi);
  });

  test('подът се сменя и се рисува в обема', async ({ page }) => {
    await page.getByRole('group', { name: 'Килим' }).getByRole('button', { name: /Сив/ }).click();
    await expect(page.getByText('Избрано: Килим сив')).toBeVisible();
    await expect(page.locator('svg[aria-label^="Обемен"] g[data-floor="pod-kilim-grey"]')).toHaveCount(1);
    await page.getByRole('button', { name: /подът както беше/ }).click();
    await expect(page.locator('svg[aria-label^="Обемен"] g[data-floor]')).toHaveCount(0);
  });
});
