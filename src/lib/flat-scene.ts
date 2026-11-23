/**
 * Жилището в обем — макет, а не стая.
 *
 * Разликата от обемния изглед на една стая е в целта. Там се гледа
 * мебел и зидовете са до тавана; тук се гледа цялото жилище наведнъж
 * и зидове до тавана биха закрили всичко. Затова са ниски — както е
 * на архитектурен макет: виждаш всички стаи отгоре, с вратите между
 * тях.
 *
 * Координати: планът е `x` надясно и `y` надолу; в обема `y` на плана
 * става `z`. Всичко е в милиметри.
 */

import type { Box } from './scene3d';
import { wallWithHoles, type WallHole } from './scene3d';
import {
  FLAT,
  type Flat,
  bottom,
  boundsOf,
  doorwaysOf,
  isDone,
  right,
} from './flat';

/** Докъде стигат зидовете на макета. Над това не се вижда нищо. */
export const FLAT_WALL_H = 1000;

/** Дебелина на зида в макета. Стаите го делят по половина. */
const W = FLAT.WALL;

type PlainBox = Omit<Box, 'role' | 'facing'>;

/**
 * Зидовете се събират по линии, а не по стаи.
 *
 * Две съседни стаи зидат една и съща стена, а стая до две други зида
 * парче от дълъг зид. Строят ли се стая по стая, същият зид излиза по
 * два пъти — застъпени плоскости, които трептят в картината. Затова
 * първо се събират всички отсечки по една линия, сливат се, и чак
 * тогава стават обеми.
 */
interface WallLine {
  /** По коя ос върви зидът. */
  along: 'x' | 'z';
  /** Къде стои напречно: `z` за зид по `x`, `x` за зид по `z`. */
  at: number;
  spans: [number, number][];
}

function collectLines(flat: Flat): WallLine[] {
  const lines = new Map<string, WallLine>();

  const add = (along: 'x' | 'z', at: number, from: number, to: number) => {
    const key = `${along}@${Math.round(at)}`;
    const line = lines.get(key) ?? { along, at, spans: [] };
    line.spans.push([from, to]);
    lines.set(key, line);
  };

  for (const room of flat.rooms) {
    // Зидовете са центрирани по ръбовете и се застъпват в ъглите.
    add('x', room.y, room.x - W / 2, right(room) + W / 2);
    add('x', bottom(room), room.x - W / 2, right(room) + W / 2);
    add('z', room.x, room.y - W / 2, bottom(room) + W / 2);
    add('z', right(room), room.y - W / 2, bottom(room) + W / 2);
  }

  for (const line of lines.values()) line.spans = mergeSpans(line.spans);
  return [...lines.values()];
}

/** Застъпените и допиращите се отсечки стават една. */
function mergeSpans(spans: [number, number][]): [number, number][] {
  const sorted = [...spans].sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const [from, to] of sorted) {
    const last = out.at(-1);
    if (last && from <= last[1]) last[1] = Math.max(last[1], to);
    else out.push([from, to]);
  }
  return out;
}

const keyOf = (b: PlainBox) =>
  [b.x, b.y, b.z, b.width, b.height, b.depth].map((n) => Math.round(n)).join('|');

/**
 * Обемите на цялото жилище: подовете на стаите, зидовете помежду им и
 * отворите на вратите.
 *
 * `currentId` е стаята, в която човекът стои — подът ѝ се отбелязва,
 * за да личи откъде тръгва следващата стрелка.
 */
export function flatScene(flat: Flat, currentId: string | null = null): Box[] {
  const boxes: Box[] = [];

  for (const room of flat.rooms) {
    boxes.push({
      x: room.x,
      y: -60,
      z: room.y,
      width: room.width,
      height: 60,
      depth: room.depth,
      role: 'floor',
      facing: null,
      // Видът решава цвета на пода, а самоличността — коя стая е.
      // Готовата се отбелязва отделно, за да личи и в макета докъде
      // е стигнал човекът.
      code: isDone(room) ? `done:${room.kind}` : room.kind,
      moduleId: room.id,
      key: `floor:${room.id}`,
    });

    if (room.id === currentId) {
      // Тънка плоча върху пода — тук сте.
      boxes.push({
        x: room.x,
        y: 1,
        z: room.y,
        width: room.width,
        height: 1,
        depth: room.depth,
        role: 'seam',
        facing: null,
        code: 'current',
        moduleId: room.id,
        key: `here:${room.id}`,
      });
    }
  }

  /*
   * Вратите като отвори в зида. Събират се предварително, защото един
   * зид може да е общ за две стаи и да носи врата, която не е негова
   * по произход.
   */
  const gaps = doorwaysOf(flat);

  for (const line of collectLines(flat)) {
    /*
     * Вратата лежи в този зид, щом е на същата линия. В плана
     * `axis: 'x'` значи обща координата по `x`, тоест зид, който върви
     * по другата ос — затова двете се разменят.
     */
    const holes: WallHole[] = gaps
      .filter(({ gap }) => {
        const along = gap.axis === 'x' ? 'z' : 'x';
        return along === line.along && Math.abs(gap.at - line.at) < 1;
      })
      .map(({ gap }) => ({ from: gap.from, to: gap.to, bottom: 0, top: FLAT_WALL_H }));

    for (const [from, to] of line.spans) {
      const box: PlainBox =
        line.along === 'x'
          ? { x: from, y: 0, z: line.at - W / 2, width: to - from, height: FLAT_WALL_H, depth: W }
          : { x: line.at - W / 2, y: 0, z: from, width: W, height: FLAT_WALL_H, depth: to - from };

      for (const piece of wallWithHoles(box, line.along, holes)) {
        boxes.push({ ...piece, role: 'wall', facing: null, key: `w:${keyOf(piece)}` });
      }
    }
  }

  return boxes;
}

/**
 * Къде да гледа окото: към стаята, в която човекът стои, но отдалече,
 * за да се вижда и останалото жилище. Без контекста наоколо ходенето
 * със стрелките не се разбира.
 */
export function flatTarget(flat: Flat, currentId: string | null): { x: number; z: number } {
  const room = flat.rooms.find((r) => r.id === currentId);
  if (room) return { x: room.x + room.width / 2, z: room.y + room.depth / 2 };
  const b = boundsOf(flat);
  return { x: b.x + b.width / 2, z: b.y + b.depth / 2 };
}

/** Колко далеч да стои окото, за да се събира жилището в кадъра. */
export function flatDistance(flat: Flat): number {
  const b = boundsOf(flat);
  return Math.max(b.width, b.depth) * 1.1 + 3000;
}
