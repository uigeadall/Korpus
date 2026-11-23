/**
 * Помощни за проверките с браузър.
 *
 * Тук стоят нещата, в които проби вече ме подвеждаха: чистене на
 * хранилището веднъж, а не при всяко зареждане; намиране на стая по
 * име, а не по ред; избиране с истинско щракване, а не със синтетично
 * събитие без координати.
 */

import type { Page } from '@playwright/test';

/**
 * Отваря страница с празно хранилище.
 *
 * Чисти се веднъж и после се презарежда. `addInitScript` би чистил
 * при всяко зареждане и запазването би изглеждало счупено, без да е.
 */
export async function otvoriChisto(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
}

/** Къде сме в жилището, според макета. */
export function kadeSme(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      document
        .querySelector('svg[role=img][aria-label^="Макет"]')
        ?.getAttribute('aria-label')
        ?.replace('Макет на жилището. Сега сте в: ', '')
        .replace('.', '') ?? '',
  );
}

/** Имената на помещенията в плана, без дръжката за опъване. */
export function imenaNaStaite(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('rect[role=button]')]
      .map((n) => n.getAttribute('aria-label') ?? '')
      .filter((l) => !l.startsWith('Опънете'))
      .map((l) => l.split(',')[0]),
  );
}

/** Средата на стая по име, в екранни координати. */
export async function sredataNaStaya(
  page: Page,
  name: string,
): Promise<{ x: number; y: number }> {
  await page.evaluate((n) => {
    [...document.querySelectorAll('rect[role=button]')]
      .find((x) => x.getAttribute('aria-label')?.startsWith(`${n},`))
      ?.scrollIntoView({ block: 'center' });
  }, name);
  await page.waitForTimeout(120);
  return page.evaluate((n) => {
    const r = [...document.querySelectorAll('rect[role=button]')].find((x) =>
      x.getAttribute('aria-label')?.startsWith(`${n},`),
    );
    const b = r!.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }, name);
}

/**
 * Избира стая с истинско щракване.
 *
 * Синтетично `pointerdown` без координати оставя влаченето въоръжено
 * и следващото движение мести стаята с безумно отместване.
 */
export async function izberiStaya(page: Page, name: string): Promise<void> {
  const p = await sredataNaStaya(page, name);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(200);
}

/** Минава през стъпките на „Направи проект" до края. */
export async function doKraya(page: Page): Promise<void> {
  for (let i = 0; i < 5; i++) {
    const moved = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(
        (n) => /Напред|Готово|Вижте/.test(n.textContent ?? '') && !(n as HTMLButtonElement).disabled,
      );
      if (!b) return false;
      (b as HTMLButtonElement).click();
      return true;
    });
    if (!moved) break;
    await page.waitForTimeout(350);
  }
  await page.waitForTimeout(500);
}

/** Клиповете в лентата, по пътечки. */
export function klipove(page: Page, row: 'base' | 'upper' = 'base'): Promise<string[]> {
  return page.evaluate(
    (r) =>
      [...document.querySelectorAll(`[data-track="${r}"] [data-clip]:not([data-edge])`)].map(
        (n) => (n as HTMLElement).dataset.clip ?? '',
      ),
    row,
  );
}

/** Какво пише долната лента за избраното. */
export function izbranoto(page: Page): Promise<string> {
  return page.evaluate(
    () => document.querySelector('[role=toolbar] [aria-live=polite]')?.textContent?.trim() ?? '',
  );
}

/** Средата на клип в лентата. */
export async function sredataNaKlip(page: Page, id: string): Promise<{ x: number; y: number }> {
  await page.evaluate((i) => {
    document
      .querySelector(`[data-clip="${i}"]:not([data-edge])`)
      ?.scrollIntoView({ block: 'center' });
  }, id);
  await page.waitForTimeout(120);
  return page.evaluate((i) => {
    const b = document
      .querySelector(`[data-clip="${i}"]:not([data-edge])`)!
      .getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }, id);
}
