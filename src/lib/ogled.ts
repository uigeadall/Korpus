/**
 * Кога е удобно за оглед — дни от седмицата и часови прозорци.
 *
 * Не е календар със заети часове: такъв иска база и знание колко огледа
 * на ден поема екипът (план 0.3 и 0.7). Това е пожеланието на клиента,
 * казано така, че да може да му се звънне веднъж, вместо три пъти да се
 * уточнява. Влиза в запитването и в писмото.
 */

export const OGLED_DAYS = ['pon', 'vt', 'sr', 'chet', 'pet', 'sab'] as const;
export type OgledDay = (typeof OGLED_DAYS)[number];

export const DAY_LABEL: Record<OgledDay, { short: string; long: string }> = {
  pon: { short: 'пн', long: 'понеделник' },
  vt: { short: 'вт', long: 'вторник' },
  sr: { short: 'ср', long: 'сряда' },
  chet: { short: 'чт', long: 'четвъртък' },
  pet: { short: 'пт', long: 'петък' },
  sab: { short: 'сб', long: 'събота' },
};

export const OGLED_TIMES = ['sutrin', 'obed', 'sledobed', 'vecher'] as const;
export type OgledTime = (typeof OGLED_TIMES)[number];

export const TIME_LABEL: Record<OgledTime, { name: string; hours: string }> = {
  sutrin: { name: 'сутрин', hours: '9–12 ч.' },
  obed: { name: 'обед', hours: '12–15 ч.' },
  sledobed: { name: 'следобед', hours: '15–18 ч.' },
  vecher: { name: 'вечер', hours: '18–20 ч.' },
};

export interface Ogled {
  days: OgledDay[];
  times: OgledTime[];
}

/**
 * Пожеланието от тялото на заявка — само познатото, без повторения, в
 * реда на седмицата и на деня. Нищо избрано значи няма пожелание.
 */
export function parseOgled(raw: unknown): Ogled | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const pick = <T extends string>(value: unknown, known: readonly T[]): T[] =>
    Array.isArray(value) ? known.filter((k) => value.includes(k)) : [];
  const days = pick(r.days, OGLED_DAYS);
  const times = pick(r.times, OGLED_TIMES);
  return days.length || times.length ? { days, times } : null;
}

/** „делнични дни · следобед (15–18 ч.)" — за писмото и за списъка. */
export function ogledText(o: Ogled | null): string {
  if (!o) return '';
  const weekdays = OGLED_DAYS.slice(0, 5);
  const allWeekdays = weekdays.every((d) => o.days.includes(d));
  let days: string;
  if (o.days.length === OGLED_DAYS.length) days = 'всеки ден без неделя';
  else if (allWeekdays) days = 'делнични дни';
  else days = o.days.map((d) => DAY_LABEL[d].long).join(', ');
  const times = o.times.map((t) => `${TIME_LABEL[t].name} (${TIME_LABEL[t].hours})`).join(', ');
  return [days, times].filter(Boolean).join(' · ');
}
