import { expect, test } from '@playwright/test';
import { doKraya, otvoriChisto, podrediPoPravilata } from './pomoshtni';

/**
 * Картинката на стаята и запомнената камера.
 *
 * Сметката си има тестове; тук е това, което може да се счупи само в
 * браузъра — че платното наистина рисува низа и че свалянето тръгва.
 */
test.describe('изнасяне на картинка', () => {
  test('свалянето дава истинско PNG, не празно платно', async ({ page }) => {
    await otvoriChisto(page, '/proekt');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Кухня/ }).first().click();
    await page.waitForTimeout(300);
    await podrediPoPravilata(page);
    await doKraya(page);
    await page.waitForTimeout(600);

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.getByRole('button', { name: /Свалете картинка/ }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/^korpus-kitchen-izgled-\d{4}-\d{2}-\d{2}\.png$/);

    const path = await download.path();
    const fs = await import('node:fs/promises');
    const bytes = await fs.readFile(path);

    // Истинско PNG: подписът му, и достатъчно голямо, за да не е празно.
    expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(bytes.length).toBeGreaterThan(20_000);

    // Ширината стои в заглавката: байтове 16..20.
    expect(bytes.readUInt32BE(16)).toBe(1920);
  });
});

test.describe('камерата на стаята', () => {
  test('завъртеният изглед се помни и при връщане в стаята', async ({ page }) => {
    await otvoriChisto(page, '/proekt');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Кухня/ }).first().click();
    await page.waitForTimeout(300);
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: /Напред/ }).first().click();
      await page.waitForTimeout(350);
    }
    await page.waitForTimeout(500);

    const scene = await page.evaluate(() => {
      const svg = document.querySelector('svg[role=group][aria-label^="Обемен изглед"]')!;
      svg.scrollIntoView({ block: 'center' });
      const b = svg.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    });
    await page.waitForTimeout(200);

    const vidim = () =>
      page.evaluate(
        () => document.querySelector('svg[aria-label^="Обемен изглед"]')!.getAttribute('viewBox'),
      );
    const predi = await vidim();

    // Въртене на стаята: влачене по празното.
    await page.mouse.move(scene.x, scene.y + 60);
    await page.mouse.down();
    await page.mouse.move(scene.x - 140, scene.y + 60, { steps: 16 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    const sled = await vidim();
    expect(sled).not.toBe(predi);

    // Запомнена ли е: в записа трябва да стои накъде гледа окото.
    const view = await page.evaluate(() => {
      const a = JSON.parse(localStorage.getItem('korpus:proekt:v2') ?? '{}') as {
        view?: { yaw: number };
      };
      return a.view ?? null;
    });
    expect(view, 'камерата не се записа').not.toBeNull();

    // Отиваме в друга стая и се връщаме — кадърът трябва да е същият.
    await page.getByRole('button', { name: 'Стаята', exact: true }).click();
    await page.waitForTimeout(350);
    await page.getByRole('button', { name: /Спалня/ }).first().click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Стаята', exact: true }).click();
    await page.waitForTimeout(350);
    await page.getByRole('button', { name: /Кухня/ }).first().click();
    await page.waitForTimeout(400);
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: /Напред/ }).first().click();
      await page.waitForTimeout(350);
    }
    await page.waitForTimeout(600);

    expect(await vidim()).toBe(sled);
  });
});
