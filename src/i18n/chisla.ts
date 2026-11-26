/**
 * Числата и мерките на езика: десетична запетая у дома, точка навън.
 */

import type { Ezik } from './ezik';

/** Мерните единици, както се пишат до числото. */
export const MERKI: Record<Ezik, { m: string; mm: string }> = {
  bg: { m: 'м', mm: 'мм' },
  en: { m: 'm', mm: 'mm' },
  zh: { m: 'm', mm: 'mm' },
};

/** Милиметри като метри с два знака: `3600` → `3,60` (`3.60`). */
export function metri(mm: number, ezik: Ezik): string {
  const s = (mm / 1000).toFixed(2);
  return ezik === 'bg' ? s.replace('.', ',') : s;
}
