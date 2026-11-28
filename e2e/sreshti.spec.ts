import { expect, test } from '@playwright/test';
import { otvoriChisto } from './pomoshtni';

/**
 * Меките срещи в ъглите.
 *
 * Обемът изглеждаше като хартиен макет: всяка повърхност е осветена
 * равномерно, а две съседни се срещат по безупречно остра линия. Това
 * е проверката, че тъмнината в ъгъла стига до екрана и че се мести
 * заедно с камерата, вместо да стои залепена за платното.
 */
test.describe('меките срещи', () => {
  test.beforeEach(async ({ page }) => {
    await otvoriChisto(page, '/konfigurator');
    await page.getByRole('button', { name: 'Обем', exact: true }).click();
    // Обемът се сглобява след първото рисуване; срещите идват с него.
    await expect
      .poll(() => page.locator('linearGradient[gradientUnits="userSpaceOnUse"]').count(), {
        timeout: 15000,
      })
      .toBeGreaterThan(0);
  });

  /** Преливките на срещите: в екранни мерки, не по рамката на фигурата. */
  const ivici = (page: import('@playwright/test').Page) =>
    page.locator('linearGradient[gradientUnits="userSpaceOnUse"]').count();

  test('стаята носи тъмнина в ъглите си', async ({ page }) => {
    const n = await ivici(page);
    // Подът до четирите зида, ъглите на видимите стени, основите.
    expect(n).toBeGreaterThan(3);
  });

  test('тъмнината се върти заедно със стаята', async ({ page }) => {
    /*
     * Преливката върви от средата на тъмния ръб до средата на
     * светлия — и двете в екранни координати. Завърти ли се камерата,
     * числата трябва да се сменят; иначе ивицата е залепена за
     * платното и при второ завъртане ще сочи накъдето ѝ хрумне.
     */
    const posoka = () =>
      page.evaluate(() => {
        const g = document.querySelector('linearGradient[gradientUnits="userSpaceOnUse"]');
        return g ? `${g.getAttribute('x1')},${g.getAttribute('x2')}` : null;
      });

    const predi = await posoka();
    expect(predi).not.toBeNull();

    const box = await page.locator('main svg').first().boundingBox();
    if (!box) throw new Error('няма обем');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 220, box.y + box.height / 2, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(600);

    expect(await posoka()).not.toBe(predi);
  });

  test('въртенето не трупа преливки', async ({ page }) => {
    /*
     * Броят им се мени със завъртането — различен ъгъл показва различни
     * стени, а всяка носи своите срещи. Но НЕ бива да расте: ивиците се
     * правят наново при всеки кадър и останат ли старите, документът
     * набъбва, докато страницата заяде. Затова се мери таван, а не
     * равенство.
     */
    const box = await page.locator('main svg').first().boundingBox();
    if (!box) throw new Error('няма обем');
    for (let i = 0; i < 4; i++) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(250);
    }
    // Четири стени по три ивици, подът с четирите си и основите на
    // шкафовете — с голям запас, но далеч под трупане.
    expect(await ivici(page)).toBeLessThan(120);
  });
});
