import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

/*
 * Адресите на тази машина в локалната мрежа (напр. 172.20.10.3).
 * Без тях Next в режим на разработка отказва скриптовете на страница,
 * отворена от телефона — тя се рисува, но нито един бутон не работи.
 */
const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((n) => n && n.family === "IPv4" && !n.internal)
  .map((n) => n!.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: lanAddresses,
  // Шрифтовете за PDF се четат от диска по време на изпълнение, затова
  // трябва да влязат в пакета на функцията при деплой.
  outputFileTracingIncludes: {
    '/api/export/pdf': ['./src/assets/fonts/**'],
  },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
