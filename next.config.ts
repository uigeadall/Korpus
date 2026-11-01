import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
