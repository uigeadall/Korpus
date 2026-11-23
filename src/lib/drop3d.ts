/**
 * Пускане на модул право в обема.
 *
 * В чертежа мястото се чете направо — той е плосък и милиметърът е
 * пиксел. В обема не е: картината е перспективна и една нейна точка
 * отговаря на цял лъч в стаята. Затова лъчът се пробожда в равнината
 * на зида, а не в пода — зидът е това, което човек вижда зад празната
 * стая, и върху него застава мебелта.
 *
 * Показалецът не слага модула където и да е. Редът е плътен: шкафовете
 * си допират страниците и не висят на средата на стената. Затова
 * показалецът избира само мястото в редицата, а къде точно ще легне
 * модулът се пресмята с истинското подреждане — и призракът се показва
 * там, а не под пръста. Иначе човек пуска на едно място, а шкафът
 * застава на друго.
 *
 * Тук няма React и няма SVG. Влиза точка от кадъра, излиза място в
 * реда — толкова, колкото може да се провери с тест.
 */

import {
  MODULES,
  type KitchenModule,
  type ModuleKind,
  type PlacedModule,
  type RoomKind,
  type RowId,
  type Wall,
  type WallOpening,
  defaultWidth,
  placeWall,
} from './cabinet-rules';
import { insertIndexAt } from './drawing';
import { type Room, type WallSide, alongFrom } from './furniture/room';
import { type Camera, planePointAt } from './scene3d';

/** В коя равнина лежи зидът на дадена стена и къде по оста ѝ стои. */
export function wallPlane(room: Room, side: WallSide): { axis: 'x' | 'z'; value: number } {
  switch (side) {
    case 'top':
      return { axis: 'z', value: 0 };
    case 'bottom':
      return { axis: 'z', value: room.depth };
    case 'left':
      return { axis: 'x', value: 0 };
    case 'right':
      return { axis: 'x', value: room.width };
  }
}

export interface DropTarget {
  row: RowId;
  /** На коя позиция в реда влиза. */
  index: number;
  /** Къде наистина ще легне — пресметнато с истинското подреждане. */
  left: number;
  width: number;
}

const GHOST_ID = '__prizrak__';

/**
 * Къде ще легне модулът, ако влезе на тази позиция в реда.
 *
 * Не се смята на ръка, а се пуска истинското подреждане с един
 * допълнителен модул. Така призракът и резултатът не могат да се
 * разминат: минават през един и същи код.
 */
export function ghostPlacement(
  wall: Wall,
  roomKind: RoomKind,
  openings: WallOpening[],
  kind: ModuleKind,
  row: RowId,
  index: number,
): PlacedModule | null {
  const probe: KitchenModule = {
    id: GHOST_ID,
    kind,
    width: defaultWidth(kind),
    hingeSide: 'right',
  };
  const rows = { base: [...wall.base], upper: [...wall.upper] };
  rows[row].splice(Math.max(0, Math.min(rows[row].length, index)), 0, probe);

  const placed = placeWall({ ...wall, ...rows }, {}, roomKind, openings);
  return placed[row].find((m) => m.id === GHOST_ID) ?? null;
}

export interface DropScene {
  room: Room;
  roomKind: RoomKind;
  side: WallSide;
  wall: Wall;
  openings: WallOpening[];
  /** Какво вече стои на двата реда, вече подредено. */
  placed: Readonly<Record<RowId, readonly PlacedModule[]>>;
}

/**
 * Къде ще влезе модулът, ако го пуснем на тази точка от картината.
 *
 * Ако лъчът мине покрай зида (камера почти в неговата равнина) или
 * подреждането откаже модула — място няма и нищо не се показва.
 */
export function dropTargetAt(
  scene: DropScene,
  kind: ModuleKind,
  screenX: number,
  screenY: number,
  cam: Camera,
): DropTarget | null {
  const plane = wallPlane(scene.room, scene.side);
  const hit = planePointAt(screenX, screenY, cam, plane.axis, plane.value);
  if (!hit) return null;

  const along = alongFrom(scene.room, scene.side, { x: hit.x, y: hit.z });
  const row = MODULES[kind].row;
  // Показалецът държи средата на модула, затова мястото се търси по
  // левия му ръб — както е и в чертежа.
  const index = insertIndexAt([...scene.placed[row]], along - defaultWidth(kind) / 2);

  const ghost = ghostPlacement(scene.wall, scene.roomKind, scene.openings, kind, row, index);
  if (!ghost) return null;

  return { row, index, left: ghost.x, width: ghost.width };
}
