import { expect, test } from '@playwright/test';
import { imenaNaStaite, otvoriChisto } from './pomoshtni';

/**
 * Жилището излиза от браузъра.
 *
 * Дотук чертежът живееше само в едно устройство. Това е проверката,
 * че линкът го носи целия и че донесеното има превес над запазеното —
 * иначе чужд чертеж се отваря в твоя и никой не разбира защо.
 */
test.describe('жилището в линк', () => {
  test('линкът отваря същото жилище в празен браузър', async ({ page, context }) => {
    await otvoriChisto(page, '/jilishte');
    await page.waitForTimeout(700);

    // Преименуваме стая, за да личи, че пътува точно това жилище.
    const pole = page.getByLabel('Име');
    await pole.fill('Детската');
    await page.waitForTimeout(400);
    const predi = await imenaNaStaite(page);
    expect(predi).toContain('Детската');

    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: /Копирайте линк към жилището/ }).click();
    await page.waitForTimeout(400);
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toContain('/jilishte?j=');
    // Пощенските програми пречупват адреси около 2000 знака.
    expect(link.length).toBeLessThan(2000);

    const drug = await context.newPage();
    await drug.goto(link.replace(/^https?:\/\/[^/]+/, ''), { waitUntil: 'networkidle' });
    await drug.evaluate(() => localStorage.clear());
    await drug.reload({ waitUntil: 'networkidle' });
    await drug.waitForTimeout(900);

    const sled = await drug.evaluate(() =>
      [...document.querySelectorAll('rect[role=button]')]
        .map((n) => n.getAttribute('aria-label') ?? '')
        .filter((l) => !l.startsWith('Опънете'))
        .map((l) => l.split(',')[0]),
    );
    expect(sled).toEqual(predi);
    await drug.close();
  });

  test('донесеното жилище има превес над запазеното', async ({ page, context }) => {
    // Първо жилище със своя стая.
    await otvoriChisto(page, '/jilishte');
    await page.waitForTimeout(700);
    await page.getByLabel('Име').fill('Първото');
    await page.waitForTimeout(400);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: /Копирайте линк към жилището/ }).click();
    await page.waitForTimeout(300);
    const link = await page.evaluate(() => navigator.clipboard.readText());

    // В същия браузър се прави друго жилище…
    await page.getByLabel('Име').fill('Второто');
    await page.waitForTimeout(500);
    expect(await imenaNaStaite(page)).toContain('Второто');

    // …и донесеният линк се отваря върху него.
    await page.goto(link.replace(/^https?:\/\/[^/]+/, ''), { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    const imena = await imenaNaStaite(page);
    expect(imena).toContain('Първото');
    expect(imena).not.toContain('Второто');
  });
});
