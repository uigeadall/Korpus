/**
 * Дърводелството без кухня: кутиите, рафтовете, вратите и чекмеджетата
 * се смятат от подадените размери, а не от кухненски константи.
 */

import { describe, expect, it } from 'vitest';
import {
  type CarpentryDims,
  type DrawerGeometry,
  betweenSidesBox,
  doorLayout,
  drawerBoxParts,
  hingeCount,
  onBottomBox,
  shelf,
} from './carcass';
import type { RawPart } from './parts';

/** Нарочно различни от кухненските, за да си личи, че се ползват те. */
const DIMS: CarpentryDims = { T: 20, BACK: 4, EDGE_CORPUS: 1 };

const find = (parts: RawPart[], name: string) => parts.filter((p) => p.name === name);

describe('кутия със страници по цялата височина', () => {
  const parts = betweenSidesBox(DIMS, { width: 800, height: 700, depth: 300 });

  it('има две страници по височината на кутията', () => {
    expect(find(parts, 'Страница')[0]).toMatchObject({ length: 700, width: 300, qty: 2 });
  });

  it('слага дъното и тавана между страниците', () => {
    for (const name of ['Дъно', 'Таван']) {
      expect(find(parts, name)[0]).toMatchObject({ length: 800 - 2 * 20, width: 300 });
    }
  });

  it('реже гърба по 4 мм по-малък — дебелината, която е подадена', () => {
    expect(find(parts, 'Гръб')[0]).toMatchObject({ length: 696, width: 796, material: 'hdf3' });
  });

  it('може и без гръб, когато системата го добавя сама', () => {
    const open = betweenSidesBox(DIMS, { width: 800, height: 700, depth: 300, back: false });
    expect(find(open, 'Гръб')).toHaveLength(0);
  });

  it('кантът по предния ръб е този на системата', () => {
    expect(find(parts, 'Страница')[0]).toMatchObject({ edgeL: 1, edgeW: 0, edgeThickness: 1 });
  });
});

describe('кутия, стъпила върху дъното', () => {
  const parts = onBottomBox(DIMS, { width: 600, height: 720, depth: 500, railWidth: 100 });

  it('скъсява страниците с дебелината на дъното', () => {
    expect(find(parts, 'Страница')[0]).toMatchObject({ length: 700, qty: 2 });
  });

  it('дъното минава през цялата ширина', () => {
    expect(find(parts, 'Дъно')[0]).toMatchObject({ length: 600, width: 500 });
  });

  it('отгоре има два трегера вместо таван', () => {
    expect(find(parts, 'Таван')).toHaveLength(0);
    expect(find(parts, 'Трегер')[0]).toMatchObject({ length: 560, width: 100, qty: 2 });
  });
});

describe('рафт', () => {
  it('подвижният е с 2 мм хлабина и по-плитък от корпуса', () => {
    expect(shelf(DIMS, { width: 600, depth: 500, inset: 30 })).toMatchObject({
      name: 'Рафт',
      length: 600 - 2 * 20 - 2,
      width: 470,
    });
  });

  it('фиксираният е по цялата светла ширина', () => {
    expect(shelf(DIMS, { width: 600, depth: 500, fixed: true })).toMatchObject({ length: 560 });
  });
});

describe('врати', () => {
  const gaps = { edge: 2, between: 3, maxSingle: 600 };

  it('една врата до прага, с избраната страна на пантите', () => {
    expect(doorLayout(600, 'left', gaps)).toEqual({ width: 596, count: 1, sides: ['left'] });
  });

  it('две врати над прага, разделени от фугата', () => {
    expect(doorLayout(900, 'right', gaps)).toEqual({
      width: (900 - 4 - 3) / 2,
      count: 2,
      sides: ['left', 'right'],
    });
  });

  it('прагът е на системата — при по-широк праг 900 остава с една врата', () => {
    expect(doorLayout(900, 'right', { ...gaps, maxSingle: 1000 }).count).toBe(1);
  });

  it('пантите растат с височината на вратата', () => {
    expect([hingeCount(700), hingeCount(1200), hingeCount(1814), hingeCount(2300)]).toEqual([
      2, 3, 4, 5,
    ]);
  });
});

describe('чекмеджета', () => {
  const geo: DrawerGeometry = { nominalLength: 450, backHeights: [80, 160], boxHeights: [90, 180] };

  it('при метален борд броят дъна върви по броя чекмеджета', () => {
    const parts = drawerBoxParts(DIMS, 600, 'metal-box', geo);
    expect(find(parts, 'Дъно чекмедже')[0]).toMatchObject({ qty: 2, width: 440 });
    expect(find(parts, 'Гръб чекмедже').map((p) => p.width)).toEqual([80, 160]);
  });

  it('при сферични водачи кутията е от четири страници и HDF дъно', () => {
    const parts = drawerBoxParts(DIMS, 600, 'ball-bearing', geo);
    expect(find(parts, 'Страница кутия')).toHaveLength(2);
    expect(find(parts, 'Чело/гръб кутия')).toHaveLength(2);
    expect(find(parts, 'Дъно кутия')[0]).toMatchObject({ qty: 2, material: 'hdf3' });
  });

  it('вътрешната ширина е W − 2Т по дебелината на системата', () => {
    const parts = drawerBoxParts(DIMS, 600, 'ball-bearing', geo);
    expect(find(parts, 'Дъно кутия')[0].length).toBe(600 - 2 * 20 - 26);
  });
});
