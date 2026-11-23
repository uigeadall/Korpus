import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Достъпност на всяка страница, в светла и тъмна тема.
 *
 * Темата се задава както я задава човек — със записан избор, а не с
 * настройката на системата: сайтът е светъл по подразбиране и не я
 * следва. Емулирането на тъмна система тук би проверявало светлата
 * тема два пъти.
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
      await page.addInitScript((s) => {
        try {
          localStorage.setItem('korpus-tema', s);
        } catch {
          // частен режим — темата ще е светлата
        }
      }, scheme);
      await page.goto(path, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(
        violations.map((v) => `${v.id}: ${v.nodes.length}`),
        `${path} ${scheme}`,
      ).toEqual([]);
    });
  }

  test(`${path} не се разлива настрани`, async ({ page }, info) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    const page_ = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      inner: window.innerWidth,
    }));
    expect(page_.scroll > page_.inner + 1, path).toBe(false);

    /*
     * И още нещо, което предишната проверка не хваща: когато нещо е
     * по-широко от екрана, телефонът не слага водоравна лента, а смалява
     * цялата страница и `width=device-width` отпада. Тогава двете числа
     * горе пак са равни — просто са станали 1293 вместо 412 и сайтът се
     * чете като през прозорец на самолет. Затова широчината се сверява с
     * тази на устройството.
     */
    const wanted = info.project.use.viewport?.width;
    if (wanted) expect(page_.inner, `${path} — широчина на изгледа`).toBe(wanted);
  });
}
