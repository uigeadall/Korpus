import { describe, expect, it } from 'vitest';
import {
  BAND,
  STRENGTH,
  type Contact,
  baseContacts,
  floorContacts,
  gradientEnds,
  wallContacts,
} from './ao';
import type { Box } from './scene3d';
import { WALL_SIDES } from './furniture/room';

const room = { width: 4200, depth: 3200, height: 2600 };

const box = (over: Partial<Box> = {}): Box => ({
  x: 100,
  y: 0,
  z: 0,
  width: 600,
  height: 100,
  depth: 560,
  role: 'plinth',
  facing: null,
  key: 'p1',
  ...over,
});

/** Разстоянието между тъмния и светлия ръб — ширината на ивицата. */
function widthOf(c: Contact): number {
  const { dark, light } = gradientEnds(c);
  return Math.hypot(dark.x - light.x, dark.y - light.y, dark.z - light.z);
}

describe('подът до зида', () => {
  const list = floorContacts(room);

  it('по една ивица до всяка стена', () => {
    expect(list).toHaveLength(4);
    expect(new Set(list.map((c) => c.key)).size).toBe(4);
  });

  it('лежат на пода, не над него', () => {
    for (const c of list) {
      for (const p of c.corners) expect(p.y).toBeLessThan(2);
    }
  });

  it('тъмният ръб е при самия зид', () => {
    const gore = list.find((c) => c.key.endsWith('top'))!;
    expect(gradientEnds(gore).dark.z).toBeLessThan(1);
    expect(gradientEnds(gore).light.z).toBeCloseTo(BAND, 0);

    const lyavo = list.find((c) => c.key.endsWith('left'))!;
    expect(gradientEnds(lyavo).dark.x).toBeLessThan(1);
    expect(gradientEnds(lyavo).light.x).toBeCloseTo(BAND, 0);
  });

  it('в тясна стая ивиците не се срещат по средата', () => {
    /*
     * Две ивици по 210 в коридор от 300 биха се застъпили и средата му
     * щеше да е по-тъмна от ръбовете — точно обратното на истината.
     */
    const tesen = floorContacts({ width: 4000, depth: 300 });
    for (const c of tesen) expect(widthOf(c)).toBeLessThanOrEqual(150 + 0.01);
  });
});

describe('зидът до пода и до съседа', () => {
  it('по три ивици на стена: основата и двата ѝ края', () => {
    for (const side of WALL_SIDES) {
      const list = wallContacts(room, side);
      expect(list, side).toHaveLength(3);
      expect(list.filter((c) => c.key.endsWith('floor')), side).toHaveLength(1);
    }
  });

  it('ивицата в основата тъмнее надолу, не нагоре', () => {
    const osnova = wallContacts(room, 'top').find((c) => c.key.endsWith('floor'))!;
    const { dark, light } = gradientEnds(osnova);
    expect(dark.y).toBeLessThan(light.y);
    expect(dark.y).toBeLessThan(1);
  });

  it('ивиците в краищата тъмнеят към ъгъла', () => {
    const [, nachalo, kraj] = wallContacts(room, 'top');
    expect(gradientEnds(nachalo).dark.x).toBeLessThan(gradientEnds(nachalo).light.x);
    expect(gradientEnds(kraj).dark.x).toBeGreaterThan(gradientEnds(kraj).light.x);
    expect(gradientEnds(kraj).dark.x).toBeCloseTo(room.width, 0);
  });

  it('стая без зададена височина пак получава ивици', () => {
    const list = wallContacts({ width: 3000, depth: 3000 }, 'left');
    expect(list).toHaveLength(3);
    for (const c of list) for (const p of c.corners) expect(Number.isFinite(p.y)).toBe(true);
  });

  it('всички ивици са с една сила — иначе ъглите не си отговарят', () => {
    for (const side of WALL_SIDES) {
      for (const c of wallContacts(room, side)) expect(c.strength).toBe(STRENGTH);
    }
  });
});

describe('подът около мебелта', () => {
  it('шкаф на пода получава ивица по четирите си страни', () => {
    const list = baseContacts([box()], room);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((c) => c.key.startsWith('ao-base-'))).toBe(true);
  });

  it('вдигнатото няма среща с пода', () => {
    /*
     * Горният шкаф не пипа пода. Ивица под него би била сянка от нещо,
     * което не стои там.
     */
    expect(baseContacts([box({ y: 1410, role: 'carcass', height: 720 })], room)).toHaveLength(0);
  });

  it('тънкото на пода не е основа', () => {
    expect(baseContacts([box({ height: 20 })], room)).toHaveLength(0);
  });

  it('фасада и плот не правят ивица — те не пипат пода', () => {
    expect(baseContacts([box({ role: 'facade' })], room)).toHaveLength(0);
    expect(baseContacts([box({ role: 'worktop' })], room)).toHaveLength(0);
  });

  it('отворена врата и готова форма се пропускат', () => {
    expect(baseContacts([box({ swing: { pivotX: 0, pivotZ: 0, angle: 1 } })], room)).toHaveLength(0);
    expect(baseContacts([box({ shape: [{ x: 0, y: 0, z: 0 }] })], room)).toHaveLength(0);
  });

  it('ивицата не излиза извън стаята', () => {
    const list = baseContacts([box({ x: 0, z: 0 })], room);
    for (const c of list) {
      for (const p of c.corners) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(room.width);
        expect(p.z).toBeGreaterThanOrEqual(0);
        expect(p.z).toBeLessThanOrEqual(room.depth);
      }
    }
  });

  it('свита до нищо ивица не се връща', () => {
    // Шкаф, долепен до левия зид: ивицата наляво няма къде да легне.
    const list = baseContacts([box({ x: 0 })], room);
    expect(list.some((c) => c.key.endsWith('-w'))).toBe(false);
  });

  it('по-слаба е от ъглите — там вече има и хвърлена сянка', () => {
    const [prva] = baseContacts([box()], room);
    expect(prva.strength).toBeLessThan(STRENGTH);
  });
});

describe('накъде гасне', () => {
  it('краищата са средите на двата ръба', () => {
    const c: Contact = {
      key: 'k',
      corners: [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
        { x: 10, y: 0, z: 4 },
        { x: 0, y: 0, z: 4 },
      ],
      strength: 0.2,
    };
    expect(gradientEnds(c).dark).toEqual({ x: 5, y: 0, z: 0 });
    expect(gradientEnds(c).light).toEqual({ x: 5, y: 0, z: 4 });
  });

  it('всяка ивица има посока — нулева дължина няма какво да прелее', () => {
    const all = [
      ...floorContacts(room),
      ...WALL_SIDES.flatMap((s) => wallContacts(room, s)),
      ...baseContacts([box()], room),
    ];
    for (const c of all) expect(widthOf(c), c.key).toBeGreaterThan(1);
  });
});
