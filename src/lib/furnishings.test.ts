import { describe, expect, it } from 'vitest';
import { FURNISHINGS, furnishingsFor, halfExtent, slabsOf } from './furnishings';

describe('каталогът на обзавеждането', () => {
  it('всеки предмет има смислени размери', () => {
    for (const s of Object.values(FURNISHINGS)) {
      expect(s.width, s.label).toBeGreaterThan(300);
      expect(s.depth, s.label).toBeGreaterThan(300);
      expect(s.height, s.label).toBeGreaterThan(300);
      expect(s.rooms.length, s.label).toBeGreaterThan(0);
    }
  });

  it('всяка стая предлага нещо, но не чуждото', () => {
    expect(furnishingsFor('kitchen').map((f) => f.kind)).toContain('dining-table');
    expect(furnishingsFor('kitchen').map((f) => f.kind)).not.toContain('sofa');
    expect(furnishingsFor('living').map((f) => f.kind)).toContain('sofa');
    expect(furnishingsFor('bedroom').map((f) => f.kind)).toContain('bed');
    expect(furnishingsFor('bedroom').map((f) => f.kind)).not.toContain('dining-table');
  });

  it('частите стъпват на пода и се събират в габарита', () => {
    for (const kind of Object.keys(FURNISHINGS) as (keyof typeof FURNISHINGS)[]) {
      const s = FURNISHINGS[kind];
      const slabs = slabsOf(kind);
      expect(slabs.length, kind).toBeGreaterThan(0);
      for (const p of slabs) {
        expect(p.y, `${kind} под пода`).toBeGreaterThanOrEqual(0);
        expect(p.width, kind).toBeGreaterThan(0);
        expect(p.depth, kind).toBeGreaterThan(0);
        expect(p.height, kind).toBeGreaterThan(0);
      }
      // Таблата на леглото стърчи назад — за нея габаритът е по-голям.
      const slack = kind === 'bed' ? 120 : 1;
      const right = Math.max(...slabs.map((p) => p.dx + p.width / 2));
      expect(right, `${kind} излиза встрани`).toBeLessThanOrEqual(s.width / 2 + slack);
    }
  });
});

describe('мястото, което заема при завъртане', () => {
  it('без завъртане е половината от собствените му размери', () => {
    const h = halfExtent('sofa', 0);
    expect(h.x).toBe(FURNISHINGS.sofa.width / 2);
    expect(h.z).toBe(FURNISHINGS.sofa.depth / 2);
  });

  it('на четвърт оборот широчината и дълбочината си разменят местата', () => {
    const h = halfExtent('sofa', Math.PI / 2);
    expect(h.x).toBeCloseTo(FURNISHINGS.sofa.depth / 2, 6);
    expect(h.z).toBeCloseTo(FURNISHINGS.sofa.width / 2, 6);
  });

  it('под ъгъл заема повече и по двете оси', () => {
    const straight = halfExtent('dining-table', 0);
    const angled = halfExtent('dining-table', Math.PI / 4);
    expect(angled.x).toBeGreaterThan(straight.x);
    expect(angled.z).toBeGreaterThan(straight.z);
  });
});
