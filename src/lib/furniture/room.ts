/**
 * Стаята и погледът отгоре.
 *
 * Правоъгълна стая с вътрешни размери. Всяка стена е страна на
 * правоъгълника; по нея се нарежда участък с дължина ≤ страната.
 * Този файл превръща „модул №3 на дясната стена" в правоъгълник в
 * координатите на стаята — оттам го рисува планът.
 *
 * Координати: начало горе вляво, x надясно, y надолу — както се гледа
 * план. Обхождането на стените е по часовника и започва от горната,
 * затова локалното x на всяка стена съвпада с това, което виждаш,
 * когато застанеш в стаята с лице към нея. Същото x ползва и
 * фронталният чертеж.
 *
 * Всички размери са в милиметри.
 */

import type { FurnitureSystem, PlacedModule, WallOpening } from './system';
import { geometryOf } from './system';

export type WallSide = 'top' | 'right' | 'bottom' | 'left';

/** По часовника, както се обхожда планът. */
export const WALL_SIDES: readonly WallSide[] = ['top', 'right', 'bottom', 'left'];

export const WALL_SIDE_LABEL: Record<WallSide, string> = {
  top: 'Горна',
  right: 'Дясна',
  bottom: 'Долна',
  left: 'Лява',
};

/** Вътрешни размери на правоъгълна стая. */
export interface Room {
  /** По хоризонталата на плана — дължината на горната и долната стена. */
  width: number;
  /** По вертикалата — дължината на лявата и дясната. */
  depth: number;
  /**
   * От пода до тавана. Липсва в стаите отпреди нея — тогава е
   * обичайните 2,60 м (`ROOM.HEIGHT`).
   */
  height?: number;
}

export const ROOM = {
  MIN: 1200,
  MAX: 12000,
  STEP: 10,
  /** Обичайната височина до тавана и докъде може да се мени. */
  HEIGHT: 2600,
  HEIGHT_MIN: 2200,
  HEIGHT_MAX: 3600,
} as const;

/** Височината до тавана — записаната или обичайната. */
export function ceilingOf(room: Pick<Room, 'height'> | undefined): number {
  return room?.height ?? ROOM.HEIGHT;
}

/** Височина до тавана, вкарана в допустимото и закръглена на стъпката. */
export function clampCeiling(value: number): number {
  const stepped = Math.round(value / ROOM.STEP) * ROOM.STEP;
  return Math.min(ROOM.HEIGHT_MAX, Math.max(ROOM.HEIGHT_MIN, stepped));
}

export function clampRoom(value: number): number {
  const stepped = Math.round(value / ROOM.STEP) * ROOM.STEP;
  return Math.min(ROOM.MAX, Math.max(ROOM.MIN, stepped));
}

/** Колко дълга е страната, по която върви стената. */
export function sideLength(room: Room, side: WallSide): number {
  return side === 'top' || side === 'bottom' ? room.width : room.depth;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Отсечката на стената в координати на стаята. `length` е участъкът,
 * по който се нарежда — може да е по-къс от страната и тогава започва
 * от началния ъгъл на стената.
 */
export function wallRun(room: Room, side: WallSide, length: number): Segment {
  const l = Math.min(length, sideLength(room, side));
  switch (side) {
    case 'top':
      return { x1: 0, y1: 0, x2: l, y2: 0 };
    case 'right':
      return { x1: room.width, y1: 0, x2: room.width, y2: l };
    case 'bottom':
      return { x1: room.width, y1: room.depth, x2: room.width - l, y2: room.depth };
    case 'left':
      return { x1: 0, y1: room.depth, x2: 0, y2: room.depth - l };
  }
}

/**
 * Правоъгълникът на модул, който стои на `x` милиметра от началото на
 * стената, е широк `width` и дълбок `depth`.
 */
export function footprint(
  room: Room,
  side: WallSide,
  x: number,
  width: number,
  depth: number,
): Rect {
  switch (side) {
    case 'top':
      return { x, y: 0, width, height: depth };
    case 'right':
      return { x: room.width - depth, y: x, width: depth, height: width };
    case 'bottom':
      return { x: room.width - x - width, y: room.depth - depth, width, height: depth };
    case 'left':
      return { x: 0, y: room.depth - x - width, width: depth, height: width };
  }
}

/** Накъде гледа лицето на мебелта по тази стена, в координати на плана. */
export function facingOf(side: WallSide): { dx: number; dy: number } {
  switch (side) {
    case 'top':
      return { dx: 0, dy: 1 };
    case 'right':
      return { dx: -1, dy: 0 };
    case 'bottom':
      return { dx: 0, dy: -1 };
    case 'left':
      return { dx: 1, dy: 0 };
  }
}

export interface PlanModule<Kind extends string = string, Row extends string = string> {
  module: PlacedModule<Kind, Row>;
  rect: Rect;
}

export interface PlanOpening {
  opening: WallOpening;
  /** Отсечката на отвора по стената, в координати на стаята. */
  segment: Segment;
}

export interface PlanWall<Kind extends string = string, Row extends string = string> {
  side: WallSide;
  length: number;
  run: Segment;
  /** Участъкът излиза извън страната на стаята. */
  tooLong: boolean;
  /** По ред: най-отдолу първо, както е `rowOrder` на системата. */
  modules: Record<Row, PlanModule<Kind, Row>[]>;
  openings: PlanOpening[];
}

export interface PlanWallInput<Kind extends string = string, Row extends string = string> {
  side: WallSide;
  length: number;
  placed: Record<Row, PlacedModule<Kind, Row>[]>;
  openings?: WallOpening[];
}

/** Точка на `x` милиметра от началото на стената. */
export function pointAlong(room: Room, side: WallSide, x: number): { x: number; y: number } {
  switch (side) {
    case 'top':
      return { x, y: 0 };
    case 'right':
      return { x: room.width, y: x };
    case 'bottom':
      return { x: room.width - x, y: room.depth };
    case 'left':
      return { x: 0, y: room.depth - x };
  }
}

/**
 * Обратното на `pointAlong`: на колко милиметра от началото на стената
 * пада дадена точка от пода.
 *
 * Трябва, за да може модул, пуснат с показалеца в обема, да намери
 * мястото си по стената. Точката не се проверява дали е на стената —
 * взема се само движението по нея, защото показалецът никога не пада
 * точно върху зида.
 */
export function alongFrom(room: Room, side: WallSide, p: { x: number; y: number }): number {
  switch (side) {
    case 'top':
      return p.x;
    case 'right':
      return p.y;
    case 'bottom':
      return room.width - p.x;
    case 'left':
      return room.depth - p.y;
  }
}

/** Планът на цялата стая: стените и какво стои по тях. */
export function planGeometry<K extends string, R extends string>(
  system: FurnitureSystem<K, R>,
  room: Room,
  walls: PlanWallInput<K, R>[],
): PlanWall<K, R>[] {
  return walls.map((wall) => {
    const modules = {} as Record<R, PlanModule<K, R>[]>;
    for (const row of system.rowOrder) {
      modules[row] = (wall.placed[row] ?? []).map((m) => ({
        module: m,
        rect: footprint(room, wall.side, m.x, m.width, geometryOf(system, m.kind).depth),
      }));
    }
    return {
      side: wall.side,
      length: wall.length,
      run: wallRun(room, wall.side, wall.length),
      tooLong: wall.length > sideLength(room, wall.side),
      modules,
      openings: (wall.openings ?? []).map((o) => {
        const from = pointAlong(room, wall.side, o.x);
        const to = pointAlong(room, wall.side, o.x + o.width);
        return { opening: o, segment: { x1: from.x, y1: from.y, x2: to.x, y2: to.y } };
      }),
    };
  });
}

/** Свободните страни, по които още няма стена. */
export function freeSides(used: WallSide[]): WallSide[] {
  return WALL_SIDES.filter((s) => !used.includes(s));
}

function overlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
  );
}

/**
 * Модули от две съседни стени, които се застъпват в ъгъла.
 *
 * Докато няма ъглови модули (план 7.7), това не се решава само —
 * само се казва, за да не отиде в цеха кухня, която не се събира.
 */
export function cornerClashes<K extends string, R extends string>(
  plan: PlanWall<K, R>[],
): { a: PlacedModule<K, R>; b: PlacedModule<K, R> }[] {
  const flat = plan.flatMap((wall) =>
    Object.values(wall.modules).flatMap((list) => (list as PlanModule<K, R>[]).map((m) => ({ ...m, side: wall.side }))),
  );

  const clashes: { a: PlacedModule<K, R>; b: PlacedModule<K, R> }[] = [];
  for (let i = 0; i < flat.length; i++) {
    for (let j = i + 1; j < flat.length; j++) {
      // Модули по една и съща стена се нареждат един до друг, не се бият.
      if (flat[i].side === flat[j].side) continue;
      if (overlap(flat[i].rect, flat[j].rect)) {
        clashes.push({ a: flat[i].module, b: flat[j].module });
      }
    }
  }
  return clashes;
}
