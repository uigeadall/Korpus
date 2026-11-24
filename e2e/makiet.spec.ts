import { expect, test } from '@playwright/test';
import { DEFAULT_ROOM_NEEDS, layoutFor } from '../src/lib/autolayout';
import { emptyKitchen, type RoomKind } from '../src/lib/cabinet-rules';
import { defaultFlat } from '../src/lib/flat';
import { encodeProject } from '../src/lib/share';
import { doKraya, kadeSme, otvoriChisto, podrediPoPravilata } from './pomoshtni';

/**
 * Макетът на жилището — какво се вижда вътре и какво може да се прави.
 *
 * Дотук показваше само пода и зидовете: човек обзавеждаше шест стаи и
 * се връщаше в празни кутии.
 */

const lica = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.querySelectorAll('svg[aria-label^="Макет"] polygon').length);

/** Жилище, в което всяка стая е обзаведена — направо в хранилището. */
async function obzavedenoJilishte(page: import('@playwright/test').Page) {
  const flat = defaultFlat();
  const rooms = flat.rooms.map((r) => {
    const kind = r.kind as RoomKind;
    const wall = Math.min(r.width, 5000);
    const k = emptyKitchen(wall);
    k.roomKind = kind;
    k.room = { width: r.width, depth: r.depth };
    const l = layoutFor(kind, wall, DEFAULT_ROOM_NEEDS);
    k.walls[0] = { ...k.walls[0], base: l.base, upper: l.upper };
    return { ...r, project: encodeProject(k) };
  });

  await page.goto('/jilishte', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    (f) => {
      localStorage.clear();
      localStorage.setItem('korpus:jilishte:v1', JSON.stringify(f));
    },
    { rooms },
  );
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
}

test.describe('мебелта в макета', () => {
  test('обзаведена стая се вижда отвътре, празна — не', async ({ page }) => {
    await otvoriChisto(page, '/jilishte');
    await page.waitForTimeout(900);
    const prazno = await lica(page);

    await page.getByRole('link', { name: /Обзаведете/ }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await podrediPoPravilata(page);
    await doKraya(page);
    await page.getByRole('button', { name: /Готово — обратно/ }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1200);

    expect(await lica(page)).toBeGreaterThan(prazno);
  });

  test('цяло обзаведено жилище се рисува, без да залива кадъра', async ({ page }) => {
    await obzavedenoJilishte(page);

    const n = await lica(page);
    expect(n).toBeGreaterThan(150);
    /*
     * Таван, не украса: макетът е преглед, не изглед на стая. Мине ли
     * нагоре, значи някой е почнал да рисува дръжки отвисоко и
     * рисуването ще се скапе при дванайсет стаи.
     */
    expect(n).toBeLessThan(600);
  });

  test('мебелта се вижда в кадъра, не се реже отгоре', async ({ page }) => {
    await obzavedenoJilishte(page);

    const вън = await page.evaluate(() => {
      const svg = document.querySelector('svg[aria-label^="Макет"]') as SVGSVGElement;
      const [vx, vy, vw, vh] = (svg.getAttribute('viewBox') ?? '')
        .split(' ')
        .map(Number);
      // Всеки връх трябва да е вътре в кутията на изгледа.
      return [...svg.querySelectorAll('polygon')].some((p) =>
        (p.getAttribute('points') ?? '')
          .split(' ')
          .some((pair) => {
            const [x, y] = pair.split(',').map(Number);
            return x < vx - 1 || x > vx + vw + 1 || y < vy - 1 || y > vy + vh + 1;
          }),
      );
    });
    expect(вън).toBe(false);
  });
});

test.describe('макетът става за работа', () => {
  test('щракване по помещение води в него', async ({ page }) => {
    await otvoriChisto(page, '/jilishte');
    await page.waitForTimeout(900);
    const predi = await kadeSme(page);

    // Най-големият под в кадъра е друга стая, не тази, в която сме.
    const tochka = await page.evaluate(() => {
      const svg = document.querySelector('svg[aria-label^="Макет"]')!;
      svg.scrollIntoView({ block: 'center' });
      const подове = [...svg.querySelectorAll('polygon[class*="cursor-pointer"]')]
        .map((p) => ({ p, b: p.getBoundingClientRect() }))
        .sort((a, b) => b.b.width * b.b.height - a.b.width * a.b.height);
      const цел = подове[0];
      return цел ? { x: цел.b.x + цел.b.width / 2, y: цел.b.y + цел.b.height / 2 } : null;
    });
    expect(tochka, 'подовете не се хващат').not.toBeNull();

    await page.waitForTimeout(200);
    await page.mouse.click(tochka!.x, tochka!.y);
    await page.waitForTimeout(600);

    expect(await kadeSme(page)).not.toBe(predi);
  });
});

test.describe('връщането в жилището', () => {
  /*
   * Бутонът стоеше най-долу, под цената и снимките, в колона, която се
   * скролира отделно. Човек натискаше „Готово" горе, отиваше в жилището
   * от менюто и стаята си стоеше празна.
   */
  test('„Готово — обратно към жилището" е най-отгоре на последната стъпка', async ({ page }, info) => {
    // Целият път през съветника; под товар dev сървърът компилира бавно.
    test.slow();
    await otvoriChisto(page, '/jilishte');
    await page.waitForTimeout(900);
    await page.getByRole('link', { name: /Обзаведете/ }).first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /Напред|Подредете/ }).first()).toBeVisible({
      timeout: 30000,
    });
    await podrediPoPravilata(page);
    await doKraya(page);

    const obratno = page.getByRole('button', { name: /Готово — обратно/ });
    const poluchi = page.getByText('Ето какво се получи');
    const yO = (await obratno.boundingBox())!.y;
    const yP = (await poluchi.boundingBox())!.y;
    expect(yO, 'бутонът е под обобщението').toBeLessThan(yP);

    if (info.project.name === 'десктоп') {
      // Видим без скролиране — колоната вдясно е закована.
      await expect(obratno).toBeInViewport();
    }

    await obratno.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/jilishte$/);
  });
});

test.describe('мерките на обзаведената стая', () => {
  /*
   * Стаята в жилището и стаята в проекта бяха две отделни мерки. Стесни
   * ли се едната, масата и креслото излизаха през зида в макета.
   */
  test('не се стеснява под мебелта си, казва защо, а където се побира — минава', async ({ page }) => {
    const flat = defaultFlat();
    const rooms = flat.rooms.map((r) => {
      if (r.kind !== 'living') return r;
      const k = emptyKitchen(r.width);
      k.roomKind = 'living';
      k.room = { width: r.width, depth: r.depth };
      const l = layoutFor('living', r.width, DEFAULT_ROOM_NEEDS);
      k.walls[0] = { ...k.walls[0], base: l.base, upper: l.upper };
      k.furnishings = [{ id: 't', kind: 'dining-table', x: 2600, z: 1500, rotation: 0 }];
      return { ...r, project: encodeProject(k) };
    });
    await page.goto('/jilishte', { waitUntil: 'domcontentloaded' });
    await page.evaluate(
      (f) => {
        localStorage.clear();
        localStorage.setItem('korpus:jilishte:v1', JSON.stringify(f));
        localStorage.setItem('korpus:jilishte:tuk', 'f-living');
      },
      { rooms },
    );
    await page.reload({ waitUntil: 'networkidle' });

    // Пише се цифра по цифра, както човек — не наведнъж.
    const width = page.getByLabel('Ширина');
    await width.click({ clickCount: 3 });
    await page.keyboard.type('2400', { delay: 40 });
    await page.keyboard.press('Tab');
    await expect(page.getByText(/не се побира в 2,40 × 2,00 м/)).toBeVisible();
    await expect(width).toHaveValue('3600');

    const depth = page.getByLabel('Дълбочина');
    await depth.click({ clickCount: 3 });
    await page.keyboard.type('1600', { delay: 40 });
    await page.keyboard.press('Tab');
    await expect(depth).toHaveValue('1600');
  });
});
