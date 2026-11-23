import { defineConfig, devices } from '@playwright/test';

/**
 * Проверките с истински браузър.
 *
 * Правилата се проверяват с vitest — те са чист TypeScript. Тук е
 * другото: че влаченето хваща, че стрелката прави един скок, че
 * проектът стига от единия браузър до другия. Такива неща не се
 * доказват с unit тест и досега се ловяха на ръка.
 *
 * Сървърът се вдига сам. Ако вече върти `npm run dev`, се ползва той.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    locale: 'bg-BG',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'десктоп', use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 1100 } } },
    { name: 'телефон', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
