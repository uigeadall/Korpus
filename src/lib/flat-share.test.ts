import { describe, expect, it } from 'vitest';
import { DEFAULT_ROOM_NEEDS, layoutFor } from './autolayout';
import { emptyKitchen, type RoomKind } from './cabinet-rules';
import { FLAT, FLAT_ROOM_LABEL, type Flat, type FlatRoom, defaultFlat } from './flat';
import { decodeFlat, encodeFlat } from './flat-share';
import { decodeProject, encodeProject } from './share';

/** Проект за дадена стая, какъвто го прави потокът. */
function проект(kind: RoomKind, wall = 3600): string {
  const k = emptyKitchen(wall);
  k.roomKind = kind;
  const l = layoutFor(kind, wall, DEFAULT_ROOM_NEEDS);
  k.walls[0] = { ...k.walls[0], base: l.base, upper: l.upper };
  return encodeProject(k);
}

/** Жилището по подразбиране, с обзаведени стаи. */
function обзаведено(колко = 6): Flat {
  const flat = defaultFlat();
  return {
    rooms: flat.rooms.map((r, i) =>
      i < колко && r.kind !== 'other' ? { ...r, project: проект(r.kind as RoomKind) } : r,
    ),
  };
}

describe('жилището в линк', () => {
  it('излиза и се връща същото', () => {
    const преди = defaultFlat();
    const след = decodeFlat(encodeFlat(преди));
    expect(след).not.toBeNull();
    expect(след!.rooms).toHaveLength(преди.rooms.length);

    for (const [i, r] of след!.rooms.entries()) {
      const беше = преди.rooms[i];
      expect(r.kind, беше.name).toBe(беше.kind);
      expect([r.x, r.y, r.width, r.depth], беше.name).toEqual([
        беше.x,
        беше.y,
        беше.width,
        беше.depth,
      ]);
    }
  });

  it('проектите се връщат по стаите си, а не разместени', () => {
    const преди = обзаведено();
    const след = decodeFlat(encodeFlat(преди))!;

    for (const [i, r] of след.rooms.entries()) {
      expect(r.project, r.name).toBe(преди.rooms[i].project);
      const k = decodeProject(r.project!);
      expect(k, r.name).not.toBeNull();
      expect(k!.roomKind, r.name).toBe(преди.rooms[i].kind);
    }
  });

  it('обзаведена и необзаведена стая не се объркват', () => {
    const flat: Flat = {
      rooms: [
        { id: 'a', kind: 'kitchen', name: 'Кухня', x: 0, y: 0, width: 3600, depth: 3000 },
        {
          id: 'b',
          kind: 'bath',
          name: 'Баня',
          x: 3600,
          y: 0,
          width: 2200,
          depth: 1800,
          project: проект('bath', 2200),
        },
        { id: 'c', kind: 'hall', name: 'Антре', x: 0, y: 3000, width: 2000, depth: 1600 },
      ],
    };
    const след = decodeFlat(encodeFlat(flat))!;
    expect(след.rooms[0].project).toBeUndefined();
    expect(след.rooms[1].project).toBe(flat.rooms[1].project);
    expect(след.rooms[2].project).toBeUndefined();
  });

  it('преименувана стая си носи името, а непреименувана не плаща за него', () => {
    const flat: Flat = {
      rooms: [
        { id: 'a', kind: 'bedroom', name: 'Детската', x: 0, y: 0, width: 3000, depth: 3000 },
        { id: 'b', kind: 'bedroom', name: 'Спалня', x: 3000, y: 0, width: 3000, depth: 3000 },
      ],
    };
    const code = encodeFlat(flat);
    const след = decodeFlat(code)!;
    expect(след.rooms[0].name).toBe('Детската');
    expect(след.rooms[1].name).toBe(FLAT_ROOM_LABEL.bedroom);
    expect(code).toContain('0JTQtdGC'); // „Дет…" в записа — носи се само то
  });

  it('празно име се връща към името на вида', () => {
    const flat: Flat = {
      rooms: [{ id: 'a', kind: 'bath', name: '   ', x: 0, y: 0, width: 2200, depth: 1800 }],
    };
    expect(decodeFlat(encodeFlat(flat))!.rooms[0].name).toBe('Баня');
  });
});

describe('какво не минава', () => {
  it('боклук не чупи нищо', () => {
    for (const code of ['', '~', 'не-е-запис', 'eyJ2Ijo5OX0', 'eyJ2IjoxfQ', '!!!']) {
      expect(decodeFlat(code), code).toBeNull();
    }
  });

  it('друга версия се отказва, вместо да гадае', () => {
    const чужд = btoa(JSON.stringify({ v: 99, r: [[0, 0, 0, 3600, 3000]] }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(decodeFlat(чужд)).toBeNull();
  });

  it('непознат вид стая става „стая", а не изчезва', () => {
    const странен = btoa(JSON.stringify({ v: 1, r: [[42, 0, 0, 3600, 3000]] }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const след = decodeFlat(странен)!;
    expect(след.rooms[0].kind).toBe('other');
  });

  it('безумни числа се вкарват в рамките', () => {
    const луд = btoa(JSON.stringify({ v: 1, r: [[0, 0, 0, 99999, -5]] }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const r = decodeFlat(луд)!.rooms[0];
    expect(r.width).toBeLessThanOrEqual(FLAT.MAX_SIDE);
    expect(r.depth).toBeGreaterThanOrEqual(FLAT.MIN_SIDE);
  });

  it('повече стаи от тавана се отрязват', () => {
    const много = Array.from({ length: 30 }, (_, i) => [0, i * 4000, 0, 3600, 3000]);
    const code = btoa(JSON.stringify({ v: 1, r: много }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(decodeFlat(code)!.rooms).toHaveLength(FLAT.MAX_ROOMS);
  });
});

describe('колко тежи линкът', () => {
  /*
   * Мярка, не украса. Пощенските програми пречупват адреси около 2000
   * знака; ако обичайното жилище мине над това, линкът спира да върши
   * работа и трябва да се разбере веднага, а не от клиент.
   */
  it('обичайно жилище от шест обзаведени стаи се побира под 2000 знака', () => {
    const code = encodeFlat(обзаведено());
    expect(code.length).toBeLessThan(2000);
  });

  it('пълно жилище от дванайсет стаи остава под 4000', () => {
    const base = обзаведено();
    const rooms: FlatRoom[] = [];
    for (let i = 0; i < FLAT.MAX_ROOMS; i++) {
      const r = base.rooms[i % base.rooms.length];
      rooms.push({ ...r, id: `x${i}`, x: r.x + i * 20 });
    }
    expect(encodeFlat({ rooms }).length).toBeLessThan(4000);
  });

  it('чертеж без мебел е кратък', () => {
    expect(encodeFlat(defaultFlat()).length).toBeLessThan(400);
  });
});
