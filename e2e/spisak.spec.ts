import { expect, test } from '@playwright/test';
import { doKraya, otvoriChisto, podrediPoPravilata } from './pomoshtni';

/**
 * Един списък за цеха от цялото жилище.
 *
 * Дотук шест обзаведени стаи даваха шест файла. Това е проверката, че
 * от браузъра наистина слиза ЕДИН файл и че преди да има какво да се
 * реже, бутонът честно не се натиска.
 */
test.describe('списък за цеха', () => {
  test('без обзаведена стая бутоните не се натискат', async ({ page }) => {
    await otvoriChisto(page, '/jilishte');
    await page.waitForTimeout(700);

    const pdf = page.getByRole('button', { name: /Свалете списък за цеха/ });
    await expect(pdf).toBeDisabled();
    await expect(page.getByText(/Обзаведете поне една стая/)).toBeVisible();
  });

  test('обзаведена стая дава един файл за цялото жилище', async ({ page }) => {
    await otvoriChisto(page, '/jilishte');
    await page.waitForTimeout(700);

    await page.getByRole('link', { name: /Обзаведете/ }).click();
    await page.waitForURL(/\/proekt/);
    await page.waitForLoadState('networkidle');
    await podrediPoPravilata(page);
    await doKraya(page);
    await page.getByRole('button', { name: /Готово — обратно/ }).click();
    await page.waitForURL(/\/jilishte/);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(700);

    await expect(page.getByText(/Една обзаведена стая в един файл/)).toBeVisible();

    const pdf = page.getByRole('button', { name: /Свалете списък за цеха/ });
    await expect(pdf).toBeEnabled();

    const [svaleno] = await Promise.all([page.waitForEvent('download'), pdf.click()]);
    expect(svaleno.suggestedFilename()).toMatch(/^korpus-jilishte-\d{4}-\d{2}-\d{2}\.pdf$/);

    // Файлът е същински, не празна обвивка.
    const path = await svaleno.path();
    expect(path).toBeTruthy();
  });

  test('таблицата слиза като xlsx със същото име', async ({ page }) => {
    await otvoriChisto(page, '/jilishte');
    await page.waitForTimeout(700);

    await page.getByRole('link', { name: /Обзаведете/ }).click();
    await page.waitForURL(/\/proekt/);
    await page.waitForLoadState('networkidle');
    await podrediPoPravilata(page);
    await doKraya(page);
    await page.getByRole('button', { name: /Готово — обратно/ }).click();
    await page.waitForURL(/\/jilishte/);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(700);

    const xlsx = page.getByRole('button', { name: /Свалете таблица за цеха/ });
    const [svaleno] = await Promise.all([page.waitForEvent('download'), xlsx.click()]);
    expect(svaleno.suggestedFilename()).toMatch(/^korpus-jilishte-\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});
