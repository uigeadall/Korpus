import { describe, expect, it } from 'vitest';
import {
  MODULES,
  type KitchenModule,
  type ModuleKind,
  gapKindFor,
  isGap,
  placeWall,
} from './cabinet-rules';
import { gapFill, slideRow, slideTarget } from './slide';

let seq = 0;
const mod = (kind: ModuleKind, width: number): KitchenModule => ({
  id: `${kind}-${++seq}`,
  kind,
  width,
  hingeSide: 'right',
});

const novModul = (kind: ModuleKind, width: number): KitchenModule => mod(kind, width);

/** Подредбата на ред, както я смятат правилата. */
const naredi = (row: KitchenModule[], length = 3600) =>
  placeWall({ id: 'w', side: 'top', length, base: row, upper: [] }, {}, 'kitchen', []).base;

const LGAP = gapKindFor('kitchen', 'base');

describe('коя ниша се ползва', () => {
  it('всяка стая си има своята, а някои редове нямат', () => {
    expect(gapKindFor('kitchen', 'base')).toBe('lgap');
    expect(gapKindFor('kitchen', 'upper')).toBe('ugap');
    expect(gapKindFor('bath', 'base')).toBe('bgap');
    // Над гардероба стои само антресол — празно там не е изделие.
    expect(gapKindFor('bedroom', 'upper')).toBeNull();
  });

  it('панелът на уред не е ниша', () => {
    expect(isGap('lgap')).toBe(true);
    expect(isGap('dw')).toBe(false);
    expect(isGap('door')).toBe(false);
  });
});

describe('колко празно се сглобява', () => {
  it('точните ширини се правят точно', () => {
    for (const w of MODULES.lgap.widths) {
      expect(gapFill(w, 'lgap').total, String(w)).toBe(w);
    }
  });

  it('под най-тясната ниша не се прави нищо', () => {
    expect(gapFill(120, 'lgap')).toEqual({ widths: [], total: 0 });
    expect(gapFill(0, 'lgap').total).toBe(0);
  });

  it('няма ли ниша в реда, няма и празно', () => {
    expect(gapFill(900, null)).toEqual({ widths: [], total: 0 });
  });

  it('по-голямо място се сглобява от няколко', () => {
    const { widths, total } = gapFill(1500, 'lgap');
    expect(widths.length).toBeGreaterThan(1);
    expect(total).toBeLessThanOrEqual(1500);
    for (const w of widths) expect(MODULES.lgap.widths).toContain(w);
  });
});

describe('един шкаф на празна стена', () => {
  /* Това е случаят, заради който всичко това съществува. */
  const sam = () => [mod('sink', 800)];

  it('плъзнат надясно, получава ниша пред себе си', () => {
    const row = sam();
    const placed = naredi(row);
    const цел = slideTarget(placed, row[0].id, 1500, LGAP)!;
    expect(цел.index).toBe(0);
    expect(цел.gap).toBeGreaterThan(0);

    const нов = slideRow(row, row[0].id, цел.index, цел.gap, LGAP, novModul)!;
    expect(нов.filter((m) => isGap(m.kind)).length).toBeGreaterThan(0);

    // И наистина ляга там, където каза целта.
    const след = naredi(нов);
    expect(след.find((m) => m.id === row[0].id)!.x).toBe(цел.left);
  });

  it('плъзнат обратно към ъгъла, нишите изчезват', () => {
    const row = sam();
    const цел1 = slideTarget(naredi(row), row[0].id, 1500, LGAP)!;
    const сНиша = slideRow(row, row[0].id, цел1.index, цел1.gap, LGAP, novModul)!;
    expect(сНиша.length).toBeGreaterThan(1);

    const цел2 = slideTarget(naredi(сНиша), row[0].id, 0, LGAP)!;
    const обратно = slideRow(сНиша, row[0].id, цел2.index, цел2.gap, LGAP, novModul)!;
    expect(обратно.filter((m) => isGap(m.kind))).toHaveLength(0);
    expect(naredi(обратно).find((m) => m.id === row[0].id)!.x).toBe(0);
  });

  it('целта и резултатът не се разминават, където и да го пуснеш', () => {
    for (const want of [0, 300, 700, 1200, 1900, 2600]) {
      const row = sam();
      const цел = slideTarget(naredi(row), row[0].id, want, LGAP)!;
      const нов = slideRow(row, row[0].id, цел.index, цел.gap, LGAP, novModul)!;
      expect(naredi(нов).find((m) => m.id === row[0].id)!.x, String(want)).toBe(цел.left);
    }
  });
});

describe('шкаф между други', () => {
  const три = () => [mod('door', 600), mod('drawers', 400), mod('sink', 800)];

  it('плъзнат наляво, разменя се със съседа', () => {
    const row = три();
    const id = row[2].id;
    const цел = slideTarget(naredi(row), id, 0, LGAP)!;
    expect(цел.index).toBe(0);
    expect(цел.gap).toBe(0);

    const нов = slideRow(row, id, цел.index, цел.gap, LGAP, novModul)!;
    expect(нов.map((m) => m.kind)).toEqual(['sink', 'door', 'drawers']);
  });

  it('плъзнат зад последния, получава ниша след тях', () => {
    const row = три();
    const id = row[0].id;
    const цел = slideTarget(naredi(row), id, 2400, LGAP)!;
    const нов = slideRow(row, id, цел.index, цел.gap, LGAP, novModul)!;
    expect(нов.at(-1)!.id).toBe(id);
    expect(нов.filter((m) => isGap(m.kind)).length).toBeGreaterThan(0);
    expect(naredi(нов).find((m) => m.id === id)!.x).toBe(цел.left);
  });

  it('чужда ниша не се пипа', () => {
    // Ниша за прозорец между първия и втория шкаф.
    const a = mod('door', 600);
    const prozorec = mod('lgap', 900);
    const b = mod('drawers', 400);
    const c = mod('sink', 800);
    const row = [a, prozorec, b, c];

    // Мести се последният, далеч от тази ниша.
    const цел = slideTarget(naredi(row), c.id, 0, LGAP)!;
    const нов = slideRow(row, c.id, цел.index, цел.gap, LGAP, novModul)!;
    expect(нов.map((m) => m.id)).toContain(prozorec.id);
    expect(нов.indexOf(нов.find((m) => m.id === prozorec.id)!)).toBeGreaterThan(0);
  });
});

describe('какво не минава', () => {
  it('непознат шкаф не дава нито цел, нито ред', () => {
    const row = [mod('door', 600)];
    expect(slideTarget(naredi(row), 'няма-такъв', 500, LGAP)).toBeNull();
    expect(slideRow(row, 'няма-такъв', 0, 300, LGAP, novModul)).toBeNull();
  });

  it('ред без ниша просто не се разтяга', () => {
    const row = [mod('attic', 600)];
    const цел = slideTarget(
      placeWall({ id: 'w', side: 'top', length: 3600, base: [], upper: row }, {}, 'bedroom', [])
        .upper,
      row[0].id,
      1500,
      gapKindFor('bedroom', 'upper'),
    )!;
    expect(цел.gap).toBe(0);
    expect(цел.left).toBe(0);
  });
});
