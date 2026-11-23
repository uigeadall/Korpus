import { describe, expect, it } from 'vitest';
import { DIM, type Kitchen, type KitchenModule, type ModuleKind, computeKitchen, emptyKitchen } from './cabinet-rules';
import { DEFAULT_ROOM_NEEDS, layoutFor } from './autolayout';
import { reducer } from '@/components/configurator/state';
import { ergonomics } from './ergonomics';

let n = 0;
const mod = (kind: ModuleKind, width = 600): KitchenModule => ({ id: `${kind}-${++n}`, kind, width, hingeSide: 'right' });

function kitchenWith(base: ModuleKind[], upper: ModuleKind[] = [], extra: Partial<Kitchen> = {}): Kitchen {
  const k = emptyKitchen(4200);
  return {
    ...k,
    room: { width: 4200, depth: 3200 },
    walls: [{ ...k.walls[0], base: base.map((x) => mod(x)), upper: upper.map((x) => mod(x)) }],
    ...extra,
  };
}

describe('удобството', () => {
  it('подредената от правилата кухня е чиста', () => {
    const k0 = emptyKitchen(3600);
    const l = layoutFor('kitchen', 3600, DEFAULT_ROOM_NEEDS);
    const k = { ...k0, room: { width: 4200, depth: 3200 }, walls: [{ ...k0.walls[0], base: l.base, upper: l.upper }] };
    expect(ergonomics(k, computeKitchen(k))).toEqual([]);
  });

  it('фурна до хладилника — предупреждение', () => {
    const notes = ergonomics(kitchenWith(['column', 'oven', 'sink', 'dw']), computeKitchen(kitchenWith(['column', 'oven', 'sink', 'dw'])));
    expect(notes.some((x) => x.id.startsWith('furna-hladilnik') && x.level === 'warn')).toBe(true);
  });

  it('съдомиялна далеч от мивката — съвет', () => {
    const k = kitchenWith(['sink', 'door', 'dw']);
    expect(ergonomics(k, computeKitchen(k)).some((x) => x.id.startsWith('sadomiyalna'))).toBe(true);
    const near = kitchenWith(['sink', 'dw', 'door']);
    expect(ergonomics(near, computeKitchen(near)).some((x) => x.id.startsWith('sadomiyalna'))).toBe(false);
  });

  it('аспиратор, който не е над фурната — предупреждение', () => {
    const k = kitchenWith(['oven', 'door', 'door'], ['upper', 'upper', 'hood']);
    expect(ergonomics(k, computeKitchen(k)).some((x) => x.id.startsWith('aspirator'))).toBe(true);
    const ok = kitchenWith(['oven', 'door'], ['hood', 'upper']);
    expect(ergonomics(ok, computeKitchen(ok)).some((x) => x.id.startsWith('aspirator'))).toBe(false);
  });

  it('два реда един срещу друг в тясна стая — проходът е малък', () => {
    let k: Kitchen = { ...emptyKitchen(3000), room: { width: 3000, depth: 2000 } };
    k = reducer(k, { type: 'add', wallId: k.walls[0].id!, row: 'base', kind: 'door' });
    k = reducer(k, { type: 'addWall', side: 'bottom' });
    k = reducer(k, { type: 'add', wallId: k.walls[1].id!, row: 'base', kind: 'door' });
    const walk = ergonomics(k, computeKitchen(k)).find((x) => x.id.startsWith('prohod'));
    expect(walk?.level).toBe('warn');
    expect(walk?.text).toContain(`${2000 - 2 * DIM.BASE_D} мм`);
  });

  it('ъгъл между две стени — сляп ъгъл и чекмеджета до него', () => {
    let k: Kitchen = { ...emptyKitchen(4200), room: { width: 4200, depth: 3200 } };
    for (let i = 0; i < 7; i++) k = reducer(k, { type: 'add', wallId: k.walls[0].id!, row: 'base', kind: 'door' });
    k = reducer(k, { type: 'addWall', side: 'right' });
    k = reducer(k, { type: 'add', wallId: k.walls[1].id!, row: 'base', kind: 'drawers' });
    const notes = ergonomics(k, computeKitchen(k)).map((x) => x.id);
    expect(notes).toContain('sliap-agal');
    expect(notes.some((x) => x.startsWith('cheknedzhe-agal'))).toBe(true);
  });

  it('гардероб с много място до тавана — подсказва антресол', () => {
    const k0 = emptyKitchen(3000);
    const k: Kitchen = {
      ...k0,
      roomKind: 'bedroom',
      room: { width: 3600, depth: 3400, height: 3000 },
      walls: [{ ...k0.walls[0], base: [mod('wardrobe'), mod('wardrobe')], upper: [] }],
    };
    expect(ergonomics(k, computeKitchen(k)).some((x) => x.id === 'tavan')).toBe(true);
  });
});
