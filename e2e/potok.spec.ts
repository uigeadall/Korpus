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
   * Всяка стая е сама за себе си — и помни своето.
   *
   * Отговорите преживяват смяната на стаята: размерите и цветовете са
   * на жилището. Мебелта не е — тя е на стаята и трябва да я чака, щом
   * човек се върне. Изтичаше в чужда стая, после я изтривах; и двете
   * са грешни, затова тук е целият кръг.
   */
  test('всяка стая помни своята мебел', async ({ page }) => {
    const broi = () =>
      page.evaluate(
        () =>
          document.querySelectorAll(
            'svg[aria-label^="Обемен"] polygon[role=button], svg[aria-label^="Обемен"] polygon[role=img]',
          ).length,
      );
    const kamStaya = async (ime: string) => {
      await page.getByRole('button', { name: 'Стаята', exact: true }).click();
      await page.waitForTimeout(350);
      await page.getByRole('button', { name: new RegExp(ime) }).first().click();
      await page.waitForTimeout(350);
      for (let i = 0; i < 2; i++) {
        await page.getByRole('button', { name: /Напред/ }).first().click();
        await page.waitForTimeout(350);
      }
      await page.waitForTimeout(450);
    };

    await otvoriChisto(page, '/proekt');
    await page.waitForTimeout(500);

    // Спалнята се подрежда и има мебел.
    await page.getByRole('button', { name: /Спалня/ }).first().click();
    await page.waitForTimeout(300);
    await podrediPoPravilata(page);
    await page.waitForTimeout(500);
    const vSpalnyata = await broi();
    expect(vSpalnyata).toBeGreaterThan(0);

    // Кухнята е празна — мебелта на спалнята не идва с нея.
    await kamStaya('Кухня');
    await expect(page.getByText('Още няма нищо в стаята.')).toBeVisible();
    expect(await broi()).toBe(0);

    // А спалнята си е същата, когато се върнем.
    await kamStaya('Спалня');
    expect(await broi()).toBe(vSpalnyata);

    // И през презареждане: прибраното се пази заедно с отговорите.
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    expect(await broi()).toBe(vSpalnyata);
    await kamStaya('Кухня');
    expect(await broi()).toBe(0);
    await kamStaya('Спалня');
    expect(await broi()).toBe(vSpalnyata);
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
