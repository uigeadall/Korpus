import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Трите езика: менюто горе вдясно, адресите и паметта за избора.
 *
 * Българският е у дома и адресите му не се менят — старите проверки
 * минават по тях. Тук е новото: че изборът води на същата страница на
 * другия език, че се помни и че текстът наистина е преведен, а не само
 * адресът сменен.
 */

const menu = (page: import('@playwright/test').Page) =>
  page.locator('header').getByRole('button', { name: /Изберете език|Choose language|选择语言/ });

test.describe('езиците', () => {
  test('менюто е горе вдясно и има трите езика', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const button = menu(page);
    await expect(button).toBeVisible();

    // В десния край на лентата — последното нещо в нея.
    const box = await button.boundingBox();
    const header = await page.locator('header').boundingBox();
    expect(box && header && box.x + box.width > header.width * 0.75).toBe(true);

    await button.click();
    const options = page.locator('header').getByRole('list', { name: 'Език' }).getByRole('link');
    await expect(options).toHaveText(['Български', 'English', '中文']);
    await expect(options.first()).toHaveAttribute('aria-current', 'true');
  });

  test('изборът води на същата страница на другия език', async ({ page }) => {
    await page.goto('/kak-rabotim', { waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'bg');

    await menu(page).click();
    await page.getByRole('link', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/en\/kak-rabotim$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'How furniture that truly fits gets made',
    );

    await menu(page).click();
    await page.getByRole('link', { name: '中文' }).click();
    await expect(page).toHaveURL(/\/zh\/kak-rabotim$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('合身家具是这样做出来的');

    await menu(page).click();
    await page.getByRole('link', { name: 'Български' }).click();
    await expect(page).toHaveURL(/\/kak-rabotim$/);
    await expect(page).not.toHaveURL(/\/(en|zh)\//);
    await expect(page.locator('html')).toHaveAttribute('lang', 'bg');
  });

  test('изборът се помни — български линк се отваря на избрания език', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await menu(page).click();
    await page.getByRole('link', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/en$/);

    await page.goto('/kontakt');
    await expect(page).toHaveURL(/\/en\/kontakt$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Write or call us');

    // Обратно на български — и паметта се сменя с него.
    await menu(page).click();
    await page.getByRole('link', { name: 'Български' }).click();
    await page.goto('/kontakt');
    await expect(page).toHaveURL(/\/kontakt$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Пишете или се обадете');
  });

  test('чужд линк на английски не сменя избора', async ({ page }) => {
    await page.goto('/en/produkti', { waitUntil: 'networkidle' });
    await page.goto('/produkti');
    await expect(page).toHaveURL(/\/produkti$/);
    await expect(page).not.toHaveURL(/\/en\//);
  });

  test('/bg/… отива на адреса без префикс', async ({ page }) => {
    await page.goto('/bg/portfolio');
    await expect(page).toHaveURL(/\/portfolio$/);
    await expect(page).not.toHaveURL(/\/bg\//);
  });

  test('менюто и връзките водят на същия език', async ({ page }) => {
    await page.goto('/zh', { waitUntil: 'networkidle' });
    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll('header nav a, footer a')].map((a) => a.getAttribute('href')),
    );
    expect(hrefs.length).toBeGreaterThan(5);
    for (const href of hrefs) expect(href, String(href)).toMatch(/^\/zh(\/|$)/);
  });

  test('„Направи проект" е преведен, а не само адресът', async ({ page }) => {
    await page.goto('/en/proekt', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Design your kitchen');
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeVisible();
    await expect(page.getByText('Which room are we furnishing?')).toBeVisible();
    // Нищо на кирилица в основната част, освен името „Български" в менюто.
    const cyr = await page.evaluate(() => {
      const main = document.querySelector('main');
      return (main?.innerText.match(/[А-Яа-я]+/g) ?? []).slice(0, 10);
    });
    expect(cyr).toEqual([]);
  });

  test('„Жилището" е преведено', async ({ page }) => {
    await page.goto('/zh/jilishte', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('画出您的住宅');
    const cyr = await page.evaluate(() => {
      const main = document.querySelector('main');
      return (main?.innerText.match(/[А-Яа-я]+/g) ?? []).slice(0, 10);
    });
    expect(cyr).toEqual([]);
  });

  test('смяната на езика пази проекта', async ({ page }) => {
    await page.goto('/proekt', { waitUntil: 'networkidle' });
    await page
      .getByRole('button', { name: /Спалня/ })
      .first()
      .click();
    await menu(page).click();
    await page.getByRole('link', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/en\/proekt$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Design your wardrobe');
  });
});

for (const path of [
  '/en',
  '/zh',
  '/en/proekt',
  '/zh/proekt',
  '/en/jilishte',
  '/zh/kontakt',
  '/en/usloviya',
]) {
  test(`${path} няма нарушения на достъпността`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(
      violations.map((v) => `${v.id}: ${v.nodes.length}`),
      path,
    ).toEqual([]);
  });

  test(`${path} не се разлива настрани`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const w = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      inner: window.innerWidth,
    }));
    expect(w.scroll > w.inner + 1, path).toBe(false);
  });
}
