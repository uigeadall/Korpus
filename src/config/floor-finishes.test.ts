import { describe, expect, it } from 'vitest';
import { FLOOR_CATEGORIES, FLOOR_FINISHES, floorById, floorsIn } from './floor-finishes';
import { wallMarks, FILL_BUDGET } from '@/lib/wall-pattern';
import { emptyKitchen } from '@/lib/cabinet-rules';
import { decodeProject, encodeProject } from '@/lib/share';
import { reducer } from '@/components/configurator/state';

describe('подовете', () => {
  it('ламинат, паркет и килим — по три', () => {
    expect(FLOOR_CATEGORIES.map((c) => c.name)).toEqual(['Ламинат', 'Паркет', 'Килим']);
    for (const c of FLOOR_CATEGORIES) expect(floorsIn(c.id)).toHaveLength(3);
    expect(new Set(FLOOR_FINISHES.map((f) => f.id)).size).toBe(9);
    expect(new Set(FLOOR_FINISHES.map((f) => f.name)).size).toBe(9);
  });

  it('всеки под се рисува на цяла стая и стои в тавана', () => {
    for (const f of FLOOR_FINISHES) {
      const marks = wallMarks(f.pattern, { u0: 0, u1: 4200, v0: 0, v1: 3200 }, 7);
      const polys = marks.fills.reduce((s, l) => s + l.polys.length, 0);
      const segs = marks.lines.reduce((s, l) => s + l.segs.length, 0);
      expect(polys, f.id).toBeLessThanOrEqual(FILL_BUDGET);
      expect(polys + segs, f.id).toBeGreaterThan(0);
      expect(segs, f.id).toBeLessThan(6000);
    }
  });

  it('без избор и с непознат ключ подът е както беше', () => {
    expect(floorById(undefined)).toBeNull();
    expect(floorById('pod-ot-badeshteto')).toBeNull();
  });

  it('пътува в линка, а без избор линкът е същият като преди', () => {
    const plain = emptyKitchen(3600);
    expect(decodeProject(encodeProject(plain))?.floorFinish).toBeUndefined();
    const withFloor = { ...plain, floorFinish: 'pod-parket-riba-oak' };
    expect(decodeProject(encodeProject(withFloor))?.floorFinish).toBe('pod-parket-riba-oak');
    expect(encodeProject({ ...plain, floorFinish: 'няма-такъв' })).toBe(encodeProject(plain));
  });

  it('изборът се сменя и се връща', () => {
    const k = reducer(emptyKitchen(3600), { type: 'floorFinish', id: 'pod-kilim-grey' });
    expect(k.floorFinish).toBe('pod-kilim-grey');
    expect('floorFinish' in reducer(k, { type: 'floorFinish', id: null })).toBe(false);
  });
});
