import { describe, expect, it } from 'vitest';
import {
  FLAT,
  type Flat,
  type FlatRoom,
  type FlatRoomKind,
  addRoom,
  areaOf,
  boundsOf,
  clampFlatRoom,
  DOORWAY_WIDTH,
  defaultFlat,
  doorwayBetween,
  doorwaysOf,
  isDone,
  isFurnished,
  progressOf,
  roomName,
  nameFor,
  neighboursOf,
  overlappingRooms,
  roomAt,
  roomsOverlap,
  sharedWall,
  snapRoom,
  stepFrom,
  totalArea,
} from './flat';

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

/**
 * Три стаи в редица: кухня, коридор по средата, спалня.
 *
 *   ┌──────┬────┬──────┐
 *   │кухня │кор.│спалня│
 *   └──────┴────┴──────┘
 */
const row = (): Flat => ({
  rooms: [
    room({ id: 'k', kind: 'kitchen', x: 0, y: 0, width: 3000, depth: 3000 }),
    room({ id: 'c', kind: 'corridor', x: 3000, y: 0, width: 1500, depth: 3000 }),
    room({ id: 'b', kind: 'bedroom', x: 4500, y: 0, width: 3000, depth: 3000 }),
  ],
});

describe('стаята в жилището', () => {
  it('се вкарва в допустимите мерки и се закръгля', () => {
    const r = clampFlatRoom(room({ x: 123, y: 77, width: 50, depth: 99_999 }));
    expect(r.x % FLAT.STEP).toBe(0);
    expect(r.y % FLAT.STEP).toBe(0);
    expect(r.width).toBe(FLAT.MIN_SIDE);
    expect(r.depth).toBe(FLAT.MAX_SIDE);
  });

  it('площта е в квадратни метри', () => {
    expect(areaOf(room({ width: 4000, depth: 3000 }))).toBe(12);
    expect(totalArea(row())).toBe(9 + 4.5 + 9);
  });

  it('всяко помещение с вид се обзавежда; само безименната „Стая" — не', () => {
    for (const kind of ['kitchen', 'bedroom', 'living', 'bath', 'corridor', 'hall'] as const) {
      expect(isFurnished(kind), kind).toBe(true);
    }
    expect(isFurnished('other')).toBe(false);
  });

  it('второ помещение от същия вид получава номер', () => {
    const flat = row();
    expect(nameFor(flat, 'bath')).toBe('Баня');
    expect(nameFor(flat, 'kitchen')).toBe('Кухня 2');
  });
});

describe('стаите не се застъпват', () => {
  it('допирането не е застъпване', () => {
    const a = room({ x: 0, width: 3000 });
    const b = room({ id: 'r2', x: 3000, width: 3000 });
    expect(roomsOverlap(a, b)).toBe(false);
  });

  it('истинското застъпване се обажда', () => {
    const a = room({ x: 0, width: 3000 });
    const b = room({ id: 'r2', x: 2000, width: 3000 });
    expect(roomsOverlap(a, b)).toBe(true);
    expect(overlappingRooms({ rooms: [a, b] })).toHaveLength(1);
  });

  it('редица от залепени стаи е чиста', () => {
    expect(overlappingRooms(row())).toEqual([]);
    expect(overlappingRooms(defaultFlat())).toEqual([]);
  });
});

describe('мястото на жилището', () => {
  it('обхватът покрива всички стаи, включително в минус', () => {
    const flat: Flat = {
      rooms: [room({ id: 'a', x: -2000, y: -1000 }), room({ id: 'b', x: 3000, y: 2000 })],
    };
    expect(boundsOf(flat)).toEqual({ x: -2000, y: -1000, width: 8000, depth: 6000 });
  });

  it('празно жилище няма обхват, но не се чупи', () => {
    expect(boundsOf({ rooms: [] })).toEqual({ x: 0, y: 0, width: 0, depth: 0 });
  });

  it('посочена точка намира стаята под себе си', () => {
    const flat = row();
    expect(roomAt(flat, { x: 100, y: 100 })?.id).toBe('k');
    expect(roomAt(flat, { x: 3800, y: 1500 })?.id).toBe('c');
    expect(roomAt(flat, { x: 99_999, y: 0 })).toBeNull();
  });
});

describe('лепене към съседите', () => {
  it('стая на косъм от съседа се залепя за него', () => {
    const flat = row();
    const dragged = { ...flat.rooms[1], x: 3000 + 80 };
    expect(snapRoom(flat, dragged).x).toBe(3000);
  });

  it('стая далеч от всички остава където е', () => {
    const flat = row();
    const far = { ...flat.rooms[1], x: 20_000 };
    expect(snapRoom(flat, far).x).toBe(20_000);
  });

  it('лепи и по вертикала', () => {
    const flat: Flat = { rooms: [room({ id: 'a', x: 0, y: 0, width: 3000, depth: 3000 })] };
    const below = room({ id: 'b', x: 0, y: 3000 - 100 });
    expect(snapRoom(flat, below).y).toBe(3000);
  });

  it('лепенето не мени размера', () => {
    const flat = row();
    const dragged = { ...flat.rooms[1], x: 3080 };
    const snapped = snapRoom(flat, dragged);
    expect(snapped.width).toBe(flat.rooms[1].width);
    expect(snapped.depth).toBe(flat.rooms[1].depth);
  });
});

describe('общите стени', () => {
  it('две залепени стаи делят стена, дълга колкото допира', () => {
    const wall = sharedWall(row().rooms[0], row().rooms[1]);
    expect(wall).toEqual({ axis: 'x', at: 3000, from: 0, to: 3000 });
  });

  it('стаи, които само се докосват в ъгъла, не делят стена', () => {
    const a = room({ id: 'a', x: 0, y: 0, width: 3000, depth: 3000 });
    const b = room({ id: 'b', x: 3000, y: 3000, width: 3000, depth: 3000 });
    expect(sharedWall(a, b)).toBeNull();
  });

  it('къс допир не е стена, през която се минава', () => {
    const a = room({ id: 'a', x: 0, y: 0, width: 3000, depth: 3000 });
    const b = room({ id: 'b', x: 3000, y: 2500, width: 3000, depth: 3000 });
    // Припокриват се само 500 мм — през това не се минава.
    expect(sharedWall(a, b)).toBeNull();
  });

  it('хоризонталната стена се разпознава също', () => {
    const a = room({ id: 'a', x: 0, y: 0, width: 3000, depth: 2000 });
    const b = room({ id: 'b', x: 0, y: 2000, width: 3000, depth: 2000 });
    expect(sharedWall(a, b)).toEqual({ axis: 'y', at: 2000, from: 0, to: 3000 });
  });

  it('далечни стаи нямат обща стена', () => {
    expect(sharedWall(row().rooms[0], row().rooms[2])).toBeNull();
  });

  it('съседите се намират и от двете страни', () => {
    const flat = row();
    expect(neighboursOf(flat, 'c').map((n) => n.room.id).sort()).toEqual(['b', 'k']);
    expect(neighboursOf(flat, 'k').map((n) => n.room.id)).toEqual(['c']);
    expect(neighboursOf(flat, 'непозната')).toEqual([]);
  });
});

describe('ходене със стрелките', () => {
  it('надясно и наляво минават през коридора', () => {
    const flat = row();
    expect(stepFrom(flat, 'k', 'right')?.id).toBe('c');
    expect(stepFrom(flat, 'c', 'right')?.id).toBe('b');
    expect(stepFrom(flat, 'b', 'left')?.id).toBe('c');
    expect(stepFrom(flat, 'c', 'left')?.id).toBe('k');
  });

  it('в края на жилището стрелката не води никъде', () => {
    const flat = row();
    expect(stepFrom(flat, 'k', 'left')).toBeNull();
    expect(stepFrom(flat, 'b', 'right')).toBeNull();
    expect(stepFrom(flat, 'k', 'up')).toBeNull();
  });

  it('съседът през стена бие по-близкия по права линия', () => {
    const flat: Flat = {
      rooms: [
        room({ id: 'me', x: 0, y: 0, width: 3000, depth: 3000 }),
        // Залепена отдясно — през нея се минава.
        room({ id: 'through', x: 3000, y: 0, width: 3000, depth: 3000 }),
        // По-близка по център, но без обща стена: отделена с процеп.
        room({ id: 'apart', x: 3200, y: 4000, width: 1000, depth: 1000 }),
      ],
    };
    expect(stepFrom(flat, 'me', 'right')?.id).toBe('through');
  });

  it('без обща стена пак се стига до стая в същата посока', () => {
    const flat: Flat = {
      rooms: [
        room({ id: 'me', x: 0, y: 0, width: 3000, depth: 3000 }),
        room({ id: 'far', x: 5000, y: 0, width: 3000, depth: 3000 }),
      ],
    };
    expect(stepFrom(flat, 'me', 'right')?.id).toBe('far');
  });

  it('стая встрани не се брои за „натам"', () => {
    const flat: Flat = {
      rooms: [
        room({ id: 'me', x: 0, y: 0, width: 3000, depth: 3000 }),
        // Вдясно, но изцяло под нас — не се припокрива по вертикала.
        room({ id: 'below', x: 5000, y: 9000, width: 2000, depth: 2000 }),
      ],
    };
    expect(stepFrom(flat, 'me', 'right')).toBeNull();
  });

  it('от всяка стая на жилището по подразбиране се стига до всяка друга', () => {
    const flat = defaultFlat();
    const reached = new Set<string>(['f-hall']);
    const queue = ['f-hall'];
    while (queue.length) {
      const id = queue.shift()!;
      for (const dir of ['up', 'down', 'left', 'right'] as const) {
        const next = stepFrom(flat, id, dir);
        if (next && !reached.has(next.id)) {
          reached.add(next.id);
          queue.push(next.id);
        }
      }
    }
    expect(reached.size).toBe(flat.rooms.length);
  });

  it('непозната стая не чупи ходенето', () => {
    expect(stepFrom(row(), 'няма такава', 'left')).toBeNull();
  });
});

describe('добавяне на стая', () => {
  it('новата застава до вече начертаните, без да се застъпва', () => {
    const flat = addRoom(row(), 'bath', 'new');
    expect(flat.rooms).toHaveLength(4);
    expect(overlappingRooms(flat)).toEqual([]);
  });

  it('първата стая започва от началото', () => {
    const flat = addRoom({ rooms: [] }, 'kitchen', 'k');
    expect(flat.rooms[0]).toMatchObject({ x: 0, y: 0, kind: 'kitchen', name: 'Кухня' });
  });

  it('повече стаи от разумното не влизат', () => {
    let flat: Flat = { rooms: [] };
    for (let i = 0; i < FLAT.MAX_ROOMS + 3; i++) flat = addRoom(flat, 'other', `r${i}`);
    expect(flat.rooms).toHaveLength(FLAT.MAX_ROOMS);
  });

  it('всеки вид има размер по подразбиране в разумни граници', () => {
    const kinds: FlatRoomKind[] = ['kitchen', 'bedroom', 'living', 'corridor', 'bath', 'hall', 'other'];
    for (const kind of kinds) {
      const r = addRoom({ rooms: [] }, kind, 'x').rooms[0];
      expect(r.width, kind).toBeGreaterThanOrEqual(FLAT.MIN_SIDE);
      expect(r.depth, kind).toBeGreaterThanOrEqual(FLAT.MIN_SIDE);
      expect(areaOf(r), kind).toBeLessThan(40);
    }
  });
});

describe('вратите между стаите', () => {
  it('вратата е в средата на общата стена', () => {
    const gap = doorwayBetween(row().rooms[0], row().rooms[1])!;
    expect(gap.axis).toBe('x');
    expect(gap.at).toBe(3000);
    expect((gap.from + gap.to) / 2).toBe(1500);
    expect(gap.to - gap.from).toBe(DOORWAY_WIDTH);
  });

  it('в къса стена вратата се свива, вместо да я надмине', () => {
    const a = room({ id: 'a', x: 0, y: 0, width: 3000, depth: 950 });
    const b = room({ id: 'b', x: 3000, y: 0, width: 3000, depth: 950 });
    const gap = doorwayBetween(a, b)!;
    expect(gap.to - gap.from).toBeLessThan(DOORWAY_WIDTH);
    // От двете страни на вратата остава зид.
    expect(gap.from).toBeGreaterThan(0);
    expect(gap.to).toBeLessThan(950);
  });

  it('и в най-късата възможна стена остава зид от двете страни', () => {
    for (const depth of [FLAT.MIN_SIDE, 1200, 2000, 6000]) {
      const a = room({ id: 'a', x: 0, y: 0, width: 3000, depth });
      const b = room({ id: 'b', x: 3000, y: 0, width: 3000, depth });
      const gap = doorwayBetween(a, b)!;
      expect(gap.from, `${depth}`).toBeGreaterThan(0);
      expect(gap.to, `${depth}`).toBeLessThan(depth);
      expect(gap.to - gap.from, `${depth}`).toBeGreaterThan(400);
    }
  });

  it('без обща стена няма врата', () => {
    expect(doorwayBetween(row().rooms[0], row().rooms[2])).toBeNull();
  });

  it('всяка двойка съседи получава по една врата', () => {
    expect(doorwaysOf(row())).toHaveLength(2);
    const flat = defaultFlat();
    const pairs = doorwaysOf(flat).map((d) => [d.a.id, d.b.id].sort().join('|'));
    expect(new Set(pairs).size).toBe(pairs.length);
    expect(pairs.length).toBeGreaterThan(0);
  });

  it('вратата винаги лежи в рамките на общата стена', () => {
    for (const { a, b, gap } of doorwaysOf(defaultFlat())) {
      const wall = sharedWall(a, b)!;
      expect(gap.from).toBeGreaterThanOrEqual(wall.from);
      expect(gap.to).toBeLessThanOrEqual(wall.to);
    }
  });
});

describe('докъде е стигнало обзавеждането', () => {
  const withProject = (room: FlatRoom, project = 'abc'): FlatRoom => ({ ...room, project });

  it('стая с проект зад себе си е готова', () => {
    expect(isDone(room())).toBe(false);
    expect(isDone(withProject(room()))).toBe(true);
    expect(isDone({ ...room(), project: '' })).toBe(false);
  });

  it('напредъкът брои само стаите, които изобщо се обзавеждат', () => {
    const flat: Flat = {
      rooms: [
        withProject(room({ id: 'k', kind: 'kitchen' })),
        room({ id: 'b', kind: 'bedroom' }),
        // Безименната „Стая" няма правила и не влиза в сметката.
        room({ id: 'o', kind: 'other' }),
      ],
    };
    expect(progressOf(flat)).toEqual({ done: 1, total: 2 });
  });

  it('празно жилище не дели на нула', () => {
    expect(progressOf({ rooms: [] })).toEqual({ done: 0, total: 0 });
  });

  it('жилището по подразбиране тръгва необзаведено', () => {
    const p = progressOf(defaultFlat());
    expect(p.done).toBe(0);
    expect(p.total).toBeGreaterThan(0);
  });
});

describe('името на стаята на екран', () => {
  it('показва се каквото е написано', () => {
    expect(roomName(room({ name: 'Кухня на мама' }))).toBe('Кухня на мама');
  });

  it('изтрито име не оставя стаята без надпис', () => {
    expect(roomName(room({ name: '', kind: 'bath' }))).toBe('Баня');
    expect(roomName(room({ name: '   ', kind: 'corridor' }))).toBe('Коридор');
  });

  it('интервалите в краищата не се броят за име', () => {
    expect(roomName(room({ name: '  Хол  ' }))).toBe('Хол');
  });
});
