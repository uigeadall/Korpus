import { expect, test } from '@playwright/test';
import { doKraya, otvoriChisto, podrediPoPravilata } from './pomoshtni';

/**
 * Снимката по проекта.
 *
 * Без ключ моделът го няма и това трябва да се каже — не да се върти
 * безкрайно. С ключ пътят е същият, само отговорът е картинка.
 */
test('без ключ казва честно, вместо да увисне', async ({ page, request }) => {
  /*
   * Проверката пита как се държи вратата БЕЗ ключ. Има ли ключ в
   * средата (`.env.local` при разработка), отговорът е друг и тя
   * няма какво да мери — пропуска се с причина, вместо да падне и
   * да изглежда като счупване. Същинската проверка на разчитането
   * е в `src/lib/skica.test.ts` и тя върви винаги.
   */
  const door = await request.post('/api/skica', { data: { image: 'x', prompt: 'x' } });
  test.skip(door.status() !== 503, 'средата има ключ — няма „без ключ" за мерене');

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

/*
 * „Харесва ми" и „Не ми харесва". Моделът се подменя: проверява се
 * пътят на човека, не моделът.
 */
const BYAL =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const CHERVEN =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

async function doSnimka(page: import('@playwright/test').Page) {
  await otvoriChisto(page, '/proekt');
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /Кухня/ }).first().click();
  await page.waitForTimeout(300);
  await podrediPoPravilata(page);
  await doKraya(page);
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Генерирайте с AI' }).click();
  await expect(page.getByRole('img', { name: /Снимка на стаята/ })).toBeVisible({ timeout: 15000 });
}

test('„Не ми харесва" рисува нова, а старата стои, докато дойде', async ({ page }) => {
  let pusni: () => void = () => {};
  const vtora = new Promise<void>((r) => (pusni = r));
  let broy = 0;
  await page.route('**/api/skica', async (route) => {
    broy++;
    if (broy === 2) await vtora;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ image: broy === 1 ? BYAL : CHERVEN, mime: 'image/png' }),
    });
  });

  await doSnimka(page);
  const snimka = page.getByRole('img', { name: /Снимка на стаята/ });
  expect(await snimka.getAttribute('src')).toContain(BYAL);

  await page.getByRole('button', { name: 'Не ми харесва — нова' }).click();

  // Докато моделът рисува: старата снимка е тук, бутонът казва какво става.
  await expect(page.getByRole('button', { name: 'AI рисува нова…' })).toBeDisabled();
  await expect(snimka).toBeVisible();
  expect(await snimka.getAttribute('src')).toContain(BYAL);

  pusni();
  await expect.poll(() => snimka.getAttribute('src')).toContain(CHERVEN);
  expect(broy).toBe(2);
});

test('„Харесва ми" праща снимката и линка към проекта през менюто за споделяне', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __spodeleno?: { files: number; type: string; text: string } };
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: { files: File[]; text: string }) => {
        w.__spodeleno = { files: data.files.length, type: data.files[0].type, text: data.text };
      },
    });
  });
  await page.route('**/api/skica', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ image: BYAL, mime: 'image/png' }) }),
  );

  await doSnimka(page);
  await page.getByRole('button', { name: 'Харесва ми — пратете я' }).click();

  await expect(page.getByText('✓ Изпратено.')).toBeVisible();
  const spodeleno = await page.evaluate(
    () => (window as unknown as { __spodeleno?: { files: number; type: string; text: string } }).__spodeleno,
  );
  expect(spodeleno?.files).toBe(1);
  expect(spodeleno?.type).toBe('image/png');
  expect(spodeleno?.text).toContain('/proekt?p=');
});

test('„Харесва ми" без меню за споделяне сваля снимката', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
  });
  await page.route('**/api/skica', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ image: BYAL, mime: 'image/png' }) }),
  );

  await doSnimka(page);
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.getByRole('button', { name: 'Харесва ми — пратете я' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^korpus-kitchen-snimka-\d{4}-\d{2}-\d{2}\.png$/);
  await expect(page.getByText(/Снимката е свалена/)).toBeVisible();
});
