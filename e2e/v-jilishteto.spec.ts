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
  /*
   * Заменя начертаната кухня, а не се добавя встрани от жилището:
   * стаите са толкова, колкото бяха, и кухнята е с мерките на проекта.
   */
  await expect(page.getByText(/„Кухня" е заменена с проекта: 4,20 × 3,40 м/)).toBeVisible();
  const stai = await page.evaluate(
    () => JSON.parse(localStorage.getItem('korpus:jilishte:v1') ?? '{"rooms":[]}').rooms,
  );
  expect(stai).toHaveLength(6);
  expect(stai.find((r: { kind: string }) => r.kind === 'kitchen')).toMatchObject({
    width: 4200,
    depth: 3400,
  });
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

/*
 * Жилище с промени, после „Направи проект" от менюто. Next пази
 * страницата на жилището жива и при връщане записът пускаше стария
 * чертеж отгоре на добавената стая: пишеше „заменена", а всекидневната
 * си стоеше празна. С чисто жилище не се виждаше.
 */
test('добавянето оцелява, когато в жилището вече има промени', async ({ page }) => {
  await otvoriChisto(page, '/jilishte');
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: /Копирай/ }).first().click();
  await expect(page.getByText(/7 от \d+ помещения/)).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Основна навигация' })
    .getByRole('link', { name: 'Направи проект' })
    .click();
  await page.waitForURL(/\/proekt/);
  await page.getByRole('button', { name: /Готова стая: Тъмна кухня/ }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /Напред/ }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Добавете я в жилището' }).click();
  await page.waitForURL(/\/jilishte$/);

  await expect(page.getByText(/Обзаведени: 1 от 7/)).toBeVisible();
  await page.waitForTimeout(800);
  const kuhnya = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('korpus:jilishte:v1') ?? '{"rooms":[]}').rooms.find(
        (r: { kind: string }) => r.kind === 'kitchen',
      ),
  );
  expect(kuhnya).toMatchObject({ width: 4200, depth: 3400 });
  expect(kuhnya.project).toBeTruthy();
});
