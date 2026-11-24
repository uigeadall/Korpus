/**
 * Мебелта на готовите стаи — в макета на цялото жилище.
 *
 * Жилището не знае какво е шкаф: пази само записа на проекта (`project`).
 * Тук записът се отваря, правилата нареждат мебелта както в самата стая,
 * и обемите ѝ се преместват на мястото на стаята в жилището. Така
 * макетът показва същите шкафове, които са в проекта и в цеха — не
 * картинка, нарисувана отделно.
 */

import { type Kitchen, type KitchenModule, computeKitchen, isGapKind, kitchenRoom, wallSide } from './cabinet-rules';
import { fitsNoWorse, keepInside } from './fit';
import { clampRoom, sideLength } from './furniture/room';
import { clampDoor, clampWindow } from './openings';
import { type BoxRole, type Box, sceneFor } from './scene3d';
import { decodeProject, encodeProject } from './share';
import type { FlatRoom } from './flat';

type Size = { width: number; depth: number };

/** Какво от стаята влиза в макета — мебелта и обзавеждането, не зидове и под. */
const SHOWN: ReadonlySet<BoxRole> = new Set<BoxRole>([
  'carcass',
  'facade',
  'worktop',
  'plinth',
  'appliance',
  'handle',
  'wood',
  'soft',
]);

/** Разделителят между стаята и ключа на обема в нея. */
export const ROOM_KEY = '#';

/** Проектът на стаята, или null, ако няма или не се отваря. */
export function roomProject(room: FlatRoom): Kitchen | null {
  return room.project ? decodeProject(room.project) : null;
}

/**
 * Ред, долепен до края на стената: започва с ниша. Така левият ред на
 * ъглова кухня стига ъгъла — нишата запълва остатъка към другия край.
 * Мени ли се стената, мени се нишата, а шкафовете остават в ъгъла.
 */
function shiftLead(list: KitchenModule[], delta: number): KitchenModule[] {
  const [first, ...rest] = list;
  if (!first || !isGapKind(first.kind)) return list;
  const width = first.width + delta;
  return width > 0 ? [{ ...first, width }, ...rest] : rest;
}

/**
 * Проектът, пренесен в стая с други мерки.
 *
 * Стаята в жилището и стаята в проекта трябва да са една и съща. Иначе
 * мебелта се нарежда по едните мерки, а зидовете стоят по другите — и в
 * макета масата излиза на двора (24.11.2026: всекидневна 4,80 × 3,80,
 * сложена в начертана 3,60 × 2,00).
 *
 * Стена по цялата страна остава по цялата страна; по-къса си остава
 * колкото е, докато се побира. Вратата и прозорците се вкарват в новите
 * зидове, а масата, диванът и леглото се придърпват навътре — както и
 * при смяна на мерките в самия проект.
 *
 * Не проверява дали шкафовете се побират — за това е `fitKitchen`.
 */
export function refitKitchen(kitchen: Kitchen, size: Size): Kitchen {
  const before = kitchenRoom(kitchen);
  const room = { ...before, width: clampRoom(size.width), depth: clampRoom(size.depth) };
  if (room.width === before.width && room.depth === before.depth && kitchen.room) return kitchen;

  const walls = kitchen.walls.map((wall, i) => {
    const side = wallSide(wall, i);
    const now = sideLength(room, side);
    const full = wall.length >= sideLength(before, side);
    const length = full ? now : Math.min(wall.length, now);
    const delta = length - wall.length;
    if (delta === 0) return wall;
    // Само стена по цялата страна опира и в двата ъгъла.
    if (!full) return { ...wall, length };
    return { ...wall, length, base: shiftLead(wall.base, delta), upper: shiftLead(wall.upper, delta) };
  });

  return {
    ...kitchen,
    room,
    walls,
    ...(kitchen.door ? { door: clampDoor(room, kitchen.door) } : {}),
    ...(kitchen.windows ? { windows: kitchen.windows.map((w) => clampWindow(room, w)) } : {}),
    ...(kitchen.furnishings ? { furnishings: kitchen.furnishings.map((f) => keepInside(f, room)) } : {}),
  };
}

/** Проектът в стая с тези мерки, или null — шкафовете не се побират. */
export function fitKitchen(kitchen: Kitchen, size: Size): Kitchen | null {
  const next = refitKitchen(kitchen, size);
  return next === kitchen || fitsNoWorse(kitchen, next) ? next : null;
}

/**
 * Записът на проекта, пренесен в стая с тези мерки. null — мебелта не
 * се побира. Запис, който не се чете, се връща както е: не е наш да го
 * съдим.
 */
export function fitProject(project: string, size: Size): string | null {
  const kitchen = decodeProject(project);
  if (!kitchen) return project;
  const fitted = fitKitchen(kitchen, size);
  if (!fitted) return null;
  return fitted === kitchen ? project : encodeProject(fitted);
}

/** Мерките, за които е правен проектът, или null, ако записът не се чете. */
export function projectSize(project: string): Size | null {
  const kitchen = decodeProject(project);
  if (!kitchen) return null;
  const { width, depth } = kitchenRoom(kitchen);
  return { width, depth };
}

/**
 * Обемите на мебелта в стаята, в координатите на жилището. Ключът на
 * всеки започва с името на стаята — по него рисуването намира цветовете
 * ѝ.
 */
export function furnitureBoxes(room: FlatRoom, project: Kitchen | null = roomProject(room)): Box[] {
  if (!project) return [];
  /*
   * Мебелта се нарежда в стаята от жилището. Проект, правен за друга —
   * запис отпреди мерките да вървят заедно — се пренася в нея, за да не
   * излиза през зидовете ѝ.
   */
  const size = { width: room.width, depth: room.depth };
  const kitchen = refitKitchen(project, size);
  const placed = computeKitchen(kitchen).placed;
  return sceneFor(kitchen, size, placed, kitchen.materials.worktop, kitchen.materials.opening)
    .filter((b) => SHOWN.has(b.role) && !b.shape)
    .map((b) => ({
      ...b,
      x: b.x + room.x,
      z: b.z + room.y,
      ...(b.swing ? { swing: { ...b.swing, pivotX: b.swing.pivotX + room.x, pivotZ: b.swing.pivotZ + room.y } } : {}),
      key: `${room.id}${ROOM_KEY}${b.key ?? b.role}`,
      // Шкаф в макета не се отваря и не се хваща.
      moduleId: undefined,
    }));
}

/** Коя стая е на лицето — по ключа му. */
export function roomOfKey(key: string): string | null {
  const i = key.indexOf(ROOM_KEY);
  return i > 0 ? key.slice(0, i) : null;
}
