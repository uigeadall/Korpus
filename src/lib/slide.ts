/**
 * Шкаф, плъзнат по стената до точно място — по решетка.
 *
 * Редът си остава редица: правилата подреждат модулите един след друг
 * и така ги режат, номерират и пращат в цеха. Свободното място пред
 * преместения шкаф става невидима ниша — същото, което е „Свободна ниша"
 * от палитрата. Затова разкроят, цената и линкът не знаят нищо ново.
 *
 * Шкафът прилепва към решетката и към ръбовете на съседите си. Решетката
 * е по-ситна в къса стена и по-едра в дълга — около четирийсет клетки,
 * колкото окото различава. Заето ли е мястото, местенето се връща към
 * разместване, както беше досега (виж `drop3d`).
 */

import {
  type KitchenModule,
  type ModuleKind,
  type RoomKind,
  type RowId,
  type Wall,
  type WallOpening,
  placeWall,
  systemFor,
} from './cabinet-rules';
import { freeAround, rowBlocks } from './furniture/system';
import type { Room, WallSide } from './furniture/room';
import type { Vec3 } from './scene3d';

/** Празните места по системи — те пълнят разстоянието до шкафа. */
const GAP_KINDS: readonly ModuleKind[] = ['lgap', 'ugap', 'wgap', 'vgap', 'bgap', 'hgap'];

export function isGap(kind: ModuleKind): boolean {
  return GAP_KINDS.includes(kind);
}

/** С какво се пълни празното в този ред — или нищо, ако редът няма ниша. */
export function gapKindFor(roomKind: RoomKind, row: RowId): ModuleKind | null {
  const system = systemFor(roomKind);
  return GAP_KINDS.find((k) => system.modules[k] && system.modules[k].row === row) ?? null;
}

/**
 * Стъпката на решетката според дължината на стената: около четирийсет
 * клетки. Къса стена — по 50 мм, обичайна кухня — по 100, дълга — по 150.
 */
export function gridStep(wallLength: number): number {
  for (const step of [50, 100, 150, 200]) if (wallLength / step <= 48) return step;
  return 250;
}

/** Точка от стената в стаята: `along` по стената, `out` навътре от нея. */
export function wallPoint(room: Room, side: WallSide, along: number, out: number, y: number): Vec3 {
  switch (side) {
    case 'top':
      return { x: along, y, z: out };
    case 'bottom':
      return { x: room.width - along, y, z: room.depth - out };
    case 'left':
      return { x: out, y, z: room.depth - along };
    case 'right':
      return { x: room.width - out, y, z: along };
  }
}

let counter = 0;
const gapId = (kind: ModuleKind) => `${kind}-plazg-${Date.now().toString(36)}-${++counter}`;

export interface Slide {
  row: RowId;
  /** Където шкафът ще легне — левият му ръб от началото на стената. */
  left: number;
  width: number;
  /** Новият ред, с нишите пред шкафовете. */
  modules: KitchenModule[];
}

/**
 * Шкафът плъзнат така, че левият му ръб да е възможно най-близо до
 * `wanted` — по решетката или до ръба на съсед. Връща null, ако наблизо
 * няма свободно място: тогава местенето е разместване.
 */
export function slideRow(
  wall: Wall,
  roomKind: RoomKind,
  openings: WallOpening[],
  moduleId: string,
  wanted: number,
): Slide | null {
  const row: RowId | null = wall.base.some((m) => m.id === moduleId)
    ? 'base'
    : wall.upper.some((m) => m.id === moduleId)
      ? 'upper'
      : null;
  if (!row) return null;
  const gap = gapKindFor(roomKind, row);
  if (!gap) return null;

  const system = systemFor(roomKind);
  const placed = placeWall(wall, {}, roomKind, openings)[row];
  const self = placed.find((m) => m.id === moduleId);
  if (!self) return null;
  const others = placed.filter((m) => m.id !== moduleId && !isGap(m.kind));
  const intervals = freeAround(rowBlocks(system, row, wall.base, openings), wall.length);
  const w = self.width;
  const step = gridStep(wall.length);

  const fits = (x: number) =>
    intervals.some((i) => x >= i.x - 0.5 && x + w <= i.x + i.width + 0.5) &&
    others.every((o) => x + w <= o.x + 0.5 || x >= o.x + o.width - 0.5);

  // Решетката и ръбовете — до ръб се прилепва по-охотно, отколкото до черта.
  const edges = [
    0,
    wall.length - w,
    ...others.flatMap((o) => [o.x + o.width, o.x - w]),
    ...intervals.flatMap((i) => [i.x, i.x + i.width - w]),
  ];
  const grid: number[] = [];
  for (let x = 0; x <= wall.length - w + 0.5; x += step) grid.push(x);
  const reach = Math.max(step * 3, w * 0.6);
  // Показалец отвъд края държи шкафа на края — не го пуска извън стената.
  wanted = Math.max(0, Math.min(wall.length - w, wanted));
  let best: { x: number; score: number } | null = null;
  for (const [x, pull] of [...edges.map((x) => [x, step * 0.45]), ...grid.map((x) => [x, 0])]) {
    if (!fits(x)) continue;
    const d = Math.abs(x - wanted);
    if (d > reach) continue;
    const score = d - pull;
    if (!best || score < best.score) best = { x, score };
  }
  if (!best) return null;
  const left = Math.round(best.x);

  // Редът наново: ниша от предишния ръб до всеки шкаф. Шкаф в следващ
  // свободен участък иска остатъкът на този да е запълнен — иначе
  // подреждането би го сложило още тук.
  const solids = [...others.map((o) => ({ m: wall[row].find((x) => x.id === o.id)!, x: o.x })), { m: wall[row].find((x) => x.id === moduleId)!, x: left }]
    .sort((a, b) => a.x - b.x);
  const modules: KitchenModule[] = [];
  let k = 0;
  for (const [n, interval] of intervals.entries()) {
    let cursor = interval.x;
    while (k < solids.length && solids[k].x < interval.x + interval.width - 0.5) {
      const s = solids[k];
      if (s.x > cursor + 0.5) modules.push({ id: gapId(gap), kind: gap, width: s.x - cursor, hingeSide: 'right' });
      modules.push(s.m);
      cursor = s.x + s.m.width;
      k += 1;
    }
    const later = k < solids.length && n < intervals.length - 1;
    const rest = interval.x + interval.width - cursor;
    if (later && rest > 0.5) modules.push({ id: gapId(gap), kind: gap, width: rest, hingeSide: 'right' });
  }
  if (k < solids.length) return null;

  // Проверка с истинското подреждане: всеки шкаф е там, където трябва.
  const check = placeWall({ ...wall, [row]: modules }, {}, roomKind, openings)[row];
  for (const s of solids) {
    const at = check.find((m) => m.id === s.m.id);
    if (!at || Math.abs(at.x - s.x) > 0.5) return null;
  }
  return { row, left, width: w, modules };
}
