import { expect, test } from '@playwright/test';
import { otvoriChisto } from './pomoshtni';

/**
 * Готов проект, направен без чертежа, влиза в жилището — отметнат и с
 * мебелта си в макета.
 */
test('готовата стая се добавя в жилището и се вижда там', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await otvoriChisto(page, '/proekt');
  await page.getByRole('button', { name: /Готова стая: Тъмна кухня/ }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /Напред/ }).first().click();
  await page.waitForTimeout(400);

  await page.getByRole('button', { name: 'Добавете я в жилището' }).click();
  await page.waitForURL(/\/jilishte$/);
  await page.waitForTimeout(800);

  await expect(page.getByText(/Обзаведени: 1 от/)).toBeVisible();
  // Мебелта е в макета: повече лица, отколкото подове и зидове сами дават.
  const lica = await page.evaluate(
    () => document.querySelectorAll('svg[aria-label^="Макет"] polygon').length,
  );
  expect(lica).toBeGreaterThan(150);

  // Презареждане не я губи.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByText(/Обзаведени: 1 от/)).toBeVisible();
  expect(errors).toEqual([]);
});
