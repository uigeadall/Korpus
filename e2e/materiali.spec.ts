import { expect, test } from '@playwright/test';
import { otvoriChisto } from './pomoshtni';

/**
 * Материалът се вижда, не само се избира.
 *
 * Дотук светъл дъб и бяло ПДЧ се различаваха само по отсянка. Това е
 * проверката, че изборът стига до обема — и че невъзможна поръчка не
 * се предлага.
 */

async function otvoriMateriali(page: import('@playwright/test').Page) {
  await otvoriChisto(page, '/konfigurator');
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Обем', exact: true }).click();
  await page.waitForTimeout(400);
  await page.evaluate(() =>
    [...document.querySelectorAll('button,summary')]
      .find((n) => /Материал/i.test(n.textContent ?? ''))
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true })),
  );
  await page.waitForTimeout(500);
}

const chip = (page: import('@playwright/test').Page, name: string) =>
  page.getByRole('button', { name, exact: true }).first();

test.describe('материали в обема', () => {
  test('дървеният декор слага фладер по фасадите', async ({ page }) => {
    await otvoriMateriali(page);

    // Боядисана фасада: лицата са плътен цвят.
    const predi = await page.evaluate(
      () => document.querySelectorAll('[data-role="facade"] path').length,
    );

    await chip(page, 'ПДЧ декор').click();
    await page.waitForTimeout(300);
    await chip(page, 'Орех').click();
    await page.waitForTimeout(800);

    const sled = await page.evaluate(
      () => document.querySelectorAll('[data-role="facade"] path').length,
    );
    expect(sled).toBeGreaterThan(predi);
  });

  test('боядисана фасада не предлага дървесен декор', async ({ page }) => {
    /*
     * „МДФ боядисан, орех" е поръчка, която цехът не може да изпълни.
     * Най-евтиното място да се спре е списъкът, от който се избира.
     */
    await otvoriMateriali(page);
    await chip(page, 'МДФ боядисан').click();
    await page.waitForTimeout(400);
    await expect(chip(page, 'Орех')).toHaveCount(0);

    await chip(page, 'ПДЧ декор').click();
    await page.waitForTimeout(400);
    await expect(chip(page, 'Орех')).toHaveCount(1);
  });

  test('избран декор не остава при връщане към боя', async ({ page }) => {
    await otvoriMateriali(page);
    await chip(page, 'ПДЧ декор').click();
    await page.waitForTimeout(300);
    await chip(page, 'Орех').click();
    await page.waitForTimeout(500);

    await chip(page, 'МДФ боядисан').click();
    await page.waitForTimeout(600);

    // Цветът се е сменил с възможен, вместо да остане невъзможен.
    const izbran = await page.evaluate(() =>
      [...document.querySelectorAll('button[aria-pressed="true"]')]
        .map((b) => b.getAttribute('aria-label') || b.textContent?.trim())
        .find((t) => t && /RAL|Орех|Дъб|Ясен/.test(t)),
    );
    expect(izbran).not.toBe('Орех');
  });

  test('каменният плот се различава от ламинирания', async ({ page }) => {
    await otvoriMateriali(page);
    const petna = () =>
      page.evaluate(() => document.querySelectorAll('[data-role="worktop"] path').length);

    const laminat = await petna();
    await chip(page, 'Гранит 30 мм').click();
    await page.waitForTimeout(800);
    expect(await petna()).toBeGreaterThan(laminat);
  });
});
