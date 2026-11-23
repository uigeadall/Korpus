import { expect, test } from '@playwright/test';
import {
  doKraya,
  imenaNaStaite,
  izberiStaya,
  kadeSme,
  otvoriChisto,
  podrediPoPravilata,
  sredataNaStaya,
} from './pomoshtni';

/**
 * Жилището: чертане, ходене, отмятане.
 *
 * Всяка от тези проверки стои тук, защото точно това се е чупило.
 */
test.describe('жилището', () => {
  test.beforeEach(async ({ page }) => {
    await otvoriChisto(page, '/jilishte');
    await page.waitForTimeout(600);
  });

  test('една стрелка прави един скок, а не два', async ({ page }) => {
    // Фокусът върху стая и прозорецът слушаха стрелките заедно.
    await page.evaluate(() => {
      const r = [...document.querySelectorAll<SVGElement>('rect[role=button]')].find((x) =>
        x.getAttribute('aria-label')?.startsWith('Баня,'),
      );
      r?.focus();
    });
    await page.waitForTimeout(200);
    expect(await kadeSme(page)).toBe('Баня');

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(400);
    expect(await kadeSme(page)).toBe('Коридор');
  });

  test('стрелките водят из цялото жилище и се връщат', async ({ page }) => {
    const path: string[] = [];
    for (const key of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']) {
      await page.keyboard.press(key);
      await page.waitForTimeout(350);
      path.push(await kadeSme(page));
    }
    expect(path).toEqual(['Кухня', 'Всекидневна', 'Коридор', 'Антре']);
  });

  test('стаята, в която си, оцелява презареждане', async ({ page }) => {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(350);
    const before = await kadeSme(page);

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    expect(await kadeSme(page)).toBe(before);
  });

  test('изтрито име не оставя стаята без надпис', async ({ page }) => {
    await page.locator('aside').getByLabel('Име').fill('');
    await page.waitForTimeout(300);

    const labels = await imenaNaStaite(page);
    expect(labels.some((l) => l === '')).toBe(false);
    const buttons = await page.evaluate(() =>
      [...document.querySelectorAll('a, button')].map((n) => n.textContent?.trim() ?? ''),
    );
    expect(buttons.some((t) => /\s{2}/.test(t))).toBe(false);
  });

  test('празно жилище не се чупи и приема нова стая', async ({ page }) => {
    for (let i = 0; i < 12; i++) {
      const btn = page.locator('[role=toolbar]').getByRole('button', { name: 'Изтрий', exact: true });
      if (!(await btn.count()) || (await btn.isDisabled())) break;
      await btn.click();
      await page.waitForTimeout(200);
    }
    expect(await imenaNaStaite(page)).toEqual([]);

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);

    await page.getByRole('button', { name: '+ Кухня' }).click();
    await page.waitForTimeout(300);
    expect(await imenaNaStaite(page)).toHaveLength(1);
  });

  test('маркираните стаи се местят заедно и се трият заедно', async ({ page }) => {
    await izberiStaya(page, 'Кухня');
    const v = await sredataNaStaya(page, 'Всекидневна');
    await page.keyboard.down('Shift');
    await page.mouse.click(v.x, v.y);
    await page.keyboard.up('Shift');
    await page.waitForTimeout(300);

    const bar = page.locator('[role=toolbar] [aria-live=polite]');
    await expect(bar).toHaveText('2 помещения');

    // Мери се в милиметри: планът се премащабира и пикселите лъжат.
    const mm = () =>
      page.evaluate(() => {
        const raw = localStorage.getItem('korpus:jilishte:v1');
        if (!raw) return null;
        const rooms = (JSON.parse(raw) as { rooms: { name: string; x: number }[] }).rooms;
        return {
          k: rooms.find((r) => r.name === 'Кухня')?.x ?? 0,
          v: rooms.find((r) => r.name === 'Всекидневна')?.x ?? 0,
        };
      });

    // Едно записване, за да има какво да се сравни.
    await page.locator('[role=toolbar]').getByRole('button', { name: 'Копирай' }).click();
    await page.waitForTimeout(250);
    await page.keyboard.press('Meta+z');
    await page.waitForTimeout(250);
    await page.keyboard.press('Meta+z');
    await page.waitForTimeout(350);

    const before = await mm();
    const grab = await sredataNaStaya(page, 'Кухня');
    await page.mouse.move(grab.x, grab.y);
    await page.mouse.down();
    await page.mouse.move(grab.x + 180, grab.y + 60, { steps: 14 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    const after = await mm();
    expect(after!.k - before!.k).toBeGreaterThan(200);
    expect(after!.k - before!.k).toBe(after!.v - before!.v);
    await expect(bar).toHaveText('2 помещения');

    const count = (await imenaNaStaite(page)).length;
    await page.locator('[role=toolbar]').getByRole('button', { name: 'Изтрий', exact: true }).click();
    await page.waitForTimeout(400);
    expect(await imenaNaStaite(page)).toHaveLength(count - 2);
  });

  test('обзаведена стая се връща отметната и помни мебелта си', async ({ page }) => {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(350);

    // Клиентът минава по водения поток, не през конфигуратора.
    await page.getByRole('link', { name: /Обзаведете/ }).click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/proekt/);
    await podrediPoPravilata(page);
    await doKraya(page);

    const clips = () =>
      page.evaluate(() => document.querySelectorAll('[data-clip]:not([data-edge])').length);
    const made = await clips();
    expect(made).toBeGreaterThan(0);

    await page.getByRole('button', { name: /Готово — обратно/ }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(700);

    await expect(page.getByText(/Обзаведени: 1 от/)).toBeVisible();
    const marked = await page.evaluate(() =>
      [...document.querySelectorAll('rect[role=button]')]
        .map((n) => n.getAttribute('aria-label') ?? '')
        .filter((l) => l.includes('обзаведена')).length,
    );
    expect(marked).toBe(1);

    await page.getByRole('link', { name: /Променете/ }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    expect(await clips()).toBe(made);
  });

});
