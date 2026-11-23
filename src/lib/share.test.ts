import { describe, expect, it } from 'vitest';
import {
  MODULES,
  computeKitchen,
  defaultDoor,
  emptyKitchen,
  kitchenDoor,
  kitchenRoom,
  kitchenWindows,
} from './cabinet-rules';
import { WALL_SIDES } from './furniture/room';
import { DEFAULT_BEDROOM, DEFAULT_LIVING, DEFAULT_NEEDS, autoLayout, livingLayout, wardrobeLayout } from './autolayout';
import { FURNISHINGS } from './furnishings';
import { SHARE_LISTS, decodeProject, encodeProject, projectLink } from './share';

const kitchen = () => {
  const layout = autoLayout(3600, DEFAULT_NEEDS);
  const k = emptyKitchen(3600);
  k.walls[0] = { ...k.walls[0], base: layout.base, upper: layout.upper };
  k.furnishings = [{ id: 'f1', kind: 'dining-table', x: 2100, z: 1800, rotation: Math.PI / 2 }];
  return k;
};

describe('проектът в линк', () => {
  it('минава напред-назад без загуба', () => {
    const before = kitchen();
    const after = decodeProject(encodeProject(before))!;

    expect(after.walls[0].length).toBe(before.walls[0].length);
    expect(after.walls[0].base.map((m) => [m.kind, m.width])).toEqual(
      before.walls[0].base.map((m) => [m.kind, m.width]),
    );
    expect(after.walls[0].upper.map((m) => [m.kind, m.width])).toEqual(
      before.walls[0].upper.map((m) => [m.kind, m.width]),
    );
    expect(after.materials).toEqual(before.materials);
    expect(after.room).toEqual(before.room);
  });

  it('пази и трите стаи', () => {
    for (const [room, layout] of [
      ['kitchen', autoLayout(3600, DEFAULT_NEEDS)],
      ['bedroom', wardrobeLayout(3600, DEFAULT_BEDROOM)],
      ['living', livingLayout(4200, DEFAULT_LIVING)],
    ] as const) {
      const k = emptyKitchen(3600);
      k.roomKind = room;
      k.walls[0] = { ...k.walls[0], base: layout.base, upper: layout.upper };
      const back = decodeProject(encodeProject(k))!;
      expect(back.roomKind, room).toBe(room);
      expect(back.walls[0].base.map((m) => m.kind)).toEqual(layout.base.map((m) => m.kind));
    }
  });

  it('пази рафтовете и пантите, които клиентът е пипал', () => {
    const k = kitchen();
    k.walls[0].base[1] = { ...k.walls[0].base[1], shelves: 4, hingeSide: 'left' };
    const back = decodeProject(encodeProject(k))!;
    expect(back.walls[0].base[1].shelves).toBe(4);
    expect(back.walls[0].base[1].hingeSide).toBe('left');
  });

  it('пази обзавеждането с мястото и завъртането му', () => {
    const back = decodeProject(encodeProject(kitchen()))!;
    expect(back.furnishings).toHaveLength(1);
    expect(back.furnishings![0].kind).toBe('dining-table');
    expect(back.furnishings![0].x).toBe(2100);
    expect(back.furnishings![0].rotation).toBeCloseTo(Math.PI / 2, 2);
  });

  it('върнатият проект се смята от правилата, както оригиналът', () => {
    const before = computeKitchen(kitchen());
    const after = computeKitchen(decodeProject(encodeProject(kitchen()))!);
    expect(after.parts.length).toBe(before.parts.length);
    expect(after.hardware).toEqual(before.hardware);
    expect(after.byMaterial).toEqual(before.byMaterial);
  });

  it('записът е достатъчно кратък за адрес и за имейл', () => {
    expect(encodeProject(kitchen()).length).toBeLessThan(900);
  });

  it('адресът е безопасен — без знаци, които се чупят в линк', () => {
    const code = encodeProject(kitchen());
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(projectLink('https://x.bg', '/proekt', kitchen())).toBe(`https://x.bg/proekt?p=${code}`);
  });

  it('счупен линк връща нищо, а не срива страницата', () => {
    expect(decodeProject('не-е-линк')).toBeNull();
    expect(decodeProject('')).toBeNull();
    expect(decodeProject(btoa('{"v":99}'))).toBeNull();
  });

  it('стаята се поправя, ако е по-малка от стената си', () => {
    const k = kitchen();
    k.room = { width: 1500, depth: 1500 };
    const back = decodeProject(encodeProject(k))!;
    expect(kitchenRoom(back).width).toBeGreaterThanOrEqual(back.walls[0].length);
  });
});

describe('постоянните списъци', () => {
  it('всяка стая има номер', () => {
    for (const room of ['kitchen', 'bedroom', 'living', 'bath', 'corridor', 'hall']) {
      expect(SHARE_LISTS.ROOMS, room).toContain(room);
    }
    expect(new Set(SHARE_LISTS.ROOMS).size).toBe(SHARE_LISTS.ROOMS.length);
  });

  it('всеки вид модул има номер — иначе линк го губи', () => {
    for (const kind of Object.keys(MODULES)) {
      expect(SHARE_LISTS.KINDS, kind).toContain(kind);
    }
    expect(new Set(SHARE_LISTS.KINDS).size).toBe(SHARE_LISTS.KINDS.length);
  });

  it('всяко готово изделие има номер', () => {
    for (const kind of Object.keys(FURNISHINGS)) {
      expect(SHARE_LISTS.THINGS, kind).toContain(kind);
    }
    expect(new Set(SHARE_LISTS.THINGS).size).toBe(SHARE_LISTS.THINGS.length);
  });
});

describe('вратата в линка', () => {
  it('минава напред-назад без загуба, за всяка стена', () => {
    for (const side of WALL_SIDES) {
      const k = kitchen();
      k.door = { ...defaultDoor(kitchenRoom(k), 'top'), side, x: 400, width: 900, hinge: 'right', swing: 'out' };
      const back = decodeProject(encodeProject(k))!;
      expect(back.door, side).toEqual(k.door);
    }
  });

  it('линк отпреди вратата се чете и получава подразбираща се', () => {
    const k = kitchen();
    delete k.door;
    const code = encodeProject(k);
    const back = decodeProject(code)!;
    expect(back.door).toBeUndefined();
    // Правилата не оставят стая без врата.
    expect(kitchenDoor(back).width).toBeGreaterThan(0);
  });

  it('вратата се вкарва в зида, ако линкът носи невъзможна', () => {
    const k = kitchen();
    k.room = { width: 2000, depth: 2000 };
    k.door = { side: 'top', x: 9000, width: 1800, height: 2040, hinge: 'left', swing: 'in' };
    const back = decodeProject(encodeProject(k))!;
    expect(back.door!.x).toBeGreaterThanOrEqual(0);
    expect(back.door!.x + back.door!.width).toBeLessThanOrEqual(kitchenRoom(back).width);
  });

  it('всяка стена, панта и посока има номер', () => {
    expect(SHARE_LISTS.WALLS).toHaveLength(4);
    expect(SHARE_LISTS.HINGES).toEqual(['left', 'right']);
    expect(SHARE_LISTS.SWINGS).toEqual(['in', 'out']);
  });

  it('вратата не надува линка', () => {
    const k = kitchen();
    k.door = defaultDoor(kitchenRoom(k), 'top');
    expect(encodeProject(k).length).toBeLessThan(900);
  });
});

describe('прозорците в линка', () => {
  const kitchenWithWindows = () => {
    const k = kitchen();
    k.windows = [
      { id: 'a', side: 'top', x: 600, width: 1200, sill: 900, height: 1400 },
      { id: 'b', side: 'left', x: 400, width: 800, sill: 300, height: 1800 },
    ];
    return k;
  };

  it('минават напред-назад със стена, парапет и височина', () => {
    const back = decodeProject(encodeProject(kitchenWithWindows()))!;
    expect(back.windows).toHaveLength(2);
    expect(back.windows!.map((w) => [w.side, w.x, w.width, w.sill, w.height])).toEqual([
      ['top', 600, 1200, 900, 1400],
      ['left', 400, 800, 300, 1800],
    ]);
  });

  it('върнатият проект се нарежда както оригиналът', () => {
    const before = computeKitchen(kitchenWithWindows());
    const after = computeKitchen(decodeProject(encodeProject(kitchenWithWindows()))!);
    expect(after.placed[0].upper.map((m) => m.x)).toEqual(before.placed[0].upper.map((m) => m.x));
    expect(after.parts.length).toBe(before.parts.length);
  });

  it('линк отпреди прозорците се чете и няма прозорци', () => {
    const k = kitchen();
    delete k.windows;
    const back = decodeProject(encodeProject(k))!;
    expect(back.windows).toBeUndefined();
    expect(kitchenWindows(back)).toEqual([]);
  });

  it('невъзможен прозорец се вкарва в зида', () => {
    const k = kitchen();
    k.room = { width: 2000, depth: 2000 };
    k.windows = [{ id: 'a', side: 'top', x: 9000, width: 9000, sill: 9000, height: 9000 }];
    const w = decodeProject(encodeProject(k))!.windows![0];
    expect(w.x).toBeGreaterThanOrEqual(0);
    expect(w.x + w.width).toBeLessThanOrEqual(kitchenRoom(decodeProject(encodeProject(k))!).width);
  });

  it('стая с врата и два прозореца още се събира в адрес', () => {
    expect(encodeProject(kitchenWithWindows()).length).toBeLessThan(900);
  });
});
