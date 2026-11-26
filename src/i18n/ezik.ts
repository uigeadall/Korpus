/**
 * Езиците на сайта — без React и без Next.
 *
 * Българският е у дома: адресите му са без префикс (`/proekt`). Другите
 * живеят под своя код (`/en/proekt`, `/zh/proekt`). Така връзките, които
 * вече са пратени, не се чупят, а всеки език има свой адрес за търсачката.
 *
 * Адресите на страниците (`kak-rabotim`, `proekt`) не се превеждат — те
 * са имена, не текст. Превежда се това, което се чете.
 */

export const EZICI = ['bg', 'en', 'zh'] as const;

export type Ezik = (typeof EZICI)[number];

export const OSNOVEN: Ezik = 'bg';

/** Името на езика, казано на самия език — човек търси своя, не нашия превод. */
export const IME_NA_EZIKA: Record<Ezik, string> = {
  bg: 'Български',
  en: 'English',
  zh: '中文',
};

/** Кратко за бутона в менюто. */
export const KOD_NA_EZIKA: Record<Ezik, string> = {
  bg: 'БГ',
  en: 'EN',
  zh: '中',
};

/** За `<html lang>` и `hreflang`. Китайският е опростен. */
export const HTML_LANG: Record<Ezik, string> = {
  bg: 'bg',
  en: 'en',
  zh: 'zh-Hans',
};

/** За `Intl` — числа и дати. */
export const LOCALE: Record<Ezik, string> = {
  bg: 'bg-BG',
  en: 'en-GB',
  zh: 'zh-CN',
};

/** Бисквитката, в която стои изборът от менюто. */
export const BISKVITKA = 'korpus-ezik';

export function eEzik(s: string | undefined | null): s is Ezik {
  return (EZICI as readonly string[]).includes(s ?? '');
}

/**
 * Адресът на страница на даден език. `put` е българският адрес —
 * `/proekt?p=…`, `/`, `#kotva`. Външни адреси и `mailto:` минават както са.
 */
export function adres(ezik: Ezik, put: string): string {
  if (!put.startsWith('/') || put.startsWith('//')) return put;
  const bez = razdeli(put).put;
  if (ezik === OSNOVEN) return bez;
  if (bez === '/') return `/${ezik}`;
  if (bez.startsWith('/?') || bez.startsWith('/#')) return `/${ezik}${bez.slice(1)}`;
  return `/${ezik}${bez}`;
}

/**
 * Обратното на `adres`: от `/en/proekt?p=1` — езикът и българският адрес.
 * Адрес без префикс е български.
 */
export function razdeli(put: string): { ezik: Ezik; put: string } {
  const m = /^\/(bg|en|zh)(?=$|[/?#])(.*)$/.exec(put);
  if (!m) return { ezik: OSNOVEN, put };
  const ostatak = m[2] || '/';
  return { ezik: m[1] as Ezik, put: ostatak.startsWith('/') ? ostatak : `/${ostatak}` };
}

/** Простото заместване на `{ime}` в текст. Липсващ ключ остава видим. */
export function popalni(text: string, stoinosti: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (cialo, kluch: string) =>
    kluch in stoinosti ? String(stoinosti[kluch]) : cialo,
  );
}
