import { expect, test } from '@playwright/test';
import { izbranoto, klipove, otvoriChisto, sredataNaKlip } from './pomoshtni';

/**
 * Лентата: клиповете и долните действия.
 *
 * Нито едно от тези не се доказва с unit тест — всичко е въпрос на
 * какво хваща показалецът и какво стои върху какво.
 */
/**
 * Примерната стена е пълна до милиметър, а шкаф отвъд стената вече не
 * минава. Тестовете, които добавят или разширяват, първо правят място.
 */
async function praviMyasto(page: import('@playwright/test').Page) {
  await page.locator('summary', { hasText: 'Стая и стени' }).click();
  await page.getByLabel('Дължина на стената в милиметри').fill('6000');
  await page.waitForTimeout(300);
}

test.describe('лентата в конфигуратора', () => {
  test.beforeEach(async ({ page }) => {
    await otvoriChisto(page, '/konfigurator');
    await page.waitForTimeout(800);
  });

  test('щракване избира, Shift взема обхвата', async ({ page }) => {
    const list = await klipove(page);
    expect(list.length).toBeGreaterThan(2);

    const a = await sredataNaKlip(page, list[0]);
    await page.mouse.click(a.x, a.y);
    await page.waitForTimeout(250);
    expect(await izbranoto(page)).toBe('1 избран');

    const c = await sredataNaKlip(page, list[2]);
    await page.keyboard.down('Shift');
    await page.mouse.click(c.x, c.y);
    await page.keyboard.up('Shift');
    await page.waitForTimeout(250);
    expect(await izbranoto(page)).toBe('3 избрани');
  });

  test('долната лента действа върху всички избрани, с едно връщане', async ({ page }) => {
    await praviMyasto(page);
    const list = await klipove(page);
    const a = await sredataNaKlip(page, list[0]);
    await page.mouse.click(a.x, a.y);
    const c = await sredataNaKlip(page, list[2]);
    await page.keyboard.down('Shift');
    await page.mouse.click(c.x, c.y);
    await page.keyboard.up('Shift');
    await page.waitForTimeout(250);

    const before = (await klipove(page)).length;
    await page.locator('[role=toolbar]').getByRole('button', { name: 'Копирай' }).click();
    await page.waitForTimeout(400);
    expect(await klipove(page)).toHaveLength(before + 3);

    await page.getByRole('button', { name: 'Назад (⌘Z)' }).click();
    await page.waitForTimeout(400);
    expect(await klipove(page)).toHaveLength(before);
  });

  test('ръбът опъва ширината до следващата каталожна', async ({ page }) => {
    await praviMyasto(page);
    const id = await page.evaluate(
      () => (document.querySelector('[data-edge]') as HTMLElement | null)?.dataset.clip ?? null,
    );
    expect(id).not.toBeNull();

    const shirina = () =>
      page.evaluate(
        (i) =>
          document
            .querySelector(`[data-clip="${i}"]:not([data-edge])`)
            ?.getAttribute('aria-label')
            ?.match(/(\d+) мм/)?.[1] ?? '',
        id,
      );

    const c = await sredataNaKlip(page, id!);
    await page.mouse.click(c.x, c.y);
    await page.waitForTimeout(200);
    const before = Number(await shirina());

    const edge = await page.evaluate((i) => {
      const b = document.querySelector(`[data-clip="${i}"][data-edge="right"]`)!.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    }, id);
    await page.mouse.move(edge.x, edge.y);
    await page.mouse.down();
    await page.mouse.move(edge.x + 70, edge.y, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    expect(Number(await shirina())).toBeGreaterThan(before);
  });

  test('рамка по празното маркира няколко', async ({ page }) => {
    const track = await page.evaluate(() => {
      const el = document.querySelector('[data-track="upper"]')!;
      // Без това пътечката може да е под сгъвката и мишката да мине
      // извън прозореца, без да стигне до нея.
      el.scrollIntoView({ block: 'center' });
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y + b.height / 2, w: b.width };
    });
    await page.waitForTimeout(200);
    await page.mouse.move(track.x + 5, track.y);
    await page.mouse.down();
    await page.mouse.move(track.x + track.w * 0.6, track.y, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(350);
    expect(await izbranoto(page)).toMatch(/\d+ избрани/);
  });

  test('влаченето на клип го размества', async ({ page }) => {
    const list = await klipove(page, 'upper');
    const first = list[0];
    const p = await sredataNaKlip(page, first);
    const width = await page.evaluate(
      (i) => document.querySelector(`[data-clip="${i}"]:not([data-edge])`)!.getBoundingClientRect().width,
      first,
    );

    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.move(p.x + width * 2.2, p.y, { steps: 14 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    expect((await klipove(page, 'upper')).indexOf(first)).toBeGreaterThan(0);
  });

  /**
   * Закованата колона („sticky") е по-висока от прозореца и лентата е
   * най-отдолу в нея. Без собствен скрол тя не мърда, страницата се
   * плъзга под нея и долният ѝ край не се стига с мишката — лентата е
   * там, вижда се наполовина и не се хваща. Намери се случайно, затова
   * тук се пази нарочно.
   */
  test('лентата се стига докрай — колоната не крие долния си край', async ({ page }) => {
    const vidima = await page.evaluate(() => {
      const el = document.querySelector('[data-track="upper"]')!;
      el.scrollIntoView({ block: 'center' });
      const b = el.getBoundingClientRect();
      return { gore: b.y, dolu: b.y + b.height, visochina: window.innerHeight };
    });
    expect(vidima.gore).toBeGreaterThanOrEqual(0);
    expect(vidima.dolu).toBeLessThanOrEqual(vidima.visochina);
  });

  test('долната лента не застава върху клиповете', async ({ page }) => {
    const list = await klipove(page);
    const p = await sredataNaKlip(page, list[0]);
    const hit = await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        return Boolean(el?.closest('[data-clip]'));
      },
      p,
    );
    expect(hit).toBe(true);
  });
});
