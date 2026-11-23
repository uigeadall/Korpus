import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Достъпност на всяка страница, в светла и тъмна тема.
 *
 * Пази и нещо, което се чупи тихо: страница без `main` — тогава
 * връзката „към съдържанието" води наникъде, а axe го хваща.
 */
const STRANITSI = [
  '/',
  '/jilishte',
  '/kak-rabotim',
  '/produkti',
  '/produkti/korpusna-mebel',
  '/portfolio',
  '/portfolio/primer',
  '/proekt',
  '/konfigurator',
  '/kontakt',
  '/poveritelnost',
  '/usloviya',
  '/biskvitki',
];

for (const path of STRANITSI) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`${path} няма нарушения (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(
        violations.map((v) => `${v.id}: ${v.nodes.length}`),
        `${path} ${scheme}`,
      ).toEqual([]);
    });
  }

  test(`${path} не се разлива настрани`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflow, path).toBe(false);
  });
}
