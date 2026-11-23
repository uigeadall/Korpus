/**
 * Стената като лента.
 *
 * Модулите на един ред стоят опрени един до друг, като клипове на
 * пътечка: хващаш клип и го влачиш, хващаш ръба му и го опъваш,
 * маркираш няколко с рамка. Тук е сметката зад това — къде какво
 * стои и кое попада в маркираното. Рисуването е на компонента.
 *
 * Всичко е в милиметри, мерени от началото на реда.
 */

import { MODULES, type ModuleKind, type PlacedModule, nearestWidth } from './cabinet-rules';

/** Кой модул стои на това място по реда. */
export function clipAt(row: readonly PlacedModule[], x: number): PlacedModule | null {
  return row.find((m) => x >= m.x && x < m.x + m.width) ?? null;
}

/**
 * Модулите между два посочени, включително тях.
 *
 * Това прави Shift+щракване: първият остава, вторият казва докъде.
 * Редът на посочване няма значение — важи участъкът между тях.
 */
export function idsBetween(row: readonly PlacedModule[], a: string, b: string): string[] {
  const from = row.findIndex((m) => m.id === a);
  const to = row.findIndex((m) => m.id === b);
  if (from < 0 || to < 0) return [];
  return row.slice(Math.min(from, to), Math.max(from, to) + 1).map((m) => m.id);
}

/**
 * Модулите, които рамката засяга.
 *
 * Засяга ги, щом се застъпва с тях — дори само отчасти. Рамка, която
 * иска да хване всичко изцяло, е мъчение при тесни модули.
 */
export function clipsInRange(
  row: readonly PlacedModule[],
  from: number,
  to: number,
): string[] {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  return row.filter((m) => m.x < hi && lo < m.x + m.width).map((m) => m.id);
}

/**
 * Ширината след опъване на ръба.
 *
 * Клиповете не се режат на произволно място: всеки вид модул се прави
 * в определени ширини и влаченето отива на най-близката от тях.
 * Затова опъването подскача — така е вярно, а не защото не е гладко.
 */
export function trimWidth(kind: ModuleKind, width: number, deltaMm: number): number {
  return nearestWidth(kind, width + deltaMm);
}

/** Има ли изобщо какво да се опъва при този вид. */
export function canTrim(kind: ModuleKind): boolean {
  return MODULES[kind].widths.length > 1;
}

/** Докъде стига редът — за да се види дали излиза извън стената. */
export function rowEnd(row: readonly PlacedModule[]): number {
  return row.reduce((end, m) => Math.max(end, m.x + m.width), 0);
}
