import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WALL_FINISH_ID,
  FINISH_CATEGORIES,
  WALL_FINISHES,
  finishById,
  finishesIn,
  searchFinishes,
} from './wall-finishes';
import { wallMarks } from '@/lib/wall-pattern';

const HEX = /^#[0-9a-f]{6}$/;

/** Всички цветове, споменати в шарката. */
function colorsOf(value: unknown): string[] {
  if (typeof value === 'string') return value.startsWith('#') ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(colorsOf);
  if (value && typeof value === 'object') return Object.values(value).flatMap(colorsOf);
  return [];
}

describe('каталогът на стените', () => {
  it('по три във всяка група — най-търсените, не всички разновидности', () => {
    for (const c of FINISH_CATEGORIES) expect(finishesIn(c.id), c.id).toHaveLength(3);
    expect(WALL_FINISHES).toHaveLength(FINISH_CATEGORIES.length * 3);
  });

  it('ключовете и имената не се повтарят', () => {
    expect(new Set(WALL_FINISHES.map((f) => f.id)).size).toBe(WALL_FINISHES.length);
    expect(new Set(WALL_FINISHES.map((f) => f.name)).size).toBe(WALL_FINISHES.length);
  });

  it('всяка група има покрития и всяко покритие е в позната група', () => {
    const known = new Set(FINISH_CATEGORIES.map((c) => c.id));
    for (const f of WALL_FINISHES) expect(known.has(f.category)).toBe(true);
    for (const c of FINISH_CATEGORIES) expect(finishesIn(c.id).length).toBeGreaterThan(0);
  });

  it('ключовете са кратки и безопасни за адрес', () => {
    for (const f of WALL_FINISHES) expect(f.id).toMatch(/^[a-z0-9-]{3,32}$/);
  });

  it('всички цветове са пълни шестнайсетични', () => {
    for (const f of WALL_FINISHES) {
      expect(f.hex).toMatch(HEX);
      for (const c of colorsOf(f.pattern)) expect(c, f.id).toMatch(HEX);
    }
  });

  it('подразбиращото се е днешната стена — същият цвят, гладка боя', () => {
    const f = finishById(DEFAULT_WALL_FINISH_ID);
    expect(f.hex).toBe('#ebe7e0');
    expect(f.pattern.kind).toBe('plain');
    expect(WALL_FINISHES[0].id).toBe(DEFAULT_WALL_FINISH_ID);
  });

  it('непознат ключ дава подразбиращото се, а не срив', () => {
    expect(finishById('няма-такова').id).toBe(DEFAULT_WALL_FINISH_ID);
    expect(finishById(undefined).id).toBe(DEFAULT_WALL_FINISH_ID);
  });

  it('всяка шарка се рисува в обикновена стена и стои в тавана', () => {
    for (const f of WALL_FINISHES) {
      const marks = wallMarks(f.pattern, { u0: 0, u1: 4200, v0: 0, v1: 2600 });
      const polys = marks.fills.reduce((s, l) => s + l.polys.length, 0);
      const segs = marks.lines.reduce((s, l) => s + l.segs.length, 0);
      expect(polys, f.id).toBeLessThanOrEqual(700);
      expect(segs, f.id).toBeLessThan(4000);
      if (f.pattern.kind !== 'plain') expect(polys + segs, f.id).toBeGreaterThan(0);
    }
  });

  it('търсенето намира по име и по група', () => {
    expect(searchFinishes('тухла').map((f) => f.id)).toEqual([
      'tuhla-red-r',
      'tuhla-old-r',
      'tuhla-white-r',
    ]);
    expect(searchFinishes('Метро бели').map((f) => f.id)).toContain('plochki-metro-white');
    expect(searchFinishes('тапет').every((f) => f.category === 'tapet')).toBe(true);
    expect(searchFinishes('   ').length).toBe(WALL_FINISHES.length);
  });
});
