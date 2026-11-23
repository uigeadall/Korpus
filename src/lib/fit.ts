/**
 * Мебелта се побира в стаята — нищо не минава през стената.
 *
 * Досега редът можеше да се препълни: правилата го отбелязваха като
 * „надвишава", а в обема шкафовете излизаха през страничния зид и
 * редът растеше колкото се цъка. Тук е едно правило за всички действия:
 * промяна, която препълва ред повече, отколкото е бил, не минава.
 *
 * „Повече, отколкото е бил" е нарочно. Проект, донесен препълнен — стар
 * линк, отпреди правилото — се отваря както е и може да се оправя:
 * махане и стесняване минават, добавяне — не.
 *
 * Готовите изделия — маса, диван, легло — се държат вътре в стаята
 * целите, не само с центъра си, и при завъртане.
 */

import {
  type Kitchen,
  type ModuleKind,
  type RowId,
  MODULES,
  defaultWidth,
  kitchenWallOpenings,
  wallSide,
  wallStatus,
} from './cabinet-rules';
import type { Room } from './furniture/room';
import { type Furnishing, halfExtent } from './furnishings';

/** Колко мм е препълнен всеки ред на всяка стена, по името на стената. */
export function overflowOf(kitchen: Kitchen): Map<string, { base: number; upper: number }> {
  const out = new Map<string, { base: number; upper: number }>();
  kitchen.walls.forEach((wall, i) => {
    const openings = kitchenWallOpenings(kitchen, wallSide(wall, i));
    const s = wallStatus(wall, kitchen.roomKind, openings);
    out.set(wall.id ?? `#${i}`, {
      base: s.base.state === 'over' ? s.base.diff : 0,
      upper: s.upper.state === 'over' ? s.upper.diff : 0,
    });
  });
  return out;
}

/** Не е препълнен нито един ред повече, отколкото беше преди. */
export function fitsNoWorse(prev: Kitchen, next: Kitchen): boolean {
  const before = overflowOf(prev);
  for (const [id, after] of overflowOf(next)) {
    const was = before.get(id) ?? { base: 0, upper: 0 };
    if (after.base > was.base + 0.5 || after.upper > was.upper + 0.5) return false;
  }
  return true;
}

/**
 * Има ли място за още един такъв модул на тази стена — за призрака при
 * влачене, преди човек да пусне.
 */
export function roomFor(kitchen: Kitchen, wallIndex: number, kind: ModuleKind): boolean {
  const wall = kitchen.walls[wallIndex];
  if (!wall) return false;
  const row: RowId = MODULES[kind].row;
  const extra = { id: '__room-for__', kind, width: defaultWidth(kind), hingeSide: 'right' as const };
  const grown = {
    ...wall,
    [row]: [...wall[row], extra],
  };
  const walls = kitchen.walls.map((w, i) => (i === wallIndex ? grown : w));
  return fitsNoWorse(kitchen, { ...kitchen, walls });
}

/** Готовото изделие, придърпано изцяло вътре в стаята. */
export function keepInside(f: Furnishing, room: Room): Furnishing {
  const half = halfExtent(f.kind, f.rotation);
  const clamp = (v: number, h: number, limit: number) =>
    Math.max(Math.min(h, limit / 2), Math.min(limit - h, v));
  const x = clamp(f.x, half.x, room.width);
  const z = clamp(f.z, half.z, room.depth);
  return x === f.x && z === f.z ? f : { ...f, x, z };
}

/** Завъртане на четвърт оборот, без да излезе през стената. */
export function rotateInside(f: Furnishing, room: Room): Furnishing {
  return keepInside({ ...f, rotation: (f.rotation + Math.PI / 2) % (Math.PI * 2) }, room);
}
