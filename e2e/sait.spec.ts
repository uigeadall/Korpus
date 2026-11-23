import { expect, test } from '@playwright/test';

/**
 * Какво вижда клиентът.
 *
 * Конфигураторът е техническият инструмент на цеха. Клиентът минава
 * по „Жилището" и „Направи проект"; да изскочи конфигураторът пред
 * него е връщане назад, а такива връзки се промъкват лесно.
 */
const KLIENTSKI = [
  '/',
  '/kak-rabotim',
  '/produkti',
  '/produkti/korpusna-mebel',
  '/portfolio',
  '/portfolio/primer',
  '/proekt',
  '/jilishte',
  '/kontakt',
];

test.describe('клиентският сайт', () => {
  test('менюто води само по клиентските екрани', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const menu = await page.evaluate(() =>
      [...document.querySelectorAll('nav a')].map((a) => a.textContent?.trim() ?? ''),
    );
    expect(menu).toContain('Жилището');
    expect(menu).toContain('Направи проект');
    expect(menu.some((t) => /онфигуратор/.test(t))).toBe(false);
  });

  for (const path of KLIENTSKI) {
    test(`${path} не праща клиента в конфигуратора`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      const links = await page.evaluate(() =>
        [...document.querySelectorAll('a[href*="konfigurator"]')].map(
          (a) => (a as HTMLAnchorElement).href,
        ),
      );
      expect(links, path).toEqual([]);
    });
  }

  /**
   * Човек с тъмна система трябва да може да види светлия сайт — и то
   * да си остане светъл след презареждане. Проверява се по истинския
   * фон, а не по атрибута: атрибутът може да се сложи и без CSS да го
   * хване.
   */
  test('темата се сменя на ръка и се помни', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });

    const fon = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const svetlina = (rgb: string) =>
      (rgb.match(/\d+/g) ?? ['0']).slice(0, 3).reduce((a, n) => a + Number(n), 0);

    expect(svetlina(await fon())).toBeLessThan(200);

    await page.getByRole('button', { name: 'Включете светлата тема' }).click();
    await page.waitForTimeout(250);
    expect(svetlina(await fon())).toBeGreaterThan(600);

    await page.reload({ waitUntil: 'networkidle' });
    expect(svetlina(await fon())).toBeGreaterThan(600);
  });

  test('инструментът още се отваря с адреса си и не се индексира', async ({ page }) => {
    await page.goto('/konfigurator', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await expect(page.getByText('вътрешен инструмент')).toBeVisible();
    const robots = await page.evaluate(
      () => document.querySelector('meta[name=robots]')?.getAttribute('content') ?? '',
    );
    expect(robots).toContain('noindex');
  });
});
