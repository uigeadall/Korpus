/**
 * Мебелта на готовите стаи — в макета на цялото жилище.
 *
 * Жилището не знае какво е шкаф: пази само записа на проекта (`project`).
 * Тук записът се отваря, правилата нареждат мебелта както в самата стая,
 * и обемите ѝ се преместват на мястото на стаята в жилището. Така
 * макетът показва същите шкафове, които са в проекта и в цеха — не
 * картинка, нарисувана отделно.
 */

import { type Kitchen, computeKitchen } from './cabinet-rules';
import { type BoxRole, type Box, sceneFor } from './scene3d';
import { decodeProject } from './share';
import type { FlatRoom } from './flat';

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
 * Обемите на мебелта в стаята, в координатите на жилището. Ключът на
 * всеки започва с името на стаята — по него рисуването намира цветовете
 * ѝ.
 */
export function furnitureBoxes(room: FlatRoom, kitchen: Kitchen | null = roomProject(room)): Box[] {
  if (!kitchen) return [];
  // Мебелта се нарежда в стаята от жилището: ако проектът е правен за
  // по-голяма, не бива да излиза през зидовете ѝ.
  const size = { width: room.width, depth: room.depth };
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
