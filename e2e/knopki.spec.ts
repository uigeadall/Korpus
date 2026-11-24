import { expect, test } from '@playwright/test';
import { otvoriChisto } from './pomoshtni';

test('бутоните на изгледа не се режат', async ({ page }) => {
  /*
   * На телефон двата бутона не се побираха на един ред и „Изправи
   * изгледа" оставаше наполовина извън картината.
   */
  await otvoriChisto(page, '/proekt');
  await page.waitForTimeout(1200);

  const rez = await page.evaluate(() => {
    const svg = document.querySelector('svg[role=group][aria-label^="Обемен изглед"]');
    if (!svg) return null;
    const karta = svg.closest('div')!.getBoundingClientRect();
    const btns = [...document.querySelectorAll('button')].filter((b) =>
      /Изправи изгледа|Отвори всички|Затвори всички/.test(b.textContent ?? ''),
    );
    return btns.map((b) => {
      const r = b.getBoundingClientRect();
      return { ime: b.textContent?.trim(), izvan: r.right > karta.right + 1 || r.left < karta.left - 1 };
    });
  });

  expect(rez, 'бутоните не се намериха').not.toBeNull();
  for (const b of rez!) expect(b.izvan, `${b.ime} излиза извън картината`).toBe(false);
});
