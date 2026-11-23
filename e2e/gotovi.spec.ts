import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { otvoriChisto } from './pomoshtni';

/**
 * Готовите стаи, цената, снимката на стената и огледът.
 *
 * Сметките имат свои unit тестове; тук е пътят на човека — щракване по
 * готова стая, цена до картината, снимка с четири ъгъла, удобен час.
 */

async function gotovaKuhnya(page: import('@playwright/test').Page) {
  await otvoriChisto(page, '/proekt');
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /Готова стая: Светла права кухня/ }).click();
  await page.waitForTimeout(400);
}

/** Малка снимка, нарисувана на място — PNG с една стена. */
async function snimka(page: import('@playwright/test').Page): Promise<Buffer> {
  const data = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 600;
    c.height = 400;
    const g = c.getContext('2d')!;
    g.fillStyle = '#ddd';
    g.fillRect(0, 0, 600, 400);
    g.fillStyle = '#f4f1ea';
    g.fillRect(80, 40, 440, 320);
    return c.toDataURL('image/png').split(',')[1];
  });
  return Buffer.from(data, 'base64');
}

test.describe('готови стаи и цена', () => {
  test('готовата стая отваря подредена мебел на „Как да изглежда"', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await gotovaKuhnya(page);

    await expect(page.getByRole('button', { name: 'Как да изглежда' })).toHaveAttribute(
      'aria-current',
      'step',
    );
    const modules = await page.evaluate(
      () => document.querySelectorAll('svg[aria-label^="Обемен"] polygon[role=button]').length,
    );
    expect(modules).toBeGreaterThan(5);
    // Стените на шаблона: метро плочки зад мебелта.
    await page.getByRole('group', { name: 'Коя стена' }).getByRole('button', { name: /^Горе/ }).click();
    await expect(page.getByText('Избрано: Метро плочки бели')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('цената се вижда до картината и се мени с плота', async ({ page }) => {
    await gotovaKuhnya(page);
    const kratko = page.getByTestId('cena-kratko');
    await expect(kratko).toContainText('€');
    const predi = await kratko.innerText();

    await page.getByRole('button', { name: 'Ламиниран 38 мм' }).click();
    await page.waitForTimeout(300);
    const sled = await kratko.innerText();
    expect(sled).not.toEqual(predi);

    await page.getByRole('button', { name: /Напред/ }).first().click();
    await expect(page.getByTestId('cena')).toContainText('примерни цени');
    await page.getByText('Как е сметната').click();
    await expect(page.getByText('Сума по сметката')).toBeVisible();
  });

  test('мебелта ляга върху снимка на стената', async ({ page }) => {
    await gotovaKuhnya(page);
    await page.getByRole('button', { name: /Напред/ }).first().click();
    await page.waitForTimeout(300);

    await page.getByLabel('Снимка на стената').setInputFiles({
      name: 'stena.png',
      mimeType: 'image/png',
      buffer: await snimka(page),
    });
    await expect(page.getByTestId('mebel-varhu-snimkata')).toHaveCount(1);

    // Ъгълът се мести и с клавиатурата.
    const agal = page.getByRole('button', { name: /Ъгъл горе вляво/ });
    const predi = await agal.boundingBox();
    await agal.focus();
    await page.keyboard.press('Shift+ArrowRight');
    const sled = await agal.boundingBox();
    expect(sled!.x).toBeGreaterThan(predi!.x);

    await page.getByRole('button', { name: 'Махнете снимката' }).click();
    await expect(page.getByTestId('mebel-varhu-snimkata')).toHaveCount(0);
  });

  test('удобното време за оглед се казва с думи', async ({ page }) => {
    await gotovaKuhnya(page);
    await page.getByRole('button', { name: /Напред/ }).first().click();
    await page.getByRole('button', { name: 'събота' }).click();
    await page.getByRole('button', { name: /^сутрин/ }).click();
    await expect(page.getByText('Ще го напишем в запитването: събота · сутрин (9–12 ч.).')).toBeVisible();
  });

  test('първата и последната стъпка нямат нарушения на достъпността', async ({ page }) => {
    await otvoriChisto(page, '/proekt');
    await page.waitForTimeout(400);
    const first = await new AxeBuilder({ page }).include('main').analyze();
    expect(first.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 100)).join(' | ')}`)).toEqual([]);

    await page.getByRole('button', { name: /Готова стая: Светла права кухня/ }).click();
    await page.getByRole('button', { name: /Напред/ }).first().click();
    await page.waitForTimeout(400);
    const last = await new AxeBuilder({ page }).include('main').analyze();
    expect(last.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 100)).join(' | ')}`)).toEqual([]);
  });
});
