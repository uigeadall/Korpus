/**
 * Къде отива едно запитване.
 *
 * Гнездо, не хранилище. Днес отзад стои памет, защото база още няма —
 * тя иска акаунти на фирмата и решение къде се пазят лични данни
 * (`docs/PLAN.md`, 0.3 и Ж5). Утре на същото място застава Supabase и
 * нищо друго не се променя.
 *
 * Паметта не преживява рестарт и на сървър без състояние се губи почти
 * веднага. Затова хранилището казва за себе си `durable`, маршрутката
 * го връща, а формата има право да каже на човека истината — вместо да
 * му покаже „изпратено" за нещо, което никъде не е стигнало. Тихото
 * губене е най-скъпият вид грешка: разбира се месеци по-късно, по
 * клиенти, които никога не са се обадили повторно.
 */

import { type Zapitvane, summaryOf } from './zapitvane';

export interface Saved {
  id: string;
  /** Кога е прието, по часовника на сървъра. */
  at: string;
}

export interface ZapitvaneStore {
  /** Име за дневника. Лични данни в дневника не влизат. */
  readonly name: string;
  /** Преживява ли записът рестарт. Паметта — не. */
  readonly durable: boolean;
  save(z: Zapitvane): Promise<Saved>;
  /** Само за проверките и за бъдещия админ. */
  recent(limit?: number): Promise<(Saved & { summary: string })[]>;
}

/** Неповторим и подреден по време, без външна библиотека. */
export function newId(now = Date.now(), rnd = Math.random): string {
  return `${now.toString(36)}-${Math.floor(rnd() * 0xffffff)
    .toString(36)
    .padStart(4, '0')}`;
}

/** Колкото да не расте без край, ако някой почне да пълни. */
const MAX_KEPT = 200;

export function memoryStore(): ZapitvaneStore {
  const kept: (Saved & { summary: string })[] = [];

  return {
    name: 'памет',
    durable: false,
    async save(z) {
      const saved: Saved = { id: newId(), at: new Date().toISOString() };
      kept.unshift({ ...saved, summary: summaryOf(z) });
      kept.length = Math.min(kept.length, MAX_KEPT);
      return saved;
    },
    async recent(limit = 20) {
      return kept.slice(0, limit);
    },
  };
}

/*
 * Едно хранилище за целия процес. Маршрутката се вика много пъти и
 * всяко викане не бива да започва от празно.
 */
let current: ZapitvaneStore | null = null;

export function zapitvaneStore(): ZapitvaneStore {
  current ??= memoryStore();
  return current;
}

/** За проверките: сменя хранилището и връща предишното. */
export function setZapitvaneStore(store: ZapitvaneStore | null): ZapitvaneStore | null {
  const was = current;
  current = store;
  return was;
}
