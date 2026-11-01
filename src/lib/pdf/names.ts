/**
 * Имената на файловете стоят отделно от самия рендер: клиентът ги ползва,
 * без да дърпа PDF библиотеката в бъндъла.
 */

/** korpus-konfiguraciya-2026-11-01.pdf */
export function offerFileName(date = new Date()): string {
  return `korpus-konfiguraciya-${date.toISOString().slice(0, 10)}.pdf`;
}
