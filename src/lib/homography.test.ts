import { describe, expect, it } from 'vitest';
import { type Quad, applyHomography, cssMatrix3d, homography, isConvex } from './homography';

const rect: Quad = [
  { x: 0, y: 0 },
  { x: 1000, y: 0 },
  { x: 1000, y: 500 },
  { x: 0, y: 500 },
];

describe('перспектива по четири точки', () => {
  it('ъглите отиват точно на посочените места', () => {
    const quad: Quad = [
      { x: 120, y: 80 },
      { x: 860, y: 140 },
      { x: 820, y: 520 },
      { x: 90, y: 600 },
    ];
    const H = homography(rect, quad)!;
    for (let i = 0; i < 4; i++) {
      const p = applyHomography(H, rect[i]);
      expect(p.x).toBeCloseTo(quad[i].x, 6);
      expect(p.y).toBeCloseTo(quad[i].y, 6);
    }
  });

  it('правоъгълник в себе си е единичното преобразуване', () => {
    const H = homography(rect, rect)!;
    expect(H.map((v) => Math.round(v * 1e6) / 1e6)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  });

  it('правите остават прави — средата на ръба лежи на ръба', () => {
    const quad: Quad = [
      { x: 0, y: 0 },
      { x: 800, y: 100 },
      { x: 800, y: 400 },
      { x: 0, y: 500 },
    ];
    const H = homography(rect, quad)!;
    const mid = applyHomography(H, { x: 500, y: 0 });
    // Горният ръб е от (0,0) до (800,100): y = x / 8.
    expect(mid.y).toBeCloseTo(mid.x / 8, 6);
    // Далечната половина се свива: средата не е на половината път.
    expect(mid.x).not.toBeCloseTo(400, 0);
  });

  it('три точки на една права не дават преобразуване', () => {
    const bad: Quad = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 200, y: 0 },
      { x: 0, y: 100 },
    ];
    expect(homography(rect, bad)).toBeNull();
    expect(isConvex(bad)).toBe(false);
  });

  it('разбърканите ъгли се хващат', () => {
    const crossed: Quad = [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
    ];
    expect(isConvex(crossed)).toBe(false);
    expect(isConvex(rect)).toBe(true);
  });

  it('CSS матрицата е по колони', () => {
    expect(cssMatrix3d([1, 0, 30, 0, 1, 40, 0, 0, 1])).toBe(
      'matrix3d(1.0000000000,0.0000000000,0,0.0000000000,0.0000000000,1.0000000000,0,0.0000000000,0,0,1,0,30.0000000000,40.0000000000,0,1.0000000000)',
    );
  });
});
