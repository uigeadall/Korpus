import { describe, expect, it } from 'vitest';
import {
  DIM,
  type Kitchen,
  computeKitchen,
  emptyKitchen,
  kitchenWallOpenings,
  moduleGeometry,
} from './cabinet-rules';
import { reducer } from '@/components/configurator/state';
import { footprint } from './furniture/room';

/** Г-кухня: горната стена по цялата стая и дясната, и двете с долни и горни шкафове. */
function lShaped(topLength = 4200): Kitchen {
  let k: Kitchen = { ...emptyKitchen(topLength), room: { width: 4200, depth: 3200 } };
  k = reducer(k, { type: 'addWall', side: 'right' });
  const [top, right] = k.walls;
  for (let i = 0; i < 4; i++) {
    k = reducer(k, { type: 'add', wallId: top.id!, row: 'base', kind: 'door' });
    k = reducer(k, { type: 'add', wallId: top.id!, row: 'upper', kind: 'upper' });
  }
  for (let i = 0; i < 2; i++) {
    k = reducer(k, { type: 'add', wallId: right.id!, row: 'base', kind: 'door' });
    k = reducer(k, { type: 'add', wallId: right.id!, row: 'upper', kind: 'upper' });
  }
  return k;
}

describe('ъглите', () => {
  it('втората стена започва след дълбочината на реда на първата', () => {
    const k = lShaped();
    const placed = computeKitchen(k).placed;
    expect(placed[1].base[0].x).toBeGreaterThanOrEqual(DIM.BASE_D);
    // Горните шкафове са плитки — отстъпват само колкото е горният ред.
    expect(placed[1].upper[0].x).toBeGreaterThanOrEqual(DIM.UPPER_D);
    expect(placed[1].upper[0].x).toBeLessThan(DIM.BASE_D);
  });

  it('в обема шкафовете на двете стени не влизат един в друг', () => {
    const k = lShaped();
    const room = { width: 4200, depth: 3200 };
    const placed = computeKitchen(k).placed;
    const rects = [
      ...placed[0].base.map((m) => footprint(room, 'top', m.x, m.width, moduleGeometry(m.kind).depth)),
      ...placed[1].base.map((m) => footprint(room, 'right', m.x, m.width, moduleGeometry(m.kind).depth)),
    ];
    const top = rects.slice(0, placed[0].base.length);
    const right = rects.slice(placed[0].base.length);
    for (const a of top) {
      for (const b of right) {
        const overlap =
          a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5 && a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5;
        expect(overlap).toBe(false);
      }
    }
  });

  it('къса главна стена не стига до ъгъла — там нищо не се пази', () => {
    const k = lShaped(3000);
    expect(kitchenWallOpenings(k, 'right').some((o) => o.kind === 'corner')).toBe(false);
  });

  it('главната стена не отстъпва — ъгълът е неин', () => {
    const k = lShaped();
    expect(kitchenWallOpenings(k, 'top').some((o) => o.kind === 'corner')).toBe(false);
    expect(computeKitchen(k).placed[0].base[0].x).toBe(0);
  });

  it('празният ъгъл отнема място — пълният ред казва, че няма повече', () => {
    const k = lShaped();
    const wall = k.walls[1].id!;
    let full = k;
    for (let i = 0; i < 10; i++) full = reducer(full, { type: 'add', wallId: wall, row: 'base', kind: 'door' });
    const used = full.walls[1].base.reduce((s, m) => s + m.width, 0);
    expect(used).toBeLessThanOrEqual(3200 - DIM.BASE_D);
  });
});
