import { describe, expect, it } from 'vitest';
import { DEFAULT_ROOM_NEEDS, layoutFor } from './autolayout';
import { type Kitchen, type RoomKind, computeKitchen, emptyKitchen } from './cabinet-rules';
import { type Flat, defaultFlat } from './flat';
import { flatBreakdown, mergeHardware } from './flat-export';
import {
  toFlatCabinetRows,
  toFlatExportRows,
  toFlatLegendRows,
  flatWorkbookFileName,
} from './export-mapping';
import { encodeProject } from './share';

/** Обзаведена стая, каквато я прави потокът. */
function проект(kind: RoomKind, wall = 3600): Kitchen {
  const k = emptyKitchen(wall);
  k.roomKind = kind;
  const l = layoutFor(kind, wall, DEFAULT_ROOM_NEEDS);
  k.walls[0] = { ...k.walls[0], base: l.base, upper: l.upper };
  return k;
}

/** Жилище с толкова обзаведени стаи. */
function обзаведено(колко = 3): Flat {
  const flat = defaultFlat();
  return {
    rooms: flat.rooms.map((r, i) =>
      i < колко && r.kind !== 'other'
        ? { ...r, project: encodeProject(проект(r.kind as RoomKind)) }
        : r,
    ),
  };
}

describe('жилището се разгъва', () => {
  it('влизат само стаите с проект', () => {
    const b = flatBreakdown(обзаведено(3));
    expect(b.rooms).toHaveLength(3);
    expect(b.summary.rooms).toBe(3);
    expect(b.broken).toHaveLength(0);
  });

  it('празно жилище дава празен списък, не грешка', () => {
    const b = flatBreakdown(defaultFlat());
    expect(b.rooms).toHaveLength(0);
    expect(b.parts).toHaveLength(0);
    expect(b.byMaterial).toHaveLength(0);
    expect(b.hardware).toHaveLength(0);
    expect(b.summary.cabinets).toBe(0);
    expect(b.summary.materials).toEqual([]);
  });

  it('нечетим проект се отбелязва, вместо да изчезне', () => {
    /*
     * Това е смисълът на `broken`: орязан при копиране линк не бива
     * да прави поръчката безмълвно по-малка. Цехът трябва да види, че
     * една стая липсва.
     */
    const flat = обзаведено(2);
    flat.rooms[1] = { ...flat.rooms[1], project: 'това-не-е-запис' };
    const b = flatBreakdown(flat);
    expect(b.rooms).toHaveLength(1);
    expect(b.broken).toHaveLength(1);
    expect(b.broken[0].id).toBe(flat.rooms[1].id);
  });

  it('отворена, но празна стая не влиза и не се брои за счупена', () => {
    const flat = defaultFlat();
    flat.rooms[0] = { ...flat.rooms[0], project: encodeProject(emptyKitchen(3600)) };
    const b = flatBreakdown(flat);
    expect(b.rooms).toHaveLength(0);
    expect(b.broken).toHaveLength(0);
  });
});

describe('номерата не се сблъскват', () => {
  /*
   * Същинската причина Б2 да съществува. Кодовете започват отначало
   * във всяка стая: „Д1" от кухнята и „Д1" от банята са две различни
   * врати. В един списък това е сбъркан детайл.
   */
  it('всеки детайл в жилището има свой номер', () => {
    const b = flatBreakdown(обзаведено(6));
    const номера = b.parts.map((p) => p.no);
    expect(номера.length).toBeGreaterThan(40);
    expect(new Set(номера).size).toBe(номера.length);
  });

  it('позициите са един ред през цялото жилище', () => {
    const b = flatBreakdown(обзаведено(3));
    const позиции = b.rooms.flatMap((r) => r.cabinets.map((c) => c.pos));
    expect(позиции[0]).toBe('П1');
    expect(позиции).toEqual(позиции.map((_, i) => `П${i + 1}`));
    expect(new Set(позиции).size).toBe(позиции.length);
  });

  it('кодът в стаята се пази — по телефона се говори с него', () => {
    const b = flatBreakdown(обзаведено(2));
    const пръв = b.rooms[0].cabinets[0];
    expect(пръв.code).toBe(b.rooms[0].result.cabinets[0].code);
    expect(пръв.pos).not.toBe(пръв.code);
  });

  it('редът вътре в шкафа си остава', () => {
    const b = flatBreakdown(обзаведено(1));
    const шкаф = b.rooms[0].cabinets[0];
    const край = шкаф.parts.map((p) => p.no.split('-').at(-1));
    expect(край).toEqual(шкаф.source.parts.map((p) => p.no.split('-').at(-1)));
    expect(шкаф.parts.every((p) => p.no.startsWith(`${шкаф.pos}-`))).toBe(true);
  });

  it('обединените редове в разкроя сочат номера, които съществуват', () => {
    const b = flatBreakdown(обзаведено(4));
    const същински = new Set(b.parts.map((p) => p.no));
    for (const ред of b.byMaterial) {
      for (const no of ред.numbers) expect(същински.has(no), no).toBe(true);
    }
  });
});

describe('сборът е сбор, не препис', () => {
  it('детайлите са всички детайли на стаите', () => {
    const flat = обзаведено(3);
    const b = flatBreakdown(flat);
    const поотделно = b.rooms.reduce((s, r) => s + r.result.parts.length, 0);
    expect(b.parts).toHaveLength(поотделно);
    expect(b.summary.partPieces).toBe(
      b.rooms.reduce((s, r) => s + r.result.summary.partPieces, 0),
    );
  });

  it('кантът е линеен — сборът излиза еднакъв по двата пътя', () => {
    const b = flatBreakdown(обзаведено(3));
    const общо = b.summary.edges.reduce((s, e) => s + e.meters, 0);
    const поотделно = b.rooms.reduce(
      (s, r) => s + r.result.summary.edges.reduce((x, e) => x + e.meters, 0),
      0,
    );
    expect(общо).toBeCloseTo(поотделно, 1);
  });

  it('общият разкрой не излиза повече плочи от отделните', () => {
    /*
     * Това е печалбата на Б2: недорязаните плочи от шест стаи стават
     * едно парче. Числото е сметка, не обещание — затова се проверява
     * само посоката, в която не бива да е сбъркано.
     */
    const b = flatBreakdown(обзаведено(6));
    const общо = b.summary.materials.reduce((s, m) => s + m.sheets, 0);
    expect(общо).toBeGreaterThan(0);
    expect(общо).toBeLessThanOrEqual(b.summary.sheetsIfSeparate);
  });

  it('плотът и цокълът се сумират по стаи', () => {
    const b = flatBreakdown(обзаведено(4));
    expect(b.summary.worktopLength).toBe(
      b.rooms.reduce((s, r) => s + r.result.summary.worktopLength, 0),
    );
    expect(b.summary.plinthLength).toBe(
      b.rooms.reduce((s, r) => s + r.result.summary.plinthLength, 0),
    );
  });
});

describe('обковът за доставчика', () => {
  it('еднаквите редове се събират в един', () => {
    const слято = mergeHardware([
      [{ name: 'Крака', qty: 4, unit: 'бр.' }],
      [{ name: 'Крака', qty: 6, unit: 'бр.' }],
    ]);
    expect(слято).toHaveLength(1);
    expect(слято[0].qty).toBe(10);
  });

  it('различна бележка остава различен ред', () => {
    /*
     * Бележката носи избора на стаята. Слеят ли се, заявката става за
     * сто еднакви механизма, каквито поръчката не иска.
     */
    const слято = mergeHardware([
      [{ name: 'Механизъм за чекмедже', qty: 3, unit: 'компл.', note: 'Blum' }],
      [{ name: 'Механизъм за чекмедже', qty: 5, unit: 'компл.', note: 'ролков' }],
    ]);
    expect(слято).toHaveLength(2);
    expect(слято.map((l) => l.qty).sort()).toEqual([3, 5]);
  });

  it('нулевите редове не влизат в заявката', () => {
    expect(mergeHardware([[{ name: 'Подемен механизъм', qty: 0, unit: 'бр.' }]])).toHaveLength(0);
  });

  it('не изпуска нищо от стаите', () => {
    const b = flatBreakdown(обзаведено(3));
    const имена = new Set(b.hardware.map((l) => l.name));
    for (const r of b.rooms) {
      for (const l of r.result.hardware) {
        if (l.qty > 0) expect(имена.has(l.name), l.name).toBe(true);
      }
    }
  });

  it('панти от три стаи стават едно число', () => {
    const b = flatBreakdown(обзаведено(3));
    const ред = b.hardware.find((l) => l.name === 'Панти с плавно затваряне');
    const очаквано = b.rooms.reduce(
      (s, r) => s + (r.result.hardware.find((l) => l.name === 'Панти с плавно затваряне')?.qty ?? 0),
      0,
    );
    expect(ред?.qty).toBe(очаквано);
  });
});

describe('редовете за файла', () => {
  it('по шкафове всеки ред знае в коя стая отива', () => {
    const b = flatBreakdown(обзаведено(3));
    const редове = toFlatExportRows(b, 'cabinet');
    expect(редове).toHaveLength(b.parts.length);
    expect(редове.every((r) => r.room.length > 0 && r.room !== '—')).toBe(true);
    expect(new Set(редове.map((r) => r.room)).size).toBe(3);
  });

  it('по материал стаята не се пише — редът е общ', () => {
    const b = flatBreakdown(обзаведено(3));
    const редове = toFlatExportRows(b, 'material');
    expect(редове).toHaveLength(b.byMaterial.length);
    expect(редове.every((r) => r.room === '—')).toBe(true);
    expect(редове.some((r) => r.no.includes(','))).toBe(true);
  });

  it('заявката по шкафове чете материалите от своята стая', () => {
    const flat = обзаведено(2);
    const кухня = проект('kitchen');
    кухня.materials = { ...кухня.materials, opening: 'push' };
    const баня = проект('bath');
    баня.materials = { ...баня.materials, opening: 'handles' };
    flat.rooms[0] = { ...flat.rooms[0], project: encodeProject(кухня) };
    const индекс = flat.rooms.findIndex((r) => r.kind === 'bath');
    flat.rooms[индекс] = { ...flat.rooms[индекс], project: encodeProject(баня) };

    const редове = toFlatCabinetRows(flatBreakdown(flat));
    const отваряне = new Set(редове.map((r) => r.opening));
    expect(отваряне.size).toBe(2);
  });

  it('заявката носи позиция, стая и код', () => {
    const b = flatBreakdown(обзаведено(2));
    const редове = toFlatCabinetRows(b);
    expect(редове).toHaveLength(b.summary.cabinets);
    expect(редове[0].pos).toBe('П1');
    expect(редове[0].cabinet).toBe(b.rooms[0].cabinets[0].code);
    expect(редове.every((r) => r.room.length > 0)).toBe(true);
  });

  it('легендата води от позиция до стая', () => {
    const b = flatBreakdown(обзаведено(3));
    const легенда = toFlatLegendRows(b);
    expect(легенда).toHaveLength(b.summary.cabinets);
    expect(new Set(легенда.map((l) => l.pos)).size).toBe(легенда.length);
    const П1 = легенда.find((l) => l.pos === 'П1')!;
    expect(П1.room).toBe(b.rooms[0].cabinets[0].room);
    expect(П1.width).toBeGreaterThan(0);
  });

  it('името на файла носи датата', () => {
    expect(flatWorkbookFileName(new Date('2026-11-27T10:00:00Z'))).toBe(
      'korpus-jilishte-2026-11-27.xlsx',
    );
  });
});

describe('нищо не се пресмята наново', () => {
  it('детайлите на стаята са същите, както ги дава `computeKitchen`', () => {
    /*
     * Правило №6. Ако някога тук се появи втора сметка за детайли,
     * този тест ще падне — и това е целта му.
     */
    const кухня = проект('kitchen');
    const flat = defaultFlat();
    flat.rooms[0] = { ...flat.rooms[0], project: encodeProject(кухня) };

    const b = flatBreakdown(flat);
    const сам = computeKitchen(кухня);

    expect(b.parts).toHaveLength(сам.parts.length);
    for (const [i, p] of b.parts.entries()) {
      const беше = сам.parts[i];
      expect([p.name, p.material, p.length, p.width, p.qty, p.edgeMm]).toEqual([
        беше.name,
        беше.material,
        беше.length,
        беше.width,
        беше.qty,
        беше.edgeMm,
      ]);
    }
  });
});
