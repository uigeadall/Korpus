/**
 * Езикът на страницата — за сървърните компоненти.
 *
 * Идва от първия сегмент на адреса (`app/[lang]`). Българските адреси са
 * без префикс; `proxy.ts` ги пренасочва вътрешно към `/bg/…`, така че тук
 * езикът е винаги известен.
 */

import { lang } from 'next/root-params';
import { OSNOVEN, eEzik, type Ezik } from './ezik';
import type { Tekstove } from './tekst';

export async function getEzik(): Promise<Ezik> {
  const l = await lang();
  return eEzik(l) ? l : OSNOVEN;
}

/** Текстовете на раздела на езика на страницата. */
export async function getT<T>(t: Tekstove<T>): Promise<T> {
  return t[await getEzik()];
}
