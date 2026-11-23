import { describe, expect, it } from 'vitest';
import {
  MODULES,
  type ModuleKind,
  SHELVES,
  SHELF_MIN_GAP,
  acceptsShelves,
  clampShelves,
  emptyKitchen,
  maxShelves,
  moduleGeometry,
} from './cabinet-rules';
import { reducer } from '@/components/configurator/state';

const KINDS = Object.keys(MODULES) as ModuleKind[];

describe('рафтовете имат таван', () => {
  it('в хладилника, аспиратора, стенния рафт и пейката не влиза рафт', () => {
    for (const kind of ['column', 'hood', 'wallshelf', 'bench', 'oven', 'dw', 'lgap', 'washer'] as const) {
      expect(acceptsShelves(kind), kind).toBe(false);
      expect(maxShelves(kind), kind).toBe(0);
    }
  });

  it('между рафтовете остава поне най-малкото разстояние', () => {
    for (const kind of KINDS) {
      const n = maxShelves(kind);
      if (!n) continue;
      const inner = moduleGeometry(kind).height - 36;
      expect(inner / (n + 1), kind).toBeGreaterThanOrEqual(SHELF_MIN_GAP);
    }
  });

  it('рафтовете по подразбиране се побират под тавана', () => {
    for (const kind of KINDS) {
      if (!acceptsShelves(kind)) continue;
      expect(SHELVES[kind], kind).toBeLessThanOrEqual(maxShelves(kind));
    }
  });

  it('обикновеният долен шкаф събира два-три, не десет', () => {
    expect(maxShelves('door')).toBeGreaterThanOrEqual(2);
    expect(maxShelves('wallbox')).toBeGreaterThanOrEqual(1);
    expect(maxShelves('door')).toBeLessThanOrEqual(3);
    expect(clampShelves('door', 10)).toBe(maxShelves('door'));
    expect(clampShelves('door', -3)).toBe(0);
  });

  it('и действието спира на тавана', () => {
    let k = emptyKitchen(3600);
    k = reducer(k, { type: 'add', wallId: k.walls[0].id!, row: 'base', kind: 'door' });
    const id = k.walls[0].base[0].id;
    k = reducer(k, { type: 'shelves', id, value: 50 });
    expect(k.walls[0].base[0].shelves).toBe(maxShelves('door'));
  });
});
