/**
 * Кое покритие е на коя стена — и как стената се намира в обема.
 *
 * Изборът е на стаята: едно покритие за всички стени и по желание
 * друго за отделна стена. Така се прави акцентната стена — тапет зад
 * леглото, тухла зад дивана, плочки само зад мивката.
 *
 * Покритието не пипа мебелта. Не влиза в разкроя, в обкова и в заявката
 * за цеха, затова не вдига `RULES_VERSION`: проект с нова стена не е
 * пресметнат различно.
 */

import { DEFAULT_WALL_FINISH_ID, finishById, isKnownFinish } from '@/config/wall-finishes';
import { WALL_SIDES, type Room, type WallSide } from './furniture/room';
import type { Vec3 } from './scene3d';

export interface WallFinishChoice {
  /** Покритието на всички стени. */
  all: string;
  /** Стени с друго покритие от общото. */
  sides?: Partial<Record<WallSide, string>>;
}

export const DEFAULT_WALL_FINISH: WallFinishChoice = { all: DEFAULT_WALL_FINISH_ID };

/** Покритието на тази стена. Стая без избор е с подразбиращото се. */
export function finishIdFor(choice: WallFinishChoice | undefined, side: WallSide): string {
  const id = choice?.sides?.[side] ?? choice?.all;
  return finishById(id).id;
}

/**
 * Нов избор. `side` е стената, на която се слага; `'all'` слага на
 * всички и маха отделните — иначе „всички стени" не значи всички.
 */
export function chooseFinish(
  choice: WallFinishChoice | undefined,
  side: WallSide | 'all',
  id: string,
): WallFinishChoice {
  if (side === 'all') return { all: id };
  const all = choice?.all ?? DEFAULT_WALL_FINISH_ID;
  const sides = { ...choice?.sides };
  // Същото като общото не е отделна стена.
  if (id === all) delete sides[side];
  else sides[side] = id;
  return Object.keys(sides).length ? { all, sides } : { all };
}

/** Връща стената към общото покритие. */
export function resetSide(choice: WallFinishChoice | undefined, side: WallSide): WallFinishChoice {
  return chooseFinish(choice, side, choice?.all ?? DEFAULT_WALL_FINISH_ID);
}

/** Има ли стената свое покритие, различно от общото. */
export function hasOwnFinish(choice: WallFinishChoice | undefined, side: WallSide): boolean {
  return Boolean(choice?.sides?.[side]);
}

/** Подразбиращата се стена ли е — тогава няма какво да се пише в линка. */
export function isDefaultFinish(choice: WallFinishChoice | undefined): boolean {
  return (
    !choice ||
    (finishById(choice.all).id === DEFAULT_WALL_FINISH_ID &&
      !WALL_SIDES.some((s) => choice.sides?.[s] && choice.sides[s] !== DEFAULT_WALL_FINISH_ID))
  );
}

/* --- В линка ------------------------------------------------------------ */

/**
 * Записът в линка: общото и после четирите стени в реда на `WALL_SIDES`,
 * празен низ за стена без свое. Опашката от празни се реже.
 */
export type PackedFinish = string[];

export function packFinish(choice: WallFinishChoice | undefined): PackedFinish | undefined {
  if (isDefaultFinish(choice)) return undefined;
  const out = [choice!.all, ...WALL_SIDES.map((s) => choice!.sides?.[s] ?? '')];
  while (out.length > 1 && out[out.length - 1] === '') out.pop();
  return out;
}

/** Непознатите ключове падат — линк от по-нова версия не чупи стаята. */
export function unpackFinish(packed: unknown): WallFinishChoice | undefined {
  if (!Array.isArray(packed) || typeof packed[0] !== 'string') return undefined;
  const all = isKnownFinish(packed[0]) ? packed[0] : DEFAULT_WALL_FINISH_ID;
  const sides: Partial<Record<WallSide, string>> = {};
  WALL_SIDES.forEach((side, i) => {
    const id = packed[i + 1];
    if (typeof id === 'string' && isKnownFinish(id) && id !== all) sides[side] = id;
  });
  const choice: WallFinishChoice = Object.keys(sides).length ? { all, sides } : { all };
  return isDefaultFinish(choice) ? undefined : choice;
}

/* --- В обема ------------------------------------------------------------ */

/** Вътрешното лице на стена: коя е и как се развива по нея. */
export interface WallPlane {
  side: WallSide;
  /** По коя ос на света върви стената. */
  axis: 'x' | 'z';
  /** Мястото на равнината по другата ос. */
  at: number;
}

const EPS = 1;

/**
 * Вътрешното лице на коя стена е тази стена на обем — или null.
 *
 * Зидът е кутия с шест лица, а шарката е само на това, което гледа в
 * стаята. Отличава се по посоката и по мястото: лицето на горната
 * стена гледа към +Z и лежи на Z = 0. Чело на парче зид до отвор
 * гледа настрани и не е вътрешно лице на нищо.
 */
export function innerWallPlane(corners: Vec3[], normal: Vec3, room: Room): WallPlane | null {
  if (Math.abs(normal.y) > 0.01) return null;
  const xs = corners.map((c) => c.x);
  const zs = corners.map((c) => c.z);
  /*
   * Горният и долният зид са по-дълги от стаята с дебелината на
   * страничните — затова се иска застъпване със стаята, не да се побира
   * в нея. Челото на парче зид до отвора лежи в дебелината на зида и
   * не се застъпва с нищо.
   */
  const within = (vals: number[], max: number) =>
    Math.max(...vals) > EPS && Math.min(...vals) < max - EPS;
  const flat = (vals: number[], at: number) => vals.every((v) => Math.abs(v - at) < EPS);

  if (normal.z > 0.99 && flat(zs, 0) && within(xs, room.width)) return { side: 'top', axis: 'x', at: 0 };
  if (normal.z < -0.99 && flat(zs, room.depth) && within(xs, room.width))
    return { side: 'bottom', axis: 'x', at: room.depth };
  if (normal.x > 0.99 && flat(xs, 0) && within(zs, room.depth)) return { side: 'left', axis: 'z', at: 0 };
  if (normal.x < -0.99 && flat(xs, room.width) && within(zs, room.depth))
    return { side: 'right', axis: 'z', at: room.width };
  return null;
}

/** Точка от стената (`u` по нея, `v` нагоре) обратно в стаята. */
export function planePoint(plane: WallPlane, u: number, v: number): Vec3 {
  return plane.axis === 'x' ? { x: u, y: v, z: plane.at } : { x: plane.at, y: v, z: u };
}

/** Правоъгълникът на лицето в мерките по стената. */
export function planeArea(plane: WallPlane, corners: Vec3[]) {
  const us = corners.map((c) => (plane.axis === 'x' ? c.x : c.z));
  const vs = corners.map((c) => c.y);
  return { u0: Math.min(...us), u1: Math.max(...us), v0: Math.min(...vs), v1: Math.max(...vs) };
}

/* --- Повърхност с шарка: стена или под --------------------------------- */

/**
 * Каквото трябва на рисуването, за да положи шарка върху лице: правоъгълник
 * в мерките на шарката и как точка от него се връща в стаята.
 */
export interface Surface {
  /** За паметта на готовите шарки — коя повърхност е. */
  key: string;
  /** Различава стените една от друга, за да не са огледално еднакви. */
  seed: number;
  area: { u0: number; u1: number; v0: number; v1: number };
  at: (u: number, v: number) => Vec3;
}

export function wallSurface(plane: WallPlane, corners: Vec3[]): Surface {
  return {
    key: plane.side,
    seed: WALL_SIDES.indexOf(plane.side) * 101,
    area: planeArea(plane, corners),
    at: (u, v) => planePoint(plane, u, v),
  };
}

/** Горното лице на пода: `u` по ширината на стаята, `v` в дълбочина. */
export function isFloorTop(role: string, normal: Vec3): boolean {
  return role === 'floor' && normal.y > 0.99;
}

export function floorSurface(corners: Vec3[]): Surface {
  const xs = corners.map((c) => c.x);
  const zs = corners.map((c) => c.z);
  return {
    key: 'floor',
    seed: 7,
    area: { u0: Math.min(...xs), u1: Math.max(...xs), v0: Math.min(...zs), v1: Math.max(...zs) },
    at: (u, v) => ({ x: u, y: 0, z: v }),
  };
}
