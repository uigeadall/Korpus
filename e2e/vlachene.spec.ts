import { expect, test } from '@playwright/test';
import { otvoriChisto } from './pomoshtni';

/**
 * Стаята се отваря празна и се реди с влачене право в обема.
 *
 * Нищо тук не се доказва с unit тест. Сметката кой модул къде ляга си
 * има свои тестове; това, което може да се счупи само в браузъра, е
 * дали показалецът изобщо стига до обема, дали призракът се показва и
 * дали пуснатото остава.
 */

/** Колко модула има стаята, според брояча под картината. */
async function broiModuli(page: import('@playwright/test').Page): Promise<number> {
  const text = await page.evaluate(() => {
    const el = [...document.querySelectorAll('p, span, div')].find((n) =>
      /^\d+ модул/.test(n.textContent?.trim() ?? ''),
    );
    return el?.textContent?.trim() ?? '';
  });
  return Number(text.match(/^(\d+)/)?.[1] ?? -1);
}

/** Хваща модул от палитрата и го пуска на дадена част от ширината. */
async function zavleci(
  page: import('@playwright/test').Page,
  ime: string,
  frac: number,
): Promise<void> {
  /*
   * Първо се вкарва в кадъра самият модул — на телефон палитрата е
   * лента под картината и някои модули чакат встрани. Чак после се
   * мери къде е обемът: вкарването го мести.
   */
  const item = page.getByRole('button', { name: new RegExp(`^${ime}`) }).first();
  await item.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const button = await item.boundingBox();
  if (!button) throw new Error(`няма модул „${ime}" в палитрата`);

  const scene = await page.evaluate(() => {
    const b = document
      .querySelector('svg[role=group][aria-label^="Обемен изглед"]')!
      .getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height, h_prozorec: window.innerHeight };
  });

  // Целта се свива до видимата част на обема: показалец извън прозореца
  // не пуска нищо.
  const gore = Math.max(scene.y, 0);
  const dolu = Math.min(scene.y + scene.h, scene.h_prozorec);
  if (dolu - gore < 40) throw new Error('обемът не се вижда — няма къде да се пусне');

  await page.mouse.move(button.x + button.width / 2, button.y + button.height / 2);
  await page.mouse.down();
  await page.mouse.move(scene.x + scene.w * frac, gore + (dolu - gore) * 0.62, { steps: 14 });
  await page.waitForTimeout(200);
}

async function doStapkaTri(page: import('@playwright/test').Page, staya: string): Promise<void> {
  await otvoriChisto(page, '/proekt');
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: new RegExp(staya) }).first().click();
  await page.waitForTimeout(300);
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: /Напред/ }).first().click();
    await page.waitForTimeout(350);
  }
  await page.waitForTimeout(400);
}

test.describe('нареждане с влачене', () => {
  test('стаята се отваря празна', async ({ page }) => {
    await doStapkaTri(page, 'Кухня');
    expect(await broiModuli(page)).toBe(0);
    await expect(page.getByText('Още няма нищо в стаята.')).toBeVisible();

    // Празна стая, но не празна картина: подът и зидовете се виждат.
    const lica = await page.evaluate(
      () => document.querySelectorAll('svg[aria-label^="Обемен"] polygon').length,
    );
    expect(lica).toBeGreaterThan(10);
  });

  test('призракът се показва, докато модулът виси над стаята', async ({ page }) => {
    await doStapkaTri(page, 'Кухня');
    await zavleci(page, 'Шкаф за мивка', 0.4);

    const prizrak = () =>
      page.evaluate(
        () => document.querySelectorAll('svg[aria-label^="Обемен"] polygon[fill="var(--accent)"]').length,
      );
    expect(await prizrak()).toBeGreaterThan(0);

    // Извън картината няма къде да падне — призракът изчезва.
    await page.mouse.move(5, 5, { steps: 8 });
    await page.waitForTimeout(220);
    expect(await prizrak()).toBe(0);

    await page.mouse.up();
    await page.waitForTimeout(400);
    expect(await broiModuli(page)).toBe(0);
  });

  test('пуснатото в обема остава в стаята', async ({ page }) => {
    await doStapkaTri(page, 'Кухня');

    await zavleci(page, 'Шкаф за мивка', 0.4);
    await page.mouse.up();
    await page.waitForTimeout(450);
    expect(await broiModuli(page)).toBe(1);

    await zavleci(page, 'Шкаф за фурна', 0.7);
    await page.mouse.up();
    await page.waitForTimeout(450);
    expect(await broiModuli(page)).toBe(2);
  });

  test('краят на стената решава дали влиза пръв или последен', async ({ page }) => {
    await doStapkaTri(page, 'Кухня');

    const vidove = () =>
      page.evaluate(() => {
        const raw = localStorage.getItem('korpus:proekt:v2');
        if (!raw) return [];
        const a = JSON.parse(raw) as { hand?: { base?: { kind: string }[] } };
        return (a.hand?.base ?? []).map((m) => m.kind);
      });

    await zavleci(page, 'Шкаф за мивка', 0.45);
    await page.mouse.up();
    await page.waitForTimeout(400);

    await zavleci(page, 'Долен с 3 чекмеджета', 0.1);
    await page.mouse.up();
    await page.waitForTimeout(450);
    expect(await vidove()).toEqual(['drawers', 'sink']);

    await zavleci(page, 'Долен с врата', 0.92);
    await page.mouse.up();
    await page.waitForTimeout(450);
    expect(await vidove()).toEqual(['drawers', 'sink', 'door']);
  });

  test('горните модули отиват горе, долните долу', async ({ page }) => {
    await doStapkaTri(page, 'Кухня');

    await zavleci(page, 'Горен шкаф', 0.45);
    await page.mouse.up();
    await page.waitForTimeout(450);

    const redove = await page.evaluate(() => {
      const raw = localStorage.getItem('korpus:proekt:v2');
      const a = JSON.parse(raw ?? '{}') as {
        hand?: { base?: unknown[]; upper?: unknown[] };
      };
      return { dolu: a.hand?.base?.length ?? 0, gore: a.hand?.upper?.length ?? 0 };
    });
    expect(redove).toEqual({ dolu: 0, gore: 1 });
  });

  test('стаята се изпразва и броячът го знае', async ({ page }) => {
    await doStapkaTri(page, 'Кухня');
    await zavleci(page, 'Шкаф за мивка', 0.4);
    await page.mouse.up();
    await page.waitForTimeout(450);
    expect(await broiModuli(page)).toBe(1);

    await page.getByRole('button', { name: 'Изпразнете стаята' }).click();
    await page.waitForTimeout(400);
    expect(await broiModuli(page)).toBe(0);
  });

  test('нареденото на ръка оцелява при промяна на размерите', async ({ page }) => {
    await doStapkaTri(page, 'Кухня');
    await zavleci(page, 'Шкаф за мивка', 0.4);
    await page.mouse.up();
    await page.waitForTimeout(450);

    await page.getByRole('button', { name: /Назад/ }).first().click();
    await page.waitForTimeout(400);

    // Пипаме ширината на стената и се връщаме.
    const field = page.locator('input[type=range], input[type=number]').first();
    if (await field.isVisible().catch(() => false)) {
      await field.focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(350);
    }

    await page.getByRole('button', { name: /Напред/ }).first().click();
    await page.waitForTimeout(500);
    expect(await broiModuli(page)).toBe(1);
  });
});
