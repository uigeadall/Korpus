import { expect, test } from '@playwright/test';
import { otvoriChisto } from './pomoshtni';

/**
 * Мебел и по другите стени: Г-образната кухня и шкаф на дясната стена.
 */
test('Г-кухня: шкаф се слага на избраната стена', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await otvoriChisto(page, '/proekt');
  await page.getByRole('button', { name: /Готова стая: Г-образна кухня/ }).click();
  await page.waitForTimeout(600);

  const steni = page.getByRole('group', { name: 'Стена за мебелта' });
  await expect(steni.getByRole('button', { name: /Вляво · 6/ })).toBeVisible();

  await steni.getByRole('button', { name: /^Вдясно/ }).click();
  await page.getByRole('button', { name: /^Долен с врата/ }).click();
  await expect(steni.getByRole('button', { name: /Вдясно · 1/ })).toBeVisible();
  // Удобството казва за слепия ъгъл между стените.
  await expect(page.getByText(/сляп ъгъл/)).toBeVisible();
  expect(errors).toEqual([]);
});
