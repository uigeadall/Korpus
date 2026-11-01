/**
 * Понятието „система“ — какво е една корпусна система изобщо.
 *
 * Кухнята е първата система. Гардеробът, ТВ композицията и антрето
 * идват по-късно (план 7.2–7.4) и не бива да преписват наново
 * нареждането, номерирането и сметките.
 *
 * Една система казва:
 *   - какви **редове** има и къде стоят по височина (долен, горен);
 *   - какви **модули** се предлагат, в кой ред, с какви ширини;
 *   - в какво се превръща модул, ако се премести в друг ред;
 *   - в какви граници е стената.
 *
 * Какво НЕ казва: как се реже детайл и как се смята кант — това е в
 * `carcass.ts` и `parts.ts`. Системата свързва двете.
 *
 * Всички размери са в милиметри.
 */

import type { HingeSide } from './carcass';

/** Ред от модули: къде стъпва и колко е висок и дълбок. */
export interface SystemRow {
  label: string;
  /** Долен ръб над пода */
  bottom: number;
  height: number;
  depth: number;
}

export interface SystemModule<Kind extends string = string, Row extends string = string> {
  kind: Kind;
  row: Row;
  label: string;
  /** Префикс при номерирането. null = не се номерира (ниши и празни места). */
  code: string | null;
  widths: readonly number[];
  /** Има ли корпус (плоскостни детайли). */
  hasCarcass: boolean;
  /** Заема цялата височина и къса редовете над себе си. */
  fullHeight?: boolean;
  /** Своя вертикална геометрия, когато модулът не следва реда си. */
  geometry?: { y: number; height: number; depth: number };
}

/** Един модул в конфигурацията на клиента. */
export interface SystemModuleInstance<Kind extends string = string> {
  id: string;
  kind: Kind;
  width: number;
  /** Страна на пантите при единична врата. */
  hingeSide?: HingeSide;
}

export interface FurnitureSystem<Kind extends string = string, Row extends string = string> {
  id: string;
  label: string;
  /** Отдолу нагоре. Първият ред стъпва на пода и носи блокиращите модули. */
  rowOrder: readonly Row[];
  rows: Record<Row, SystemRow>;
  modules: Record<Kind, SystemModule<Kind, Row>>;
  /** В какво се превръща модул, преместен в друг ред. Липсващите не се местят. */
  counterpart: Partial<Record<Kind, Kind>>;
  /** Допустима дължина на стената и стъпка. */
  wall: { min: number; max: number; step: number };
}

export interface PlacedModule<Kind extends string = string, Row extends string = string>
  extends SystemModuleInstance<Kind> {
  /** Код на шкафа (Д1, К1, Г1) или null при ниша/празно */
  code: string | null;
  /** Отстояние на левия ръб от левия край на стената */
  x: number;
  row: Row;
  spec: SystemModule<Kind, Row>;
}

export interface RowStatus {
  used: number;
  available: number;
  /** 'exact' | 'left' (остават) | 'over' (надвишава) */
  state: 'exact' | 'left' | 'over';
  diff: number;
}

export interface Interval {
  x: number;
  width: number;
}

/** Най-близката допустима ширина за даден модул. */
export function nearestWidth<K extends string, R extends string>(
  system: FurnitureSystem<K, R>,
  kind: K,
  width: number,
): number {
  const widths = system.modules[kind].widths;
  return widths.reduce((best, w) => (Math.abs(w - width) < Math.abs(best - width) ? w : best));
}

/** Модулът, преместен в другия ред, или null, ако не може. */
export function moduleCounterpart<K extends string, R extends string, M extends SystemModuleInstance<K>>(
  system: FurnitureSystem<K, R>,
  m: M,
): M | null {
  const kind = system.counterpart[m.kind];
  if (!kind) return null;
  return { ...m, kind, width: nearestWidth(system, kind, m.width) };
}

/** Вертикалната геометрия на модул — за чертежа. */
export function geometryOf<K extends string, R extends string>(
  system: FurnitureSystem<K, R>,
  kind: K,
): { y: number; height: number; depth: number } {
  const spec = system.modules[kind];
  if (spec.geometry) return spec.geometry;
  const row = system.rows[spec.row];
  return { y: row.bottom, height: row.height, depth: row.depth };
}

/** Дължина на стената в допустимия диапазон, закръглена на стъпката. */
export function clampLength<K extends string, R extends string>(
  system: FurnitureSystem<K, R>,
  value: number,
): number {
  const { min, max, step } = system.wall;
  const stepped = Math.round(value / step) * step;
  return Math.min(max, Math.max(min, stepped));
}

export function rowStatus(used: number, available: number): RowStatus {
  const diff = Math.round((available - used) * 2) / 2;
  if (diff === 0) return { used, available, state: 'exact', diff: 0 };
  if (diff > 0) return { used, available, state: 'left', diff };
  return { used, available, state: 'over', diff: -diff };
}

/**
 * Свободните участъци в ред над блокиращите модули. Модул с
 * `fullHeight` (кухненската колона) заема цялата височина, затова
 * горните редове се нареждат само в празнините около него.
 */
export function freeIntervals<K extends string, R extends string>(
  system: FurnitureSystem<K, R>,
  floorRow: SystemModuleInstance<K>[],
  totalLength: number,
): Interval[] {
  const blocks: Interval[] = [];
  let x = 0;
  for (const m of floorRow) {
    if (system.modules[m.kind].fullHeight) blocks.push({ x, width: m.width });
    x += m.width;
  }

  const intervals: Interval[] = [];
  let cursor = 0;
  for (const b of blocks) {
    if (b.x > cursor) intervals.push({ x: cursor, width: b.x - cursor });
    cursor = b.x + b.width;
  }
  if (totalLength > cursor) intervals.push({ x: cursor, width: totalLength - cursor });
  return intervals;
}

/**
 * Нарежда един ред в дадените участъци и го номерира. Броячите са
 * по код на префикса (Д, К, Г), за да текат през стените.
 */
export function placeRow<K extends string, R extends string>(
  system: FurnitureSystem<K, R>,
  modules: SystemModuleInstance<K>[],
  row: R,
  intervals: Interval[],
  counters: Record<string, number>,
): PlacedModule<K, R>[] {
  const placed: PlacedModule<K, R>[] = [];
  let i = 0;
  let x = intervals[0]?.x ?? 0;
  let remaining = intervals[0]?.width ?? 0;

  for (const m of modules) {
    const spec = system.modules[m.kind];
    if (remaining < m.width && i + 1 < intervals.length) {
      i += 1;
      x = intervals[i].x;
      remaining = intervals[i].width;
    }
    const code = spec.code ? `${spec.code}${(counters[spec.code] = (counters[spec.code] ?? 0) + 1)}` : null;
    placed.push({ ...m, code, x, row, spec });
    x += m.width;
    remaining -= m.width;
  }

  return placed;
}

/**
 * Нарежда цялата стена ред по ред, отдолу нагоре. Първият ред ползва
 * цялата дължина; над него се нарежда само в свободните участъци.
 */
export function placeWall<K extends string, R extends string>(
  system: FurnitureSystem<K, R>,
  length: number,
  rows: Record<R, SystemModuleInstance<K>[]>,
  counters: Record<string, number> = {},
): Record<R, PlacedModule<K, R>[]> {
  const floorRowId = system.rowOrder[0];
  const floorRow = rows[floorRowId] ?? [];
  const out = {} as Record<R, PlacedModule<K, R>[]>;

  for (const row of system.rowOrder) {
    const intervals =
      row === floorRowId ? [{ x: 0, width: length }] : freeIntervals(system, floorRow, length);
    out[row] = placeRow(system, rows[row] ?? [], row, intervals, counters);
  }

  return out;
}

/** Колко място има всеки ред и колко е заето. */
export function wallStatus<K extends string, R extends string>(
  system: FurnitureSystem<K, R>,
  length: number,
  rows: Record<R, SystemModuleInstance<K>[]>,
): Record<R, RowStatus> {
  const floorRowId = system.rowOrder[0];
  const floorRow = rows[floorRowId] ?? [];
  const out = {} as Record<R, RowStatus>;

  for (const row of system.rowOrder) {
    const used = (rows[row] ?? []).reduce((s, m) => s + m.width, 0);
    const available =
      row === floorRowId
        ? length
        : freeIntervals(system, floorRow, length).reduce((s, i) => s + i.width, 0);
    out[row] = rowStatus(used, available);
  }

  return out;
}
