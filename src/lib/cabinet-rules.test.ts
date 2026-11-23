import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MATERIALS,
  DIM,
  type Kitchen,
  type KitchenModule,
  type ModuleKind,
  type RawPart,
  ROOM,
  clampRoom,
  type RoomWindow,
  carcassParts,
  computeKitchen,
  doorLayout,
  emptyRoom,
  drawerBoxParts,
  facadeParts,
  freeBaseIntervals,
  freeUpperIntervals,
  hingeCount,
  MODULES,
  mergeParts,
  modulePartsRaw,
  modulesFor,
  RULES_VERSION,
  rulesAreCurrent,
  rulesNote,
  kitchenDoor,
  kitchenRoom,
  kitchenWallOpenings,
  kitchenWindows,
  nearestWidth,
  toOtherRow,
  placeWall,
  wallStatus,
  worktopHeight,
} from './cabinet-rules';

/* --- помощни за тестовете ----------------------------------------- */

let seq = 0;
function mod(kind: ModuleKind, width: number, hingeSide?: 'left' | 'right'): KitchenModule {
  return { id: `m${++seq}`, kind, width, hingeSide };
}

type Found = { name: string; length: number; width: number; qty: number; note?: string };

function find(parts: RawPart[], name: string): Found[] {
  return parts
    .filter((p) => p.name === name)
    .map((p) => ({ name: p.name, length: p.length, width: p.width, qty: p.qty ?? 1, note: p.note }));
}

function one(parts: RawPart[], name: string): Found {
  const hits = find(parts, name);
  expect(hits, `детайл "${name}"`).toHaveLength(1);
  return hits[0];
}

function dims(p: Found): [number, number, number] {
  return [p.length, p.width, p.qty];
}

/* ------------------------------------------------------------------ */
/* Контролни стойности от спецификацията, раздел 5.2                   */
/* ------------------------------------------------------------------ */

describe('Долен с врата 600', () => {
  const W = 600;
  const parts = carcassParts('door', W);

  it('страница 702×560 ×2', () => expect(dims(one(parts, 'Страница'))).toEqual([702, 560, 2]));
  it('дъно 600×560', () => expect(dims(one(parts, 'Дъно'))).toEqual([600, 560, 1]));
  it('трегер 564×100 ×2', () => expect(dims(one(parts, 'Трегер'))).toEqual([564, 100, 2]));
  it('рафт 562×530', () => expect(dims(one(parts, 'Рафт'))).toEqual([562, 530, 1]));
  it('гръб 717×597', () => expect(dims(one(parts, 'Гръб'))).toEqual([717, 597, 1]));

  it('врата 716×596 с 2 панти', () => {
    const doors = find(facadeParts(mod('door', W), DEFAULT_MATERIALS), 'Врата');
    expect(doors).toHaveLength(1);
    expect(dims(doors[0])).toEqual([716, 596, 1]);
    expect(doors[0].note).toContain('2 панти');
  });
});

describe('Горен 800', () => {
  const W = 800;
  const parts = carcassParts('upper', W);

  it('страница 720×320 ×2', () => expect(dims(one(parts, 'Страница'))).toEqual([720, 320, 2]));
  it('дъно 764×320', () => expect(dims(one(parts, 'Дъно'))).toEqual([764, 320, 1]));

  it('две врати по 716×396,5', () => {
    const doors = find(facadeParts(mod('upper', W), DEFAULT_MATERIALS), 'Врата');
    expect(doors).toHaveLength(2);
    expect(dims(doors[0])).toEqual([716, 396.5, 1]);
    expect(dims(doors[1])).toEqual([716, 396.5, 1]);
    expect(doors[0].note).toContain('панти вляво');
    expect(doors[1].note).toContain('панти вдясно');
  });
});

describe('Колона 600', () => {
  const W = 600;
  const parts = carcassParts('column', W);

  it('страница 2030×560 ×2', () => expect(dims(one(parts, 'Страница'))).toEqual([2030, 560, 2]));
  it('дъно 564×560', () => expect(dims(one(parts, 'Дъно'))).toEqual([564, 560, 1]));
  it('таван 564×560', () => expect(dims(one(parts, 'Таван'))).toEqual([564, 560, 1]));
  it('гръб 2027×597', () => expect(dims(one(parts, 'Гръб'))).toEqual([2027, 597, 1]));

  it('врати 1814×596 (4 панти) и 209×596 (2 панти)', () => {
    const facades = facadeParts(mod('column', W), DEFAULT_MATERIALS);
    const lower = one(facades, 'Врата долна');
    const upper = one(facades, 'Врата горна');
    expect(dims(lower)).toEqual([1814, 596, 1]);
    expect(lower.note).toContain('4 панти');
    expect(dims(upper)).toEqual([209, 596, 1]);
    expect(upper.note).toContain('2 панти');
  });

  it('горният ръб на колоната съвпада с горните шкафове', () => {
    expect(DIM.LEG + DIM.COLUMN_H).toBe(DIM.UPPER_BOTTOM + DIM.UPPER_H);
  });
});

describe('Чекмеджета 600, метален борд', () => {
  const parts = drawerBoxParts(600, 'metal-box');

  it('дъно 489×490 ×3', () => expect(dims(one(parts, 'Дъно чекмедже'))).toEqual([489, 490, 3]));

  it('гърбове 477×84 и 477×167 ×2 след обединяване', () => {
    const all = computeKitchen(kitchenOf([mod('drawers', 600)], [])).parts;
    const backs = mergeParts(all.filter((p) => p.name === 'Гръб чекмедже'));
    expect(backs.map((b) => [b.length, b.width, b.qty])).toEqual([
      [477, 167, 2],
      [477, 84, 1],
    ]);
  });

  it('детайлите на модула включват корпус, фасади и кутии', () => {
    const names = modulePartsRaw(mod('drawers', 600), DEFAULT_MATERIALS).map((p) => p.name);
    expect(names).toContain('Страница');
    expect(names).toContain('Чело');
    expect(names).toContain('Дъно чекмедже');
  });

  it('челата са 140 / 285 / 285 с ширина 596', () => {
    const fronts = find(facadeParts(mod('drawers', 600), DEFAULT_MATERIALS), 'Чело');
    expect(fronts.map((f) => [f.length, f.width])).toEqual([
      [140, 596],
      [285, 596],
      [285, 596],
    ]);
  });
});

/* ------------------------------------------------------------------ */
/* Примерната кухня от прототипа                                       */
/* ------------------------------------------------------------------ */

function kitchenOf(base: KitchenModule[], upper: KitchenModule[], length = 3600): Kitchen {
  return {
    walls: [{ length, base, upper }],
    materials: { ...DEFAULT_MATERIALS },
    rulesVersion: '1.0.0',
  };
}

function exampleKitchen(): Kitchen {
  return kitchenOf(
    [
      mod('column', 600),
      mod('drawers', 600),
      mod('oven', 600),
      mod('door', 400),
      mod('sink', 800),
      mod('dw', 600),
    ],
    [mod('upper', 600), mod('hood', 600), mod('upper', 400), mod('upper', 800), mod('upper', 600)],
  );
}

describe('Примерна кухня, стена 3600', () => {
  const result = computeKitchen(exampleKitchen());
  const hw = (name: string) => result.hardware.find((h) => h.name === name)?.qty ?? 0;

  it('22 панти', () => expect(hw('Панти с плавно затваряне')).toBe(22));
  it('22 крака', () => expect(hw('Крака')).toBe(22));
  it('15 дръжки', () => expect(hw('Дръжки')).toBe(15));
  it('10 окачвача', () => expect(hw('Окачвачи')).toBe(10));
  it('цокъл 3600', () => expect(hw('Цокъл')).toBe(3600));
  it('плот 3000', () => expect(hw('Плот')).toBe(3000));

  it('3 комплекта механизми за едно чекмеджено тяло', () =>
    expect(hw('Механизъм за чекмедже')).toBe(3));

  it('и двата реда са точни', () => {
    const status = result.rowStatus[0];
    expect(status.base.state).toBe('exact');
    expect(status.upper.state).toBe('exact');
  });

  it('номерацията е Д1..Д5, К1, Г1..Г5', () => {
    expect(result.cabinets.map((c) => c.code)).toEqual([
      'К1',
      'Д1',
      'Д2',
      'Д3',
      'Д4',
      'Д5',
      'Г1',
      'Г2',
      'Г3',
      'Г4',
      'Г5',
    ]);
  });

  it('детайлите са номерирани <код>-<NN>', () => {
    const d2 = result.cabinets.find((c) => c.code === 'Д2')!;
    expect(d2.parts[0].no).toBe('Д2-01');
    expect(d2.parts[2].no).toBe('Д2-03');
  });

  it('горните се подреждат вдясно от колоната', () => {
    expect(result.placed[0].upper[0].x).toBe(600);
    expect(result.placed[0].upper.at(-1)!.x).toBe(3000);
  });

  it('обобщението брои плочи с 15% фира', () => {
    const pdch18 = result.summary.materials.find((m) => m.material === 'pdch18')!;
    expect(pdch18.sheets).toBeGreaterThan(0);
    expect(pdch18.areaWithWasteM2).toBeCloseTo(pdch18.areaM2 * 1.15, 2);
  });

  it('височината до плота е 858 при ламиниран плот 38', () => {
    expect(result.summary.worktopHeight).toBe(858);
    expect(worktopHeight('quartz20')).toBe(840);
  });
});

/* ------------------------------------------------------------------ */
/* Правила                                                             */
/* ------------------------------------------------------------------ */

describe('Фасади и панти', () => {
  it('W ≤ 600 → една врата W−4', () => {
    expect(doorLayout(600)).toEqual({ width: 596, count: 1, sides: ['right'] });
    expect(doorLayout(500, 'left')).toEqual({ width: 496, count: 1, sides: ['left'] });
  });

  it('W > 600 → две врати (W−4−3)/2', () => {
    expect(doorLayout(900).width).toBe(446.5);
    expect(doorLayout(800).count).toBe(2);
  });

  it('панти по височина на вратата', () => {
    expect(hingeCount(716)).toBe(2);
    expect(hingeCount(1000)).toBe(2);
    expect(hingeCount(1001)).toBe(3);
    expect(hingeCount(1500)).toBe(3);
    expect(hingeCount(1814)).toBe(4);
    expect(hingeCount(2001)).toBe(5);
  });

  it('боядисаният МДФ е без кант, ПДЧ декор е с 2 мм по 4 страни', () => {
    const painted = facadeParts(mod('door', 600), DEFAULT_MATERIALS)[0];
    expect(painted.edgeThickness).toBe(0);
    expect(painted.note).toContain('боя: RAL 9010');

    const decor = facadeParts(mod('door', 600), {
      ...DEFAULT_MATERIALS,
      facade: { type: 'pdch-decor', color: 'Дъб' },
    })[0];
    expect(decor.edgeL).toBe(2);
    expect(decor.edgeW).toBe(2);
    expect(decor.edgeThickness).toBe(2);

    const milled = facadeParts(mod('door', 600), {
      ...DEFAULT_MATERIALS,
      facade: { type: 'mdf-milled', color: 'RAL 7016' },
    })[0];
    expect(milled.note).toContain('фрезоване рамка');
  });
});

describe('Корпуси', () => {
  it('мивката и фурната са без гръб', () => {
    expect(find(carcassParts('sink', 800), 'Гръб')).toHaveLength(0);
    expect(find(carcassParts('oven', 600), 'Гръб')).toHaveLength(0);
    expect(find(carcassParts('door', 600), 'Гръб')).toHaveLength(1);
  });

  it('само „с врата" има подвижен рафт', () => {
    expect(find(carcassParts('drawers', 600), 'Рафт')).toHaveLength(0);
    expect(find(carcassParts('sink', 600), 'Рафт')).toHaveLength(0);
    expect(find(carcassParts('door', 600), 'Рафт')).toHaveLength(1);
  });

  it('фурната има фиксиран рафт с ниша 595', () => {
    const shelf = one(carcassParts('oven', 600), 'Фиксиран рафт под фурната');
    expect(dims(shelf)).toEqual([564, 540, 1]);
    expect(shelf.note).toContain('595');
  });

  it('шкафът над аспиратора е 360 и дъното му е с изрез', () => {
    const parts = carcassParts('hood', 600);
    expect(dims(one(parts, 'Страница'))).toEqual([360, 320, 2]);
    expect(one(parts, 'Дъно').note).toContain('изрез');
  });

  it('ниши и панели нямат корпус', () => {
    expect(carcassParts('lgap', 600)).toHaveLength(0);
    expect(carcassParts('ugap', 600)).toHaveLength(0);
    expect(carcassParts('dw', 600)).toHaveLength(0);
  });

  it('кантът на корпуса е 0,8 по видимия преден ръб', () => {
    const side = carcassParts('door', 600).find((p) => p.name === 'Страница')!;
    expect([side.edgeL, side.edgeW, side.edgeThickness]).toEqual([1, 0, 0.8]);
    const back = carcassParts('door', 600).find((p) => p.name === 'Гръб')!;
    expect(back.edgeThickness).toBe(0);
  });
});

describe('Чекмеджета със сферични водачи', () => {
  const parts = drawerBoxParts(600, 'ball-bearing');

  it('страници NL × hb', () => {
    expect(find(parts, 'Страница кутия').map((p) => [p.length, p.width, p.qty])).toEqual([
      [500, 90, 2],
      [500, 200, 2],
      [500, 200, 2],
    ]);
  });

  it('чело и гръб на кутията (LW−26−32) × hb', () => {
    expect(find(parts, 'Чело/гръб кутия').map((p) => [p.length, p.width, p.qty])).toEqual([
      [506, 90, 2],
      [506, 200, 2],
      [506, 200, 2],
    ]);
  });

  it('дъно HDF (LW−26) × NL ×3', () =>
    expect(dims(one(parts, 'Дъно кутия'))).toEqual([538, 500, 3]));
});

describe('Ред и статус', () => {
  it('остатък и надвишаване', () => {
    const left = wallStatus({ length: 3600, base: [mod('door', 600)], upper: [] });
    expect(left.base).toMatchObject({ state: 'left', diff: 3000 });

    const over = wallStatus({
      length: 1200,
      base: [mod('door', 900), mod('door', 600)],
      upper: [],
    });
    expect(over.base).toMatchObject({ state: 'over', diff: 300 });
  });

  it('горният ред се мери спрямо свободното между колоните', () => {
    const wall = {
      length: 3600,
      base: [mod('column', 600), mod('door', 600)],
      upper: [mod('upper', 600)],
    };
    expect(freeUpperIntervals(wall)).toEqual([{ x: 600, width: 3000 }]);
    expect(wallStatus(wall).upper).toMatchObject({ available: 3000, state: 'left', diff: 2400 });
  });

  it('колона в средата дава два интервала', () => {
    const wall = {
      length: 3000,
      base: [mod('door', 600), mod('column', 600), mod('door', 600)],
      upper: [],
    };
    expect(freeUpperIntervals(wall)).toEqual([
      { x: 0, width: 600 },
      { x: 1200, width: 1800 },
    ]);
  });

  it('горните прескачат колоната', () => {
    const wall = {
      length: 3000,
      base: [mod('door', 600), mod('column', 600), mod('door', 600)],
      upper: [mod('upper', 600), mod('upper', 600)],
    };
    const placed = placeWall(wall);
    expect(placed.upper.map((u) => u.x)).toEqual([0, 1200]);
  });
});

describe('Врати и прозорци в стената', () => {
  const door = { id: 'o1', kind: 'door' as const, x: 1200, width: 900, bottom: 0, height: 2000 };
  const window = {
    id: 'o2',
    kind: 'window' as const,
    x: 1200,
    width: 1200,
    bottom: 900,
    height: 1400,
  };

  it('вратата реже и двата реда', () => {
    const wall = { length: 3600, base: [], upper: [], openings: [door] };
    expect(freeBaseIntervals(wall)).toEqual([
      { x: 0, width: 1200 },
      { x: 2100, width: 1500 },
    ]);
    expect(freeUpperIntervals(wall)).toEqual([
      { x: 0, width: 1200 },
      { x: 2100, width: 1500 },
    ]);
  });

  it('прозорецът с парапет 900 оставя долния ред цял', () => {
    const wall = { length: 3600, base: [], upper: [], openings: [window] };
    expect(freeBaseIntervals(wall)).toEqual([{ x: 0, width: 3600 }]);
    expect(freeUpperIntervals(wall)).toEqual([
      { x: 0, width: 1200 },
      { x: 2400, width: 1200 },
    ]);
  });

  it('горните шкафове заобикалят прозореца сами', () => {
    const wall = {
      length: 3600,
      base: [],
      upper: [mod('upper', 600), mod('upper', 600), mod('upper', 600)],
      openings: [window],
    };
    const placed = placeWall(wall);
    // Два се събират преди прозореца, третият минава след него.
    expect(placed.upper.map((u) => u.x)).toEqual([0, 600, 2400]);
  });

  it('заетостта се мери срещу стената без отвора', () => {
    const wall = {
      length: 3600,
      base: [mod('door', 600)],
      upper: [],
      openings: [door],
    };
    expect(wallStatus(wall).base).toMatchObject({ available: 2700, state: 'left', diff: 2100 });
  });

  it('плотът и цокълът не минават през вратата', () => {
    const kitchen = {
      walls: [
        {
          length: 3600,
          base: [mod('door', 600), mod('door', 600), mod('sink', 600)],
          upper: [],
          openings: [door],
        },
      ],
      materials: { ...DEFAULT_MATERIALS },
      rulesVersion: '1.0.0',
    };
    const r = computeKitchen(kitchen);
    const placed = r.placed[0].base;
    // Първите два се събират преди вратата, третият минава след нея.
    expect(placed.map((m) => m.x)).toEqual([0, 600, 2100]);
    const hw = (n: string) => r.hardware.find((h) => h.name === n)?.qty ?? 0;
    expect(hw('Плот')).toBe(1800);
  });
});

describe('Ниши', () => {
  const result = computeKitchen(
    kitchenOf([mod('door', 600), mod('lgap', 600), mod('dw', 600)], [], 1800),
  );

  it('нишата няма номер и детайли', () => {
    expect(result.cabinets.map((c) => c.code)).toEqual(['Д1', 'Д2']);
  });

  it('цокълът пропуска нишата, плотът също', () => {
    const hw = (n: string) => result.hardware.find((h) => h.name === n)?.qty ?? 0;
    expect(hw('Цокъл')).toBe(1200);
    expect(hw('Плот')).toBe(1200);
  });

  it('съдомиялната е без крака', () => {
    const hw = (n: string) => result.hardware.find((h) => h.name === n)?.qty ?? 0;
    expect(hw('Крака')).toBe(4);
  });
});

describe('Начин на отваряне', () => {
  const base = [mod('drawers', 600), mod('door', 600)];

  it('push-to-open: по 1 на врата и чекмедже', () => {
    const r = computeKitchen({
      ...kitchenOf(base, [], 1200),
      materials: { ...DEFAULT_MATERIALS, opening: 'push' },
    });
    expect(r.hardware.find((h) => h.name === 'Push-to-open')?.qty).toBe(4);
    expect(r.hardware.find((h) => h.name === 'Дръжки')).toBeUndefined();
  });

  it('алуминиев профил: L по долния ред, C по 2×W на чекмеджетата', () => {
    const r = computeKitchen({
      ...kitchenOf([mod('column', 600), ...base], [], 1800),
      materials: { ...DEFAULT_MATERIALS, opening: 'alu-profile' },
    });
    expect(r.hardware.find((h) => h.name === 'Алуминиев L-профил')?.qty).toBe(1200);
    expect(r.hardware.find((h) => h.name === 'Алуминиев C-профил')?.qty).toBe(1200);
  });
});

describe('Обединяване на еднакви детайли', () => {
  it('изрежда номерата на обединените', () => {
    const r = computeKitchen(kitchenOf([mod('door', 600), mod('door', 600)], [], 1200));
    const sides = r.byMaterial.find((p) => p.name === 'Страница' && p.length === 702)!;
    expect(sides.qty).toBe(4);
    expect(sides.numbers).toEqual(['Д1-01', 'Д2-01']);
  });
});

describe('Преместване между редовете', () => {
  it('долен с врата става горен шкаф и обратно', () => {
    const door = toOtherRow(mod('door', 600))!;
    expect(door.kind).toBe('upper');
    expect(door.width).toBe(600);
    expect(toOtherRow(door)!.kind).toBe('door');
  });

  it('нишата става празно място и обратно', () => {
    expect(toOtherRow(mod('lgap', 600))!.kind).toBe('ugap');
    expect(toOtherRow(mod('ugap', 600))!.kind).toBe('lgap');
  });

  it('чекмеджетата се качват като горен шкаф', () => {
    expect(toOtherRow(mod('drawers', 450))!.kind).toBe('upper');
  });

  it('вързаните за място модули не се местят', () => {
    for (const kind of ['sink', 'oven', 'dw', 'column', 'hood'] as const) {
      expect(toOtherRow(mod(kind, MODULES[kind].widths[0])), kind).toBeNull();
    }
  });

  it('ширината се приближава до най-близката допустима', () => {
    // 1200 го има при празното горе, но не и при долната ниша
    expect(toOtherRow(mod('ugap', 1200))!.width).toBe(900);
    expect(nearestWidth('door', 460)).toBe(450);
    expect(nearestWidth('oven', 100)).toBe(600);
  });

  it('страната на пантите се запазва', () => {
    expect(toOtherRow(mod('door', 500, 'left'))!.hingeSide).toBe('left');
  });
});

describe('Версия на правилата', () => {
  it('резултатът носи версията', () => {
    expect(computeKitchen(exampleKitchen()).rulesVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('отворите на стаята стигат до правилата', () => {
  const kitchenWith = (windows: RoomWindow[]) => ({
    room: { width: 4200, depth: 3200 },
    door: {
      side: 'bottom' as const,
      x: 300,
      width: 800,
      height: 2040,
      hinge: 'left' as const,
      swing: 'in' as const,
    },
    windows,
    walls: [
      {
        id: 'w1',
        side: 'top' as const,
        length: 3600,
        base: [],
        upper: [mod('upper', 600), mod('upper', 600)],
      },
    ],
    materials: { ...DEFAULT_MATERIALS },
    rulesVersion: '1.0.0',
  });

  it('горният ред заобикаля прозорец на стаята', () => {
    const k = kitchenWith([
      { id: 'win1', side: 'top', x: 600, width: 1200, sill: 900, height: 1400 },
    ]);
    const placed = computeKitchen(k).placed[0].upper;
    // Първият се събира преди прозореца, вторият минава след него.
    expect(placed.map((m) => m.x)).toEqual([0, 1800]);
  });

  it('прозорец на друга стена не пречи на никого', () => {
    const k = kitchenWith([
      { id: 'win1', side: 'left', x: 600, width: 1200, sill: 900, height: 1400 },
    ]);
    expect(computeKitchen(k).placed[0].upper.map((m) => m.x)).toEqual([0, 600]);
  });

  it('висок прозорец не пречи на долния ред, нисък — пречи', () => {
    const high = { id: 'w', side: 'top' as const, x: 600, width: 1200, sill: 1500, height: 900 };
    const low = { ...high, sill: 200, height: 1600 };
    const withBase = (win: RoomWindow) => ({
      ...kitchenWith([win]),
      walls: [
        {
          id: 'w1',
          side: 'top' as const,
          length: 3600,
          base: [mod('door', 600), mod('door', 600)],
          upper: [],
        },
      ],
    });
    expect(computeKitchen(withBase(high)).placed[0].base.map((m) => m.x)).toEqual([0, 600]);
    expect(computeKitchen(withBase(low)).placed[0].base.map((m) => m.x)).toEqual([0, 1800]);
  });

  it('стар прозорец, закачен за стената, още се чете', () => {
    const k = {
      walls: [
        {
          id: 'w1',
          side: 'top' as const,
          length: 3600,
          base: [],
          upper: [mod('upper', 600), mod('upper', 600)],
          openings: [
            { id: 'o1', kind: 'window' as const, x: 600, width: 1200, bottom: 900, height: 1400 },
          ],
        },
      ],
      materials: { ...DEFAULT_MATERIALS },
      rulesVersion: '1.0.0',
    };
    expect(kitchenWindows(k)).toHaveLength(1);
    expect(computeKitchen(k).placed[0].upper.map((m) => m.x)).toEqual([0, 1800]);
  });

  it('стар прозорец не се брои два пъти', () => {
    const k = {
      windows: [{ id: 'o1', side: 'top' as const, x: 600, width: 1200, sill: 900, height: 1400 }],
      walls: [
        {
          id: 'w1',
          side: 'top' as const,
          length: 3600,
          base: [],
          upper: [],
          openings: [
            { id: 'o1', kind: 'window' as const, x: 600, width: 1200, bottom: 900, height: 1400 },
          ],
        },
      ],
      materials: { ...DEFAULT_MATERIALS },
      rulesVersion: '1.0.0',
    };
    expect(kitchenWallOpenings(k, 'top')).toHaveLength(1);
  });
});

describe('празна стая от чертежа на жилището', () => {
  it('няма нито един модул — човекът си ги слага сам', () => {
    const k = emptyRoom('kitchen', 3600, 3000);
    expect(k.walls[0].base).toEqual([]);
    expect(k.walls[0].upper).toEqual([]);
    expect(computeKitchen(k).parts).toEqual([]);
  });

  it('носи своя вид и своите размери', () => {
    const k = emptyRoom('bath', 2200, 1800);
    expect(k.roomKind).toBe('bath');
    expect(kitchenRoom(k)).toEqual({ width: 2200, depth: 1800 });
  });

  it('мебелта върви по дългата стена — и стената е онази, която е дълга', () => {
    const deep = emptyRoom('bedroom', 2000, 4000);
    expect(deep.walls[0].length).toBe(4000);
    expect(deep.walls[0].side).toBe('left');

    const wide = emptyRoom('bedroom', 4000, 2000);
    expect(wide.walls[0].length).toBe(4000);
    expect(wide.walls[0].side).toBe('top');
  });

  it('стаята не се надува, за да побере собствената си стена', () => {
    for (const [w, d] of [[2000, 3400], [3400, 2000], [1500, 1500], [900, 6000]]) {
      const k = emptyRoom('corridor', w, d);
      expect(kitchenRoom(k), `${w}×${d}`).toEqual({ width: clampRoom(w), depth: clampRoom(d) });
    }
  });

  it('и в нея се влиза — вратата е там от самото начало', () => {
    const door = kitchenDoor(emptyRoom('corridor', 2000, 3400));
    expect(door.width).toBeGreaterThan(0);
    expect(door.x).toBeGreaterThanOrEqual(0);
  });

  it('невъзможни размери се вкарват в допустимото', () => {
    const k = emptyRoom('living', 50, 99_999);
    expect(kitchenRoom(k).width).toBeGreaterThanOrEqual(ROOM.MIN);
    expect(k.walls[0].length).toBeLessThanOrEqual(DIM.WALL_MAX);
  });

  it('става за всеки вид стая, който знаем да обзавеждаме', () => {
    for (const kind of ['kitchen', 'bedroom', 'living', 'bath', 'corridor', 'hall'] as const) {
      const k = emptyRoom(kind, 3000, 2600);
      expect(computeKitchen(k).placed[0].base, kind).toEqual([]);
      expect(modulesFor(kind, 'base').length, kind).toBeGreaterThan(0);
    }
  });
});

describe('подразбиращата се врата не разбутва заварена мебел', () => {
  const wall = (side: 'top' | 'right' | 'bottom' | 'left', n: number) => ({
    id: `w-${side}`,
    side,
    length: 3000,
    base: Array.from({ length: n }, () => mod('door', 600)),
    upper: [],
  });

  it('две пълни стени си остават пълни, без надвишаване', () => {
    const k: Kitchen = {
      walls: [wall('top', 5), wall('right', 5)],
      materials: { ...DEFAULT_MATERIALS },
      rulesVersion: '1.0.0',
    };
    const r = computeKitchen(k);
    for (const [i, status] of r.rowStatus.entries()) {
      expect(status.base.state, `стена ${i}`).not.toBe('over');
    }
    expect(r.placed[1].base.map((m) => m.x)).toEqual([0, 600, 1200, 1800, 2400]);
  });

  it('вратата отива на стена без мебел', () => {
    const k: Kitchen = {
      walls: [wall('top', 5), wall('right', 5)],
      materials: { ...DEFAULT_MATERIALS },
      rulesVersion: '1.0.0',
    };
    expect(['bottom', 'left']).toContain(kitchenDoor(k).side);
  });

  it('и когато всички стени са заети, стаята пак има врата', () => {
    const k: Kitchen = {
      walls: [wall('top', 1), wall('right', 1), wall('bottom', 1), wall('left', 1)],
      materials: { ...DEFAULT_MATERIALS },
      rulesVersion: '1.0.0',
    };
    expect(kitchenDoor(k).width).toBeGreaterThan(0);
  });

  it('своя врата се уважава, каквото и да има по стените', () => {
    const k: Kitchen = {
      walls: [wall('top', 5)],
      door: { side: 'top', x: 600, width: 800, height: 2040, hinge: 'left', swing: 'in' },
      materials: { ...DEFAULT_MATERIALS },
      rulesVersion: '1.0.0',
    };
    expect(kitchenDoor(k).side).toBe('top');
  });
});

describe('версия на правилата', () => {
  it('конфигурация без версия минава за днешна', () => {
    expect(rulesAreCurrent({})).toBe(true);
    expect(rulesNote({})).toBeNull();
  });

  it('днешната версия не казва нищо', () => {
    expect(rulesAreCurrent({ rulesVersion: RULES_VERSION })).toBe(true);
    expect(rulesNote({ rulesVersion: RULES_VERSION })).toBeNull();
  });

  it('по-стара версия се обажда и назовава и двете', () => {
    const note = rulesNote({ rulesVersion: '1.0.0' });
    expect(note).toContain('1.0.0');
    expect(note).toContain(RULES_VERSION);
  });

  it('версията расте, а не стои', () => {
    expect(RULES_VERSION).not.toBe('1.0.0');
  });
});
