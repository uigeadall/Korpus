import { expect, test } from '@playwright/test';
import { doKraya, otvoriChisto, podrediPoPravilata } from './pomoshtni';

/**
 * Фунията: от въпросите до нещо, което стига до нас.
 *
 * Тук се проверява и това, което никой unit тест не вижда — че
 * линкът носи целия проект и се отваря в чужд браузър същият.
 */
test.describe('направи проект', () => {
  for (const staya of ['Кухня', 'Спалня', 'Всекидневна', 'Баня', 'Коридор', 'Антре']) {
    test(`${staya} минава през целия поток`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));

      await otvoriChisto(page, '/proekt');
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: new RegExp(staya) }).first().click();
      await page.waitForTimeout(300);
      await podrediPoPravilata(page);
      await doKraya(page);

      // Има мебел и тя се рисува в обем.
      const modules = await page.evaluate(
        () => document.querySelectorAll('svg[aria-label^="Обемен"] polygon[role=button]').length,
      );
      expect(modules, staya).toBeGreaterThan(0);
      expect(errors, staya).toEqual([]);
    });
  }

  /**
   * Всяка стая е сама за себе си.
   *
   * Отговорите преживяват смяната на стаята — там им е мястото, защото
   * размерите и цветовете си остават. Мебелта обаче не: гардеробът няма
   * какво да прави в кухнята, а каталозите на двете стаи дори не се
   * застъпват.
   */
  test('гардеробите от спалнята не отиват в кухнята', async ({ page }) => {
    await otvoriChisto(page, '/proekt');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Спалня/ }).first().click();
    await page.waitForTimeout(300);
    await podrediPoPravilata(page);
    await page.waitForTimeout(500);

    const broi = () =>
      page.evaluate(() =>
        document.querySelectorAll('svg[aria-label^="Обемен"] polygon[role=button], svg[aria-label^="Обемен"] polygon[role=img]').length,
      );
    expect(await broi()).toBeGreaterThan(0);

    // Обратно на първата стъпка през самите стъпки — „Назад" на нея е
    // изключен и чакането му би увиснало.
    await page.getByRole('button', { name: 'Стаята', exact: true }).click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: /Кухня/ }).first().click();
    await page.waitForTimeout(400);
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: /Напред/ }).first().click();
      await page.waitForTimeout(350);
    }
    await page.waitForTimeout(500);

    await expect(page.getByText('Още няма нищо в стаята.')).toBeVisible();
    expect(await broi()).toBe(0);
  });

  test('проектът пътува в линк и се отваря в чужд браузър', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await otvoriChisto(page, '/proekt');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Спалня/ }).first().click();
    await page.waitForTimeout(300);
    await podrediPoPravilata(page);
    await doKraya(page);

    const summary = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('dt, dd')].map((n) => n.textContent?.trim()).join(' · '),
      );
    const before = await summary();

    await page.getByRole('button', { name: /Копирайте линк/ }).click();
    await page.waitForTimeout(300);
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link.length).toBeLessThan(900);

    const other = await context.newPage();
    await other.goto(link, { waitUntil: 'networkidle' });
    await other.waitForTimeout(900);
    const after = await other.evaluate(() =>
      [...document.querySelectorAll('dt, dd')].map((n) => n.textContent?.trim()).join(' · '),
    );
    expect(after).toBe(before);
    await other.close();
  });

  test('лентата накрая мени мебелта и обемът я следва', async ({ page }) => {
    await otvoriChisto(page, '/proekt');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Кухня/ }).first().click();
    await page.waitForTimeout(300);
    await podrediPoPravilata(page);
    await doKraya(page);

    const clips = () =>
      page.evaluate(() => document.querySelectorAll('[data-clip]:not([data-edge])').length);
    const before = await clips();
    expect(before).toBeGreaterThan(0);

    const first = await page.evaluate(
      () => (document.querySelector('[data-clip]:not([data-edge])') as HTMLElement).dataset.clip,
    );
    const p = await page.evaluate((i) => {
      const el = document.querySelector(`[data-clip="${i}"]:not([data-edge])`)!;
      el.scrollIntoView({ block: 'center' });
      const b = el.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    }, first);
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(250);

    await page.locator('[role=toolbar]').getByRole('button', { name: 'Изтрий', exact: true }).click();
    await page.waitForTimeout(400);
    expect(await clips()).toBe(before - 1);

    const solid = await page.evaluate(
      () => document.querySelectorAll('svg[aria-label^="Обемен"] polygon').length,
    );
    expect(solid).toBeGreaterThan(0);
  });
});
