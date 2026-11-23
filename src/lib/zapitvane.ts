/**
 * Запитването: какво изпраща клиентът и какво приемаме.
 *
 * Крайната точка е публична, затова нищо от тялото не се приема на
 * доверие. Проверката е тук, а не в маршрутката, защото това е правило,
 * не рисуване — и се проверява с тест, без мрежа и без сървър.
 *
 * Две неща са нарочни и струва да се знаят.
 *
 * Първо: искаме поне един начин да отговорим. Запитване без телефон и
 * без имейл е бележка в бутилка — клиентът остава с усещането, че се е
 * обадил, а ние нямаме как да го намерим.
 *
 * Второ: записите на жилището и на стаята се проверяват, че наистина
 * се отварят, а не само че са низ. По-добре да се откаже на вратата,
 * отколкото да лежи в базата нещо, което никой няма да може да отвори.
 * Дължината се проверява ПРЕДИ отварянето — разгъването на мегабайтов
 * base64 е работа, която не искаме да вършим по чужда поръчка.
 */

import { decodeFlat } from './flat-share';
import { type Ogled, ogledText, parseOgled } from './ogled';
import { decodeProject } from './share';

/** Горни граници, за да не може една заявка да изяде сървъра. */
export const LIMITS = {
  /** Цялото тяло, в байтове. */
  body: 64 * 1024,
  name: 80,
  phone: 24,
  email: 254,
  note: 2000,
  /** Пълно жилище от дванайсет стаи е под 4000 — двойно, за запас. */
  flat: 8000,
  project: 4000,
} as const;

/** Какво стига до нас, след като е проверено. */
export interface Zapitvane {
  name: string;
  /** Поне едно от двете го има — проверката го гарантира. */
  phone: string | null;
  email: string | null;
  note: string;
  /** Жилището, както пътува в линк. Празно значи „само въпрос". */
  flat: string | null;
  /** Една стая, когато идва от „Направи проект". */
  project: string | null;
  /**
   * Кога е удобно за оглед. Липсва, ако клиентът не е казал — тогава
   * се пита по телефона, както и досега.
   */
  ogled?: Ogled;
  /** Изрично съгласие за обработка на лични данни. Без него не минава. */
  consent: true;
}

export interface Problem {
  /** Кое поле — за да може формата да покаже грешката при него. */
  field: keyof Zapitvane | 'body';
  said: string;
}

export type Validation =
  | { ok: true; value: Zapitvane }
  | { ok: false; problems: Problem[] };

/** Празни места се свиват: „  Иван   Петров " става „Иван Петров". */
function tidy(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}

/**
 * Телефон по български навик: може с код, може с интервали и тирета.
 *
 * Не се проверява дали номерът съществува — това се вижда чак при
 * звънене. Проверява се само дали изобщо е номер: строгите образци
 * отрязват истински хора заради начина, по който са го написали.
 */
export function looksLikePhone(value: string): boolean {
  if (!/^[\d\s()+-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 6 && digits.length <= 15;
}

/**
 * Имейл: има едно кучé, има точка след него, няма празни места.
 *
 * Пълната проверка по стандарта е по-дълга от този файл и пак пуска
 * адреси, които не съществуват. Тук се лови само явната грешка.
 */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(value) && value.length <= LIMITS.email;
}

export function parseZapitvane(raw: unknown): Validation {
  const problems: Problem[] = [];
  if (!raw || typeof raw !== 'object') {
    return { ok: false, problems: [{ field: 'body', said: 'Заявката не е разбираема.' }] };
  }
  const r = raw as Record<string, unknown>;

  const name = tidy(r.name, LIMITS.name);
  if (name.length < 2) {
    problems.push({ field: 'name', said: 'Напишете име, за да знаем как да се обърнем.' });
  }

  const phoneRaw = tidy(r.phone, LIMITS.phone);
  const emailRaw = tidy(r.email, LIMITS.email).toLowerCase();

  if (phoneRaw && !looksLikePhone(phoneRaw)) {
    problems.push({ field: 'phone', said: 'Телефонът изглежда непълен.' });
  }
  if (emailRaw && !looksLikeEmail(emailRaw)) {
    problems.push({ field: 'email', said: 'Имейлът изглежда сбъркан.' });
  }
  if (!phoneRaw && !emailRaw) {
    problems.push({ field: 'phone', said: 'Оставете телефон или имейл — иначе няма как да отговорим.' });
  }

  const note = tidy(r.note, LIMITS.note);

  /*
   * Записите: първо дължина, после отваряне. Обратният ред значи да
   * разгъваме колкото ни пратят.
   */
  let flat: string | null = null;
  if (typeof r.flat === 'string' && r.flat) {
    if (r.flat.length > LIMITS.flat) {
      problems.push({ field: 'flat', said: 'Жилището е прекалено голямо.' });
    } else if (!decodeFlat(r.flat)) {
      problems.push({ field: 'flat', said: 'Записът на жилището не се отваря.' });
    } else {
      flat = r.flat;
    }
  }

  let project: string | null = null;
  if (typeof r.project === 'string' && r.project) {
    if (r.project.length > LIMITS.project) {
      problems.push({ field: 'project', said: 'Проектът е прекалено голям.' });
    } else if (!decodeProject(r.project)) {
      problems.push({ field: 'project', said: 'Записът на проекта не се отваря.' });
    } else {
      project = r.project;
    }
  }

  if (r.consent !== true) {
    problems.push({
      field: 'consent',
      said: 'Трябва съгласие за обработка на данните, за да ви отговорим.',
    });
  }

  if (problems.length) return { ok: false, problems };

  // Пожеланието не може да провали запитването: непознатото просто отпада.
  const ogled = parseOgled(r.ogled);

  return {
    ok: true,
    value: {
      name,
      phone: phoneRaw || null,
      email: emailRaw || null,
      note,
      flat,
      project,
      ...(ogled ? { ogled } : {}),
      consent: true,
    },
  };
}

/**
 * Кратко описание за имейла и за списъка в админа.
 *
 * Стои тук, а не където се праща имейл: това е същото правило —
 * какво значи едно запитване — и се проверява със същия тест.
 */
export function summaryOf(z: Zapitvane): string {
  const parts: string[] = [z.name];
  if (z.phone) parts.push(z.phone);
  if (z.email) parts.push(z.email);

  const flat = z.flat ? decodeFlat(z.flat) : null;
  if (flat) {
    const furnished = flat.rooms.filter((r) => r.project).length;
    parts.push(`жилище: ${flat.rooms.length} помещения, ${furnished} обзаведени`);
  } else if (z.project) {
    parts.push('една стая');
  } else {
    parts.push('без проект');
  }

  if (z.ogled) parts.push(`оглед: ${ogledText(z.ogled)}`);

  return parts.join(' · ');
}
