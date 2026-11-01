/**
 * Проверката на понятието „система“: двигателят работи върху система,
 * която няма нищо общо с кухня. Тук е измислен стелаж — други редове,
 * други модули, друга стъпка на стената. Ако някой ден нещо кухненско
 * се върне в `system.ts`, тези тестове падат.
 */

import { describe, expect, it } from 'vitest';
import {
  type FurnitureSystem,
  clampLength,
  freeAround,
  freeIntervals,
  geometryOf,
  openingBlocks,
  moduleCounterpart,
  nearestWidth,
  placeWall,
  rowStatus,
  wallStatus,
} from './system';

type Kind = 'tall' | 'low' | 'shelf' | 'gap';
type Row = 'lower' | 'upper';

const RACK: FurnitureSystem<Kind, Row> = {
  id: 'rack',
  label: 'Стелаж',
  rowOrder: ['lower', 'upper'],
  rows: {
    lower: { label: 'Долен', bottom: 0, height: 900, depth: 400 },
    upper: { label: 'Горен', bottom: 1000, height: 600, depth: 300 },
  },
  modules: {
    tall: {
      kind: 'tall',
      row: 'lower',
      label: 'Висок',
      code: 'В',
      widths: [600],
      hasCarcass: true,
      fullHeight: true,
      geometry: { y: 0, height: 1600, depth: 400 },
    },
    low: {
      kind: 'low',
      row: 'lower',
      label: 'Нисък',
      code: 'Н',
      widths: [400, 600, 800],
      hasCarcass: true,
    },
    shelf: { kind: 'shelf', row: 'upper', label: 'Рафт', code: 'Р', widths: [400, 600], hasCarcass: true },
    gap: { kind: 'gap', row: 'upper', label: 'Празно', code: null, widths: [200, 400], hasCarcass: false },
  },
  counterpart: { low: 'shelf', shelf: 'low' },
  wall: { min: 600, max: 4000, step: 50 },
};

let seq = 0;
const mod = (kind: Kind, width: number) => ({ id: `r${++seq}`, kind, width });

describe('ширини и местене', () => {
  it('избира най-близката ширина от каталога на системата', () => {
    expect(nearestWidth(RACK, 'low', 530)).toBe(600);
    expect(nearestWidth(RACK, 'shelf', 530)).toBe(600);
    expect(nearestWidth(RACK, 'low', 410)).toBe(400);
  });

  it('мести модул в другия ред и свива ширината до допустимата', () => {
    const moved = moduleCounterpart(RACK, mod('low', 800));
    expect(moved).toMatchObject({ kind: 'shelf', width: 600 });
  });

  it('не мести модул без аналог в другия ред', () => {
    expect(moduleCounterpart(RACK, mod('tall', 600))).toBeNull();
  });

  it('спазва стъпката и границите на своята стена, не на кухненската', () => {
    expect(clampLength(RACK, 1234)).toBe(1250);
    expect(clampLength(RACK, 100)).toBe(600);
    expect(clampLength(RACK, 9000)).toBe(4000);
  });
});

describe('геометрия', () => {
  it('взема височината от реда', () => {
    expect(geometryOf(RACK, 'low')).toEqual({ y: 0, height: 900, depth: 400 });
    expect(geometryOf(RACK, 'shelf')).toEqual({ y: 1000, height: 600, depth: 300 });
  });

  it('собствената геометрия на модула бие тази на реда', () => {
    expect(geometryOf(RACK, 'tall')).toEqual({ y: 0, height: 1600, depth: 400 });
  });
});

describe('свободните участъци', () => {
  it('са около модулите, които заемат цялата височина', () => {
    const lower = [mod('low', 400), mod('tall', 600), mod('low', 800)];
    expect(freeIntervals(RACK, lower, 1800)).toEqual([
      { x: 0, width: 400 },
      { x: 1000, width: 800 },
    ]);
  });

  it('са цялата стена, когато няма блокиращ модул', () => {
    expect(freeIntervals(RACK, [mod('low', 600)], 1800)).toEqual([{ x: 0, width: 1800 }]);
  });
});

describe('нареждане и номериране', () => {
  it('номерира по префикса на кода и пропуска модулите без код', () => {
    const placed = placeWall(RACK, 2000, {
      lower: [mod('low', 400), mod('tall', 600), mod('low', 600)],
      upper: [mod('shelf', 400), mod('gap', 200), mod('shelf', 600)],
    });

    expect(placed.lower.map((m) => m.code)).toEqual(['Н1', 'В1', 'Н2']);
    expect(placed.upper.map((m) => m.code)).toEqual(['Р1', null, 'Р2']);
  });

  it('нарежда долния ред от нула, а горния — в свободните участъци', () => {
    const placed = placeWall(RACK, 2000, {
      lower: [mod('low', 400), mod('tall', 600)],
      upper: [mod('shelf', 400), mod('shelf', 600)],
    });

    expect(placed.lower.map((m) => m.x)).toEqual([0, 400]);
    // Първият рафт се събира преди високия модул, вторият минава след него.
    expect(placed.upper.map((m) => m.x)).toEqual([0, 1000]);
  });

  it('броячите текат през няколко стени', () => {
    const counters = {};
    const first = placeWall(RACK, 1000, { lower: [mod('low', 600)], upper: [] }, counters);
    const second = placeWall(RACK, 1000, { lower: [mod('low', 600)], upper: [] }, counters);
    expect(first.lower[0].code).toBe('Н1');
    expect(second.lower[0].code).toBe('Н2');
  });
});

describe('отвори в стената', () => {
  // Долният ред е 0–900, горният 1000–1600.
  const door = { id: 'd', kind: 'door' as const, x: 600, width: 900, bottom: 0, height: 2000 };
  const window = { id: 'w', kind: 'window' as const, x: 600, width: 900, bottom: 950, height: 600 };

  it('вратата реже и двата реда', () => {
    expect(openingBlocks(RACK, 'lower', [door])).toEqual([{ x: 600, width: 900 }]);
    expect(openingBlocks(RACK, 'upper', [door])).toEqual([{ x: 600, width: 900 }]);
  });

  it('висок прозорец реже само реда, който пресича', () => {
    expect(openingBlocks(RACK, 'lower', [window])).toEqual([]);
    expect(openingBlocks(RACK, 'upper', [window])).toEqual([{ x: 600, width: 900 }]);
  });

  it('модулите се нареждат около отвора, без да им се казва', () => {
    const placed = placeWall(
      RACK,
      3000,
      { lower: [mod('low', 400), mod('low', 600)], upper: [] },
      {},
      [door],
    );
    // Първият се събира преди вратата, вторият минава след нея.
    expect(placed.lower.map((m) => m.x)).toEqual([0, 1500]);
  });

  it('заетостта се мери срещу стената без отворите', () => {
    const status = wallStatus(RACK, 3000, { lower: [mod('low', 400)], upper: [] }, [door]);
    expect(status.lower.available).toBe(2100);
  });

  it('застъпени отвори не се броят двойно', () => {
    expect(freeAround([{ x: 0, width: 800 }, { x: 400, width: 600 }], 2000)).toEqual([
      { x: 1000, width: 1000 },
    ]);
  });
});

describe('заетост на редовете', () => {
  it('долният ред се мери срещу цялата стена', () => {
    const status = wallStatus(RACK, 2000, { lower: [mod('low', 800)], upper: [] });
    expect(status.lower).toEqual({ used: 800, available: 2000, state: 'left', diff: 1200 });
  });

  it('горният ред се мери срещу свободното място', () => {
    const status = wallStatus(RACK, 2000, {
      lower: [mod('tall', 600)],
      upper: [mod('shelf', 600), mod('shelf', 600)],
    });
    expect(status.upper).toEqual({ used: 1200, available: 1400, state: 'left', diff: 200 });
  });

  it('казва, когато редът е точен или надхвърлен', () => {
    expect(rowStatus(1200, 1200).state).toBe('exact');
    expect(rowStatus(1400, 1200)).toEqual({ used: 1400, available: 1200, state: 'over', diff: 200 });
  });
});
