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

/**
 * Как изглежда лицето на модула. Това е данни, не код: кухнята,
 * гардеробът и всекидневната се различават точно по него, а
 * разположението на панелите се смята на едно място.
 */
export type FacadeSpec =
  /** Една или две врати според ширината. */
  | { style: 'doors' }
  /** Чела едно над друго: с дадени височини или поравно. */
  | { style: 'drawers'; fronts?: readonly number[]; count?: number }
  /** Едно цяло лице — панел на уред, челна плоскост. */
  | { style: 'panel'; appliance?: boolean }
  /** Уред отгоре, бленда отдолу. */
  | { style: 'appliance'; fillerBelow: number }
  /** Врати една над друга с дадени височини, отгоре надолу. */
  | { style: 'split'; heights: readonly number[] }
  /** Без лице — отворена секция с видими рафтове. */
  | { style: 'open'; shelves: number };

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
  /** Какво се вижда отпред. Липсва при ниши и празни места. */
  facade?: FacadeSpec;
  /**
   * Чист въздух между шкафовете — ниша, която се мери и влиза в
   * заявката, но нищо не се произвежда за нея.
   *
   * Казва се изрично, а не се извежда от „няма корпус и няма чело":
   * нишата за пералня също няма нито едното, а тя е място за уред, не
   * въздух. Изведеното правило я броеше за празнина и плъзгането
   * почваше да сипе перални по стената.
   */
  gap?: boolean;
}

/** Един модул в конфигурацията на клиента. */
export interface SystemModuleInstance<Kind extends string = string> {
  id: string;
  kind: Kind;
  width: number;
  /** Страна на пантите при единична врата. */
  hingeSide?: HingeSide;
  /**
   * Колко рафта да има вътре. Липсва = колкото казва видът му.
   * Клиентът ги мести в обемния изглед и те влизат в разкроя.
   */
  shelves?: number;
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

export type OpeningKind = 'door' | 'window';

/**
 * Отвор в стената. Мебелта го заобикаля — но само редът, чиято
 * височина го пресича: шкаф над прозорец с висок парапет е възможен,
 * шкаф в самата врата — не.
 */
export interface WallOpening {
  id: string;
  kind: OpeningKind;
  /** Отстояние на левия ръб от началото на стената */
  x: number;
  width: number;
  /** Долен ръб над пода. Врата: 0. Прозорец: парапетът. */
  bottom: number;
  height: number;
}

/** Пресичат ли се два отсечени интервала по височина. */
function overlapsRow(opening: WallOpening, row: SystemRow): boolean {
  return opening.bottom < row.bottom + row.height && row.bottom < opening.bottom + opening.height;
}

/** Отворите, които пречат на този ред, като заети участъци. */
export function openingBlocks<K extends string, R extends string>(
  system: FurnitureSystem<K, R>,
  row: R,
  openings: WallOpening[] = [],
): Interval[] {
  return openings
    .filter((o) => overlapsRow(o, system.rows[row]))
    .map((o) => ({ x: o.x, width: o.width }));
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

/** Какво заема място в един ред, освен самите му модули. */
export function rowBlocks<K extends string, R extends string>(
  system: FurnitureSystem<K, R>,
  row: R,
  floorRow: SystemModuleInstance<K>[],
  openings: WallOpening[] = [],
): Interval[] {
  const blocks = openingBlocks(system, row, openings);

  // Модул с `fullHeight` (кухненската колона) заема цялата височина,
  // затова реже редовете над себе си, но не и своя собствен.
  if (row !== system.rowOrder[0]) {
    let x = 0;
    for (const m of floorRow) {
      if (system.modules[m.kind].fullHeight) blocks.push({ x, width: m.width });
      x += m.width;
    }
  }

  return blocks.sort((a, b) => a.x - b.x);
}

/** Участъците, които остават свободни след заетите. */
export function freeAround(blocks: Interval[], totalLength: number): Interval[] {
  const intervals: Interval[] = [];
  let cursor = 0;
  for (const b of [...blocks].sort((a, c) => a.x - c.x)) {
    if (b.x > cursor) intervals.push({ x: cursor, width: b.x - cursor });
    cursor = Math.max(cursor, b.x + b.width);
  }
  if (totalLength > cursor) intervals.push({ x: cursor, width: totalLength - cursor });
  return intervals;
}

/**
 * Свободните участъци в ред: около отворите в стената и около
 * модулите, които заемат цялата височина.
 */
export function freeIntervals<K extends string, R extends string>(
  system: FurnitureSystem<K, R>,
  floorRow: SystemModuleInstance<K>[],
  totalLength: number,
  openings: WallOpening[] = [],
  row: R = system.rowOrder[system.rowOrder.length - 1],
): Interval[] {
  return freeAround(rowBlocks(system, row, floorRow, openings), totalLength);
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
  openings: WallOpening[] = [],
): Record<R, PlacedModule<K, R>[]> {
  const floorRow = rows[system.rowOrder[0]] ?? [];
  const out = {} as Record<R, PlacedModule<K, R>[]>;

  for (const row of system.rowOrder) {
    const intervals = freeAround(rowBlocks(system, row, floorRow, openings), length);
    out[row] = placeRow(system, rows[row] ?? [], row, intervals, counters);
  }

  return out;
}

/** Колко място има всеки ред и колко е заето. */
export function wallStatus<K extends string, R extends string>(
  system: FurnitureSystem<K, R>,
  length: number,
  rows: Record<R, SystemModuleInstance<K>[]>,
  openings: WallOpening[] = [],
): Record<R, RowStatus> {
  const floorRow = rows[system.rowOrder[0]] ?? [];
  const out = {} as Record<R, RowStatus>;

  for (const row of system.rowOrder) {
    const used = (rows[row] ?? []).reduce((s, m) => s + m.width, 0);
    const available = freeAround(rowBlocks(system, row, floorRow, openings), length).reduce(
      (s, i) => s + i.width,
      0,
    );
    out[row] = rowStatus(used, available);
  }

  return out;
}

/**
 * Застила `space` с модули от каталога: първо колкото може по-плътно,
 * после с колкото може по-малко модула. Връща само ширините — кой вид
 * модул ги носи решава викащият.
 *
 * Лакомото „най-широкото първо" не върши работа: за 1000 мм то взима 900
 * и оставя 100 мм дупка, макар 600+400 да ляга точно. Затова се смятат
 * всички достижими суми наведнъж (разновидност на задачата за рестото) —
 * при седем ширини и стена под 12 метра това са няколко десетки хиляди
 * стъпки, тоест нищо.
 *
 * Използва се и от „запълни остатъка" в конфигуратора, и от
 * автоматичното подреждане, за да дават двете едно и също.
 */
export function fillWidths(space: number, widths: readonly number[]): number[] {
  const size = Math.floor(space);
  if (size <= 0) return [];

  const usable = [...new Set(widths)]
    .filter((w) => w > 0 && w <= size)
    .sort((a, b) => b - a);
  if (!usable.length) return [];

  // count[s] = най-малко модула, които дават точно s; -1 = недостижимо.
  const count = new Int32Array(size + 1).fill(-1);
  const pick = new Int32Array(size + 1);
  count[0] = 0;

  for (let s = 1; s <= size; s++) {
    for (const w of usable) {
      if (w > s) continue;
      const previous = count[s - w];
      if (previous < 0) continue;
      if (count[s] < 0 || previous + 1 < count[s]) {
        count[s] = previous + 1;
        pick[s] = w;
      }
    }
  }

  // Най-плътното покритие; при равен брой модули по-широките печелят,
  // защото `usable` се обхожда отгоре надолу.
  let best = 0;
  for (let s = size; s >= 0; s--) {
    if (count[s] >= 0) {
      best = s;
      break;
    }
  }

  const out: number[] = [];
  for (let s = best; s > 0; s -= pick[s]) out.push(pick[s]);
  return out.sort((a, b) => b - a);
}
