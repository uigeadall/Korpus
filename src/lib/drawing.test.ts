import { describe, expect, it } from 'vitest';
import { DIM, type KitchenModule, type ModuleKind, placeWall } from './cabinet-rules';
import {
  DRAW_H,
  PAD,
  WALL_T,
  chainFromRanges,
  dropIndex,
  facadeRects,
  fontSizeMm,
  formatMm,
  heightMarks,
  moduleBox,
  swingTriangle,
  toSvgY,
  viewBoxFor,
} from './drawing';

let seq = 0;
const mod = (kind: ModuleKind, width: number, hingeSide?: 'left' | 'right'): KitchenModule => ({
  id: `m${++seq}`,
  kind,
  width,
  hingeSide,
});

describe('viewBox', () => {
  const view = viewBoxFor(3600);

  it('обхваща стената, двете стени в разрез и полетата', () => {
    expect(view.width).toBe(PAD.left + WALL_T + 3600 + WALL_T + PAD.right);
    expect(view.height).toBe(PAD.top + DRAW_H + PAD.bottom);
    expect(view.value).toBe(`${view.x} ${view.y} ${view.width} ${view.height}`);
  });

  it('при надвишаване рамката се разширява надясно', () => {
    const wide = viewBoxFor(3600, 4200);
    expect(wide.width).toBe(PAD.left + WALL_T + 4200 + WALL_T + PAD.right);
    expect(wide.wallLength).toBe(3600);
    expect(viewBoxFor(3600, 2000).width).toBe(view.width);
  });

  it('подът е на floorY, височините се обръщат', () => {
    expect(toSvgY(view, 0)).toBe(view.floorY);
    expect(toSvgY(view, 2130)).toBe(view.floorY - 2130);
  });
});

describe('кутии на модулите', () => {
  const view = viewBoxFor(3600);
  const placed = placeWall({
    length: 3600,
    base: [mod('column', 600), mod('door', 600)],
    upper: [mod('upper', 600), mod('hood', 600)],
  });

  it('долният шкаф стои на крака 100', () => {
    const box = moduleBox(view, placed.base[1]);
    expect(box.height).toBe(DIM.BASE_H);
    expect(box.y + box.height).toBe(toSvgY(view, DIM.LEG));
  });

  it('колоната свършва там, където свършват горните', () => {
    const column = moduleBox(view, placed.base[0]);
    const upper = moduleBox(view, placed.upper[0]);
    expect(column.y).toBe(upper.y);
  });

  it('шкафът над аспиратора е подравнен отгоре', () => {
    const upper = moduleBox(view, placed.upper[0]);
    const hood = moduleBox(view, placed.upper[1]);
    expect(hood.y).toBe(upper.y);
    expect(hood.height).toBe(DIM.HOOD_H);
  });

  it('нишата е маркирана като празна', () => {
    const p = placeWall({ length: 1200, base: [mod('lgap', 600)], upper: [] });
    expect(moduleBox(view, p.base[0]).empty).toBe(true);
    expect(moduleBox(view, p.base[0]).code).toBeNull();
  });
});

describe('размерна верига', () => {
  it('запълва дупките, за да е затворена', () => {
    const chain = chainFromRanges(
      [
        { x: 600, width: 600 },
        { x: 1200, width: 400 },
      ],
      3600,
    );
    expect(chain.map((s) => [s.x, s.width, s.gap])).toEqual([
      [0, 600, true],
      [600, 600, false],
      [1200, 400, false],
      [1600, 2000, true],
    ]);
  });

  it('сумата на сегментите е общата дължина', () => {
    const chain = chainFromRanges([{ x: 0, width: 900 }], 3600);
    expect(chain.reduce((s, c) => s + c.width, 0)).toBe(3600);
  });

  it('центрира надписа', () => {
    const [seg] = chainFromRanges([{ x: 0, width: 600 }], 600);
    expect(seg.center).toBe(300);
    expect(seg.label).toBe('600');
  });
});

describe('формат на размерите', () => {
  it('десетичната запетая е българска', () => {
    expect(formatMm(396.5)).toBe('396,5');
    expect(formatMm(600)).toBe('600');
  });
});

describe('височини вляво', () => {
  it('включват височината до плота', () => {
    expect(heightMarks(38).map((m) => m.h)).toEqual([0, 100, 858, 1410, 2130]);
    expect(heightMarks(20).map((m) => m.h)).toContain(840);
  });
});

describe('отваряне на вратите', () => {
  it('върхът сочи към пантите вляво', () => {
    const { points } = swingTriangle(0, 0, 400, 700, 'left');
    expect(points).toBe('400,0 0,350 400,700');
  });

  it('върхът сочи към пантите вдясно', () => {
    const { points } = swingTriangle(0, 0, 400, 700, 'right');
    expect(points).toBe('0,0 400,350 0,700');
  });
});

describe('фасади на чертежа', () => {
  const view = viewBoxFor(3600);
  const place = (m: KitchenModule) => placeWall({ length: 3600, base: [m], upper: [] }).base[0];
  const placeUpper = (m: KitchenModule) =>
    placeWall({ length: 3600, base: [], upper: [m] }).upper[0];

  it('единична врата има триъгълник, панелът на съдомиялната — не', () => {
    const [door] = facadeRects(view, place(mod('door', 600)));
    expect(door.width).toBe(596);
    expect(door.swing).toBeDefined();

    const [panel] = facadeRects(view, place(mod('dw', 600)));
    expect(panel.swing).toBeUndefined();
  });

  it('двукрилният шкаф отваря на две страни', () => {
    const rects = facadeRects(view, place(mod('sink', 800)));
    expect(rects).toHaveLength(2);
    expect(rects[0].swing?.side).toBe('left');
    expect(rects[1].swing?.side).toBe('right');
    expect(rects[1].x - (rects[0].x + rects[0].width)).toBe(DIM.GAP_BETWEEN);
  });

  it('трите чела се подреждат с фуга 3 и завършват във фугата отдолу', () => {
    const rects = facadeRects(view, place(mod('drawers', 600)));
    expect(rects.map((r) => r.height)).toEqual([140, 285, 285]);
    const box = moduleBox(view, place(mod('drawers', 600)));
    const last = rects[2];
    expect(last.y + last.height).toBe(box.y + box.height - DIM.GAP_EDGE);
  });

  it('фурната е уред + бленда 116', () => {
    const rects = facadeRects(view, place(mod('oven', 600)));
    expect(rects).toHaveLength(2);
    expect(rects[1].height).toBe(DIM.OVEN_FILLER_H);
  });

  it('колоната е с малка врата отгоре и голяма отдолу', () => {
    const rects = facadeRects(view, place(mod('column', 600)));
    expect(rects.map((r) => r.height)).toEqual([209, 1814]);
    expect(rects[0].swing?.side).toBe(rects[1].swing?.side);
  });

  it('горният шкаф отваря по избраната страна', () => {
    const [door] = facadeRects(view, placeUpper(mod('upper', 500, 'left')));
    expect(door.swing?.side).toBe('left');
  });
});

describe('преподреждане с влачене', () => {
  const row = placeWall({
    length: 3600,
    base: [mod('door', 600), mod('drawers', 600), mod('sink', 800)],
    upper: [],
  }).base;

  const at = (id: string, left: number) => dropIndex(row, id, left);

  it('на мястото си не мърда', () => {
    expect(at(row[0].id, row[0].x)).toBe(0);
    expect(at(row[1].id, row[1].x)).toBe(1);
    expect(at(row[2].id, row[2].x)).toBe(2);
  });

  it('влачене надясно дава следващия индекс', () => {
    // свободните позиции за първия са 0, 600 и 1400
    expect(at(row[0].id, 650)).toBe(1);
    expect(at(row[0].id, 1400)).toBe(2);
  });

  it('широк модул стига и до началото на реда', () => {
    // мивката е 800 — по центрове не би могла да се върне на позиция 0
    expect(at(row[2].id, 0)).toBe(0);
  });

  it('влачене наляво връща назад', () => {
    expect(at(row[1].id, 100)).toBe(0);
    expect(at(row[2].id, 700)).toBe(1);
  });

  it('горният ред се мери спрямо началото си, не спрямо нулата', () => {
    const upperRow = placeWall({
      length: 3600,
      base: [mod('column', 600)],
      upper: [mod('upper', 600), mod('upper', 400)],
    }).upper;
    expect(upperRow[0].x).toBe(600);
    expect(dropIndex(upperRow, upperRow[1].id, 600)).toBe(0);
    expect(dropIndex(upperRow, upperRow[1].id, 1200)).toBe(1);
  });

  it('далеч извън реда се ограничава до краищата', () => {
    expect(at(row[0].id, -5000)).toBe(0);
    expect(at(row[0].id, 99_000)).toBe(2);
  });
});

describe('мащаб на текста', () => {
  it('шрифтът расте, когато чертежът се смали на екрана', () => {
    const view = viewBoxFor(3600);
    const onDesktop = fontSizeMm(view, 1000, 11);
    const onPhone = fontSizeMm(view, 360, 11);
    expect(onPhone).toBeGreaterThan(onDesktop);
    expect(onDesktop * 1000).toBeCloseTo(11 * view.width, 5);
  });
});
