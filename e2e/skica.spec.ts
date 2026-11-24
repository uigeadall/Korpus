import { expect, test } from '@playwright/test';
import { doKraya, otvoriChisto, podrediPoPravilata } from './pomoshtni';

/**
 * Снимката по проекта.
 *
 * Без ключ моделът го няма и това трябва да се каже — не да се върти
 * безкрайно. С ключ пътят е същият, само отговорът е картинка.
 */
test('без ключ казва честно, вместо да увисне', async ({ page }) => {
  await otvoriChisto(page, '/proekt');
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /Кухня/ }).first().click();
  await page.waitForTimeout(300);
  await podrediPoPravilata(page);
  await doKraya(page);
  await page.waitForTimeout(600);

  const button = page.getByRole('button', { name: 'Генерирайте с AI' });
  await expect(button).toBeVisible();
  await button.click();

  /*
   * Отговорът трябва да дойде бързо: липсващ ключ не се чака.
   * Търси се по текста, не по ролята — Next сам слага един невидим
   * `role=alert` за съобщаване на смяната на страница.
   */
  await expect(page.getByText(/не са включени/)).toBeVisible({ timeout: 15000 });
});

test('кадърът, който тръгва към модела, е истински PNG и не е огромен', async ({ page }) => {
  await otvoriChisto(page, '/proekt');
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /Кухня/ }).first().click();
  await page.waitForTimeout(300);
  await podrediPoPravilata(page);
  await doKraya(page);
  await page.waitForTimeout(600);

  const zayavka = page.waitForRequest((r) => r.url().includes('/api/skica'));
  await page.getByRole('button', { name: 'Генерирайте с AI' }).click();
  const req = await zayavka;

  const body = JSON.parse(req.postData() ?? '{}') as {
    image: string;
    prompt: string;
    room: string;
  };

  expect(body.image.startsWith('iVBORw0KGgo'), 'кадърът не е PNG').toBe(true);
  // Таванът е сметка: по-голям кадър не прави снимката по-добра.
  expect(body.image.length).toBeLessThan(4 * 1024 * 1024);
  expect(body.prompt).toContain('photorealistic');
  expect(body.prompt).not.toMatch(/[А-Яа-я]/);
  expect(body.room).toBe('kitchen');
});

test('върнатата снимка се показва, носи надписа и се сваля', async ({ page }) => {
  /*
   * Ключ няма, затова отговорът се подменя. Проверява се последното
   * звено, което иначе остава непроверено: че картинката стига до
   * екрана и че надписът „това е впечатление" върви с нея.
   */
  const PIXEL =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  await page.route('**/api/skica', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ image: PIXEL, mime: 'image/png' }),
    }),
  );

  await otvoriChisto(page, '/proekt');
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /Кухня/ }).first().click();
  await page.waitForTimeout(300);
  await podrediPoPravilata(page);
  await doKraya(page);
  await page.waitForTimeout(600);

  await page.getByRole('button', { name: 'Генерирайте с AI' }).click();

  const snimka = page.getByRole('img', { name: /Снимка на стаята/ });
  await expect(snimka).toBeVisible({ timeout: 15000 });

  // Надписът не е украса: той дели снимката от чертежа.
  await expect(page.getByText('Това е впечатление, не чертеж.')).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.getByRole('button', { name: 'Свалете снимката' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^korpus-kitchen-snimka-\d{4}-\d{2}-\d{2}\.png$/);
});
