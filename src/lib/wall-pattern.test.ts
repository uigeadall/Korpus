import { describe, expect, it } from 'vitest';
import { FILL_BUDGET, hash, wallMarks } from './wall-pattern';

const brick = {
  kind: 'brick' as const,
  w: 250,
  h: 75,
  mortar: '#cccccc',
  tones: ['#993333', '#aa4444'],
  bond: 'stretcher' as const,
};

describe('шарката на стената', () => {
  it('случайното е едно и също за едно и също място', () => {
    expect(hash(3, 7, 1)).toBe(hash(3, 7, 1));
    expect(hash(3, 7, 1)).not.toBe(hash(7, 3, 1));
    for (let i = 0; i < 50; i++) {
      const r = hash(i, i * 3, 5);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(1);
    }
  });

  it('гладката боя няма шарка', () => {
    expect(wallMarks({ kind: 'plain' }, { u0: 0, u1: 1000, v0: 0, v1: 1000 })).toEqual({
      fills: [],
      lines: [],
    });
  });

  it('тухлите се разминават с половин тухла на всеки ред', () => {
    const marks = wallMarks(brick, { u0: 0, u1: 1000, v0: 0, v1: 150 });
    const joints = marks.lines[0].segs.filter(([a, b]) => a[0] === b[0]);
    const row = (v: number) => joints.filter(([a]) => a[1] === v).map(([a]) => a[0]);
    expect(row(0)).toContain(250);
    expect(row(75)).toContain(125);
    expect(row(75)).not.toContain(250);
  });

  it('разрязаната от врата стена продължава шарката си', () => {
    // Едно и също място в стената дава еднакви тухли, от което и
    // парче зид да се гледа.
    const whole = wallMarks(brick, { u0: 0, u1: 3000, v0: 0, v1: 600 });
    const piece = wallMarks(brick, { u0: 1800, u1: 3000, v0: 0, v1: 600 });
    const key = (p: number[][]) => p.map((x) => x.join(',')).join(';');
    const inWhole = new Set(whole.fills.flatMap((l) => l.polys.map((p) => `${l.color}|${key(p)}`)));
    const pieceBricks = piece.fills.flatMap((l) => l.polys.map((p) => `${l.color}|${key(p)}`));
    expect(pieceBricks.length).toBeGreaterThan(0);
    for (const b of pieceBricks) expect(inWhole.has(b)).toBe(true);
  });

  it('гъстата мозайка се разрежда до тавана, но фугите остават всички', () => {
    const marks = wallMarks(
      { kind: 'tile', w: 25, h: 25, offset: 0, grout: '#999999', tones: ['#111111', '#222222'], mix: 0.9 },
      { u0: 0, u1: 6000, v0: 0, v1: 2600 },
    );
    const polys = marks.fills.reduce((s, l) => s + l.polys.length, 0);
    expect(polys).toBeLessThanOrEqual(FILL_BUDGET);
    expect(polys).toBeGreaterThan(FILL_BUDGET / 2);
    const segs = marks.lines.reduce((s, l) => s + l.segs.length, 0);
    // 6000 / 25 + 1 отвесни и 2600 / 25 + 1 хоризонтални фуги.
    expect(segs).toBe(241 + 105);
  });

  it('рибената кост покрива пода без дупки и без застъпване', () => {
    for (const k of [2, 5]) {
      // Броят се клетките с размер къса страна; всяка трябва да е заета веднъж.
      const cells = new Map<string, number>();
      for (let st = -20; st <= 20; st++) {
        for (let n = -60; n <= 120; n++) {
          const bu = n + k * st;
          const bv = n - k * st;
          for (let i = 0; i < k; i++) cells.set(`${bu + i},${bv}`, (cells.get(`${bu + i},${bv}`) ?? 0) + 1);
          for (let j = 1; j <= k; j++) cells.set(`${bu},${bv + j}`, (cells.get(`${bu},${bv + j}`) ?? 0) + 1);
        }
      }
      for (let u = 0; u < 30; u++) {
        for (let v = 0; v < 30; v++) expect(cells.get(`${u},${v}`), `k=${k} ${u},${v}`).toBe(1);
      }
    }
  });

  it('рибената кост рисува дъсчици по цялата площ и стои в тавана', () => {
    const marks = wallMarks(
      { kind: 'herringbone', h: 70, ratio: 5, grout: '#000000', tones: ['#111111'] },
      { u0: 0, u1: 4200, v0: 0, v1: 3200 },
    );
    const segs = marks.lines.reduce((s, l) => s + l.segs.length, 0);
    expect(segs).toBeGreaterThan(1500);
    expect(marks.fills.reduce((s, l) => s + l.polys.length, 0)).toBeLessThanOrEqual(FILL_BUDGET);
  });

  it('ламперията стои само долу', () => {
    const marks = wallMarks(
      { kind: 'wainscot', height: 950, panel: 600, lower: '#ffffff', rail: '#000000' },
      { u0: 0, u1: 1200, v0: 1200, v1: 2600 },
    );
    expect(marks.fills).toEqual([]);
    expect(marks.lines).toEqual([]);
  });
});
