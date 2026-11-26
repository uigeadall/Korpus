/**
 * Кога е удобно за оглед — дни от седмицата и часови прозорци.
 *
 * Не е календар със заети часове: такъв иска база и знание колко огледа
 * на ден поема екипът (план 0.3 и 0.7). Това е пожеланието на клиента,
 * казано така, че да може да му се звънне веднъж, вместо три пъти да се
 * уточнява. Влиза в запитването и в писмото.
 */

import type { Ezik } from '@/i18n/ezik';
import { izbroi, tekstove } from '@/i18n/tekst';

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

/** Дните и часовете на трите езика. Българският е и в `DAY_LABEL` / `TIME_LABEL`. */
export const OGLED_TEKST = tekstove<{
  dni: Record<OgledDay, { short: string; long: string }>;
  chasove: Record<OgledTime, { name: string; hours: string }>;
  vseki: string;
  delnichni: string;
}>({
  bg: { dni: DAY_LABEL, chasove: TIME_LABEL, vseki: 'всеки ден без неделя', delnichni: 'делнични дни' },
  en: {
    dni: {
      pon: { short: 'Mon', long: 'Monday' },
      vt: { short: 'Tue', long: 'Tuesday' },
      sr: { short: 'Wed', long: 'Wednesday' },
      chet: { short: 'Thu', long: 'Thursday' },
      pet: { short: 'Fri', long: 'Friday' },
      sab: { short: 'Sat', long: 'Saturday' },
    },
    chasove: {
      sutrin: { name: 'morning', hours: '9–12' },
      obed: { name: 'midday', hours: '12–15' },
      sledobed: { name: 'afternoon', hours: '15–18' },
      vecher: { name: 'evening', hours: '18–20' },
    },
    vseki: 'every day except Sunday',
    delnichni: 'weekdays',
  },
  zh: {
    dni: {
      pon: { short: '一', long: '周一' },
      vt: { short: '二', long: '周二' },
      sr: { short: '三', long: '周三' },
      chet: { short: '四', long: '周四' },
      pet: { short: '五', long: '周五' },
      sab: { short: '六', long: '周六' },
    },
    chasove: {
      sutrin: { name: '上午', hours: '9–12 点' },
      obed: { name: '中午', hours: '12–15 点' },
      sledobed: { name: '下午', hours: '15–18 点' },
      vecher: { name: '晚上', hours: '18–20 点' },
    },
    vseki: '除周日外每天',
    delnichni: '工作日',
  },
});

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
export function ogledText(o: Ogled | null, ezik: Ezik = 'bg'): string {
  if (!o) return '';
  const t = OGLED_TEKST[ezik];
  const weekdays = OGLED_DAYS.slice(0, 5);
  const allWeekdays = weekdays.every((d) => o.days.includes(d));
  let days: string;
  if (o.days.length === OGLED_DAYS.length) days = t.vseki;
  else if (allWeekdays) days = t.delnichni;
  else days = izbroi(o.days.map((d) => t.dni[d].long), ezik);
  const times = izbroi(
    o.times.map((x) => `${t.chasove[x].name} (${t.chasove[x].hours})`),
    ezik,
  );
  return [days, times].filter(Boolean).join(' · ');
}
