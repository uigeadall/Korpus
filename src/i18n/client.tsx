'use client';

/**
 * Езикът на страницата — за клиентските компоненти.
 *
 * Слага го коренният layout, който го чете от адреса. Тук само се
 * разнася надолу, без да се подава от ръка на ръка.
 */

import { createContext, useContext, type ReactNode } from 'react';
import { BISKVITKA, OSNOVEN, adres, type Ezik } from './ezik';
import type { Tekstove } from './tekst';

const EzikCtx = createContext<Ezik>(OSNOVEN);

export function EzikProvider({ ezik, children }: { ezik: Ezik; children: ReactNode }) {
  return <EzikCtx.Provider value={ezik}>{children}</EzikCtx.Provider>;
}

export function useEzik(): Ezik {
  return useContext(EzikCtx);
}

/** Текстовете на раздела на текущия език. */
export function useT<T>(t: Tekstove<T>): T {
  return t[useContext(EzikCtx)];
}

/**
 * Изборът от менюто, запомнен за една година. Чете го `proxy.ts`, за да
 * отвори пратен български линк на избрания език.
 */
export function zapomniEzik(ezik: Ezik): void {
  document.cookie = `${BISKVITKA}=${ezik}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/** Адрес на страница на текущия език: `useAdres()('/proekt')` → `/en/proekt`. */
export function useAdres(): (put: string) => string {
  const ezik = useContext(EzikCtx);
  return (put) => adres(ezik, put);
}
