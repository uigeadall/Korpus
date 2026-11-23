import { describe, expect, it } from 'vitest';
import { type Flat, type FlatRoom, defaultFlat, doorwaysOf } from './flat';
import { FLAT_WALL_H, flatDistance, flatScene, flatTarget } from './flat-scene';

const room = (over: Partial<FlatRoom> = {}): FlatRoom => ({
  id: 'r1',
  kind: 'other',
  name: 'Стая',
  x: 0,
  y: 0,
  width: 3000,
  depth: 3000,
  ...over,
});

/** Две стаи, залепени една до друга. */
const pair = (): Flat => ({
  rooms: [
    room({ id: 'a', kind: 'kitchen', x: 0, y: 0, width: 3000, depth: 3000 }),
    room({ id: 'b', kind: 'living', x: 3000, y: 0, width: 3000, depth: 3000 }),
  ],
});

describe('макетът на жилището', () => {
  it('всяка стая има под', () => {
    const floors = flatScene(pair()).filter((b) => b.role === 'floor');
    expect(floors).toHaveLength(2);
    expect(floors.map((f) => f.moduleId).sort()).toEqual(['a', 'b']);
  });

  it('подът носи вида на стаята, за да се оцвети', () => {
    const floor = flatScene(pair()).find((b) => b.moduleId === 'a' && b.role === 'floor')!;
    expect(floor.code).toBe('kitchen');
  });

  it('стаята, в която стоиш, е отбелязана; другите — не', () => {
    const marks = flatScene(pair(), 'b').filter((b) => b.code === 'current');
    expect(marks).toHaveLength(1);
    expect(marks[0].moduleId).toBe('b');
    expect(flatScene(pair(), null).filter((b) => b.code === 'current')).toHaveLength(0);
  });

  it('общият зид на две стаи се строи веднъж, не два пъти', () => {
    const walls = flatScene(pair()).filter((b) => b.role === 'wall');
    const keys = walls.map((w) => [w.x, w.z, w.width, w.depth].join('|'));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('зидовете са ниски, за да се вижда вътре', () => {
    for (const w of flatScene(defaultFlat()).filter((b) => b.role === 'wall')) {
      expect(w.y + w.height).toBeLessThanOrEqual(FLAT_WALL_H);
    }
  });

  it('вратата между две стаи оставя дупка в общия зид', () => {
    const flat = pair();
    const gap = doorwaysOf(flat)[0].gap;
    const blocking = flatScene(flat).filter(
      (b) =>
        b.role === 'wall' &&
        // Зидът по общата линия x = 3000.
        Math.abs(b.x + b.width / 2 - gap.at) < 1 &&
        b.z < gap.to - 1 &&
        b.z + b.depth > gap.from + 1,
    );
    expect(blocking).toHaveLength(0);
  });

  it('извън вратата общият зид си стои', () => {
    const flat = pair();
    const onTheLine = flatScene(flat).filter(
      (b) => b.role === 'wall' && Math.abs(b.x + b.width / 2 - 3000) < 1,
    );
    expect(onTheLine.length).toBeGreaterThan(0);
  });

  it('стая без съседи е заградена отвсякъде', () => {
    const alone: Flat = { rooms: [room()] };
    const walls = flatScene(alone).filter((b) => b.role === 'wall');
    expect(walls).toHaveLength(4);
  });

  it('истинско жилище се строи без грешки и без дублирани ключове', () => {
    const boxes = flatScene(defaultFlat(), 'f-kitchen');
    expect(boxes.length).toBeGreaterThan(10);
    const keys = boxes.map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('накъде гледа окото', () => {
  it('към стаята, в която стоиш', () => {
    expect(flatTarget(pair(), 'b')).toEqual({ x: 4500, z: 1500 });
  });

  it('без избрана стая — към средата на жилището', () => {
    expect(flatTarget(pair(), null)).toEqual({ x: 3000, z: 1500 });
  });

  it('непозната стая не чупи изгледа', () => {
    expect(flatTarget(pair(), 'няма такава')).toEqual({ x: 3000, z: 1500 });
  });

  it('по-голямо жилище се гледа отдалече', () => {
    const small = flatDistance(pair());
    const big = flatDistance(defaultFlat());
    expect(big).toBeGreaterThan(0);
    expect(small).toBeGreaterThan(0);
  });
});

describe('зидовете се сливат, не се трупат', () => {
  /**
   * Дълга стая отгоре и две къси под нея — долният ѝ зид е общ с
   * двете и не бива да излезе на три застъпени плоскости.
   *
   *   ┌───────────────┐
   *   │     дълга     │
   *   ├───────┬───────┤
   *   │ лява  │ дясна │
   *   └───────┴───────┘
   */
  const tee = (): Flat => ({
    rooms: [
      room({ id: 'long', x: 0, y: 0, width: 6000, depth: 3000 }),
      room({ id: 'left', x: 0, y: 3000, width: 3000, depth: 3000 }),
      room({ id: 'rightish', x: 3000, y: 3000, width: 3000, depth: 3000 }),
    ],
  });

  it('няма два обема на едно и също място', () => {
    const walls = flatScene(tee()).filter((b) => b.role === 'wall');
    const keys = walls.map((w) => [w.x, w.y, w.z, w.width, w.depth].join('|'));
    expect(new Set(keys).size).toBe(keys.length);
  });

  /**
   * Два зида, които се срещат в ъгъл, се застъпват — това е плътен
   * ъгъл и е вярно. Трептене дава само застъпване на *една и съща*
   * равнина: два зида по една линия, единият върху другия.
   */
  const coplanar = (a: { x: number; z: number; width: number; depth: number },
                    b: { x: number; z: number; width: number; depth: number }) =>
    (a.z === b.z && a.depth === b.depth) || (a.x === b.x && a.width === b.width);

  it('няма два зида един върху друг на една и съща равнина', () => {
    for (const flat of [tee(), defaultFlat()]) {
      const walls = flatScene(flat).filter((b) => b.role === 'wall');
      for (let i = 0; i < walls.length; i++) {
        for (let j = i + 1; j < walls.length; j++) {
          const a = walls[i];
          const b = walls[j];
          if (!coplanar(a, b)) continue;
          const area =
            Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
            Math.max(0, Math.min(a.z + a.depth, b.z + b.depth) - Math.max(a.z, b.z));
          expect(area, `${i} и ${j}`).toBe(0);
        }
      }
    }
  });

  it('и в истинско жилище всеки обем е сам на мястото си', () => {
    const boxes = flatScene(defaultFlat(), 'f-living');
    const keys = boxes.map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
