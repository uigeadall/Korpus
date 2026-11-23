import { expect, test } from '@playwright/test';
import { otvoriChisto, podrediPoPravilata } from './pomoshtni';

/**
 * Местене на готов шкаф направо в обема.
 *
 * Сметката кой шкаф къде отива си има свои тестове. Тук се проверява
 * това, което може да се счупи само в браузъра: че хващането на шкаф
 * не върти стаята, че щракването още го отваря и че разместеното
 * остава разместено.
 */

/**
 * Шкафовете отляво надясно, по името на вида им.
 *
 * Номерата (Д1, Д2…) не вършат работа: те се раздават наново при всяко
 * подреждане, затова първият винаги е Д1 и разместването не си личи.
 */
const redicata = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const svg = document.querySelector('svg[role=group][aria-label^="Обемен изглед"]')!;
    return [...svg.querySelectorAll('polygon[role=button], polygon[role=img]')]
      .map((el) => ({ el, b: el.getBoundingClientRect() }))
      .sort((p, q) => p.b.x - q.b.x)
      .map(({ el }) => (el.getAttribute('aria-label') ?? '').split(',')[0].replace(/^\S+\s+/, ''));
  });

/** Долният ред: шкафовете с номер „Д" или „К", отляво надясно. */
async function dolniyatRed(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const svg = document.querySelector('svg[role=group][aria-label^="Обемен изглед"]')!;
    svg.scrollIntoView({ block: 'center' });
    return [...svg.querySelectorAll('polygon[role=button], polygon[role=img]')]
      .filter((el) => /^[ДК]\d/.test(el.getAttribute('aria-label') ?? ''))
      .map((el) => {
        const b = el.getBoundingClientRect();
        return { x: b.x + b.width / 2, y: b.y + b.height / 2, left: b.x };
      })
      .sort((a, b) => a.left - b.left);
  });
}

test.describe('местене на шкаф в обема', () => {
  test.beforeEach(async ({ page }) => {
    await otvoriChisto(page, '/proekt');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Кухня/ }).first().click();
    await page.waitForTimeout(300);
    await podrediPoPravilata(page);
    await page.waitForTimeout(600);
  });

  test('влаченето на шкаф го разменя със съседа, не върти стаята', async ({ page }) => {
    const predi = await redicata(page);
    expect(predi.length).toBeGreaterThan(2);

    const izglednaPredi = await page.evaluate(
      () => document.querySelector('svg[aria-label^="Обемен"]')!.getAttribute('viewBox'),
    );

    const red = await dolniyatRed(page);
    expect(red.length).toBeGreaterThan(2);
    const [a, , b] = red;

    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 16 });
    await page.waitForTimeout(250);

    // Докато се влачи, в стаята стои призрак на новото място.
    const prizrak = await page.evaluate(
      () => document.querySelectorAll('svg[aria-label^="Обемен"] polygon[fill="var(--accent)"]').length,
    );
    expect(prizrak).toBeGreaterThan(0);

    await page.mouse.up();
    await page.waitForTimeout(500);

    const sled = await redicata(page);
    expect(sled).not.toEqual(predi);
    expect([...sled].sort()).toEqual([...predi].sort());

    // Стаята не се е завъртяла: кадърът е същият.
    const izglednaSled = await page.evaluate(
      () => document.querySelector('svg[aria-label^="Обемен"]')!.getAttribute('viewBox'),
    );
    expect(izglednaSled).toBe(izglednaPredi);
  });

  test('щракване без влачене още отваря шкафа', async ({ page }) => {
    const predi = await redicata(page);
    const red = await dolniyatRed(page);

    await page.mouse.click(red[1].x, red[1].y);
    await page.waitForTimeout(700);

    // Редът не е пипан…
    expect(await redicata(page)).toEqual(predi);
    // …а някой шкаф се е отворил: лицата в кадъра стават повече.
    const otvoren = await page.evaluate(
      () =>
        [...document.querySelectorAll('svg[aria-label^="Обемен"] polygon[role=button]')].some((el) =>
          /отворен/i.test(el.getAttribute('aria-label') ?? ''),
        ),
    );
    expect(otvoren).toBe(true);
  });

  test('празното място още върти стаята', async ({ page }) => {
    const predi = await page.evaluate(
      () => document.querySelector('svg[aria-label^="Обемен"]')!.getAttribute('viewBox'),
    );

    /*
     * Търси се точка в обема, под която няма шкаф — иначе влаченето
     * щеше да мести него. На телефон част от кадъра е под сгъвката,
     * затова се броят само видимите редове.
     */
    const prazno = await page.evaluate(() => {
      const svg = document.querySelector('svg[aria-label^="Обемен"]')!;
      svg.scrollIntoView({ block: 'center' });
      const b = svg.getBoundingClientRect();
      const gore = Math.max(b.y, 0);
      const dolu = Math.min(b.y + b.height, window.innerHeight);
      for (let fy = 0.85; fy >= 0.3; fy -= 0.08) {
        for (let fx = 0.9; fx >= 0.1; fx -= 0.08) {
          const x = b.x + b.width * fx;
          const y = gore + (dolu - gore) * fy;
          const el = document.elementFromPoint(x, y);
          if (el && el.closest('svg') === svg && !el.getAttribute('data-module')) {
            return { x, y };
          }
        }
      }
      return null;
    });
    expect(prazno, 'няма празно място в кадъра').not.toBeNull();

    await page.mouse.move(prazno!.x, prazno!.y);
    await page.mouse.down();
    await page.mouse.move(prazno!.x - 120, prazno!.y, { steps: 14 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    const sled = await page.evaluate(
      () => document.querySelector('svg[aria-label^="Обемен"]')!.getAttribute('viewBox'),
    );
    expect(sled).not.toBe(predi);
  });
});
