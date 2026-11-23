import { describe, expect, it } from 'vitest';
import { computeKitchen, emptyKitchen, type Kitchen } from './cabinet-rules';
import { reducer } from '@/components/configurator/state';
import { gapKindFor, gridStep, isGap, slideRow, wallPoint } from './slide';

/** Стена 3600 с два шкафа по 600 в началото. */
function twoCabinets(): Kitchen {
  let k = emptyKitchen(3600);
  const wallId = k.walls[0].id!;
  k = reducer(k, { type: 'add', wallId, row: 'base', kind: 'door' });
  k = reducer(k, { type: 'add', wallId, row: 'base', kind: 'door' });
  return k;
}
const xs = (k: Kitchen) =>
  computeKitchen(k).placed[0].base.filter((m) => !isGap(m.kind)).map((m) => [m.id, m.x] as const);

describe('шкаф по стената, по решетка', () => {
  it('решетката е по-ситна в къса стена и по-едра в дълга', () => {
    expect(gridStep(1800)).toBe(50);
    expect(gridStep(3600)).toBe(100);
    expect(gridStep(6000)).toBe(150);
    expect(gridStep(7000)).toBe(150);
  });

  it('плъзнат шкаф ляга на решетката, а пред него остава ниша', () => {
    const k = twoCabinets();
    const id = k.walls[0].base[1].id;
    const moved = reducer(k, { type: 'slide', id, left: 2033 });
    const at = Object.fromEntries(xs(moved));
    expect(at[id]).toBe(2000);
    // Първият си стои; между тях — ниша, която не влиза в разкроя.
    expect(at[k.walls[0].base[0].id]).toBe(0);
    expect(moved.walls[0].base.some((m) => isGap(m.kind))).toBe(true);
    expect(computeKitchen(moved).cabinets).toHaveLength(computeKitchen(k).cabinets.length);
  });

  it('прилепва към ръба на съседа, щом е близо', () => {
    const k = twoCabinets();
    const first = k.walls[0].base[0].id;
    let moved = reducer(k, { type: 'slide', id: first, left: 2000 });
    // Вторият е на 600; първият, пуснат на 1230, прилепва до него — на 1200.
    moved = reducer(moved, { type: 'slide', id: first, left: 1230 });
    expect(Object.fromEntries(xs(moved))[first]).toBe(1200);
  });

  it('не минава през края на стената и не влиза в съсед', () => {
    const k = twoCabinets();
    const id = k.walls[0].base[1].id;
    const end = reducer(k, { type: 'slide', id, left: 9999 });
    expect(Object.fromEntries(xs(end))[id]).toBe(3000);
    // Върху първия шкаф място няма — плъзгането не минава.
    expect(slideRow(k.walls[0], 'kitchen', [], id, -300)).toBeNull();
  });

  it('пълен ред не се плъзга — там местенето е разместване', () => {
    let k = emptyKitchen(1200);
    const wallId = k.walls[0].id!;
    k = reducer(k, { type: 'add', wallId, row: 'base', kind: 'door' });
    k = reducer(k, { type: 'add', wallId, row: 'base', kind: 'door' });
    expect(slideRow(k.walls[0], 'kitchen', [], k.walls[0].base[0].id, 600)).toBeNull();
  });

  it('всяка стая има с какво да пълни празното долу', () => {
    for (const room of ['kitchen', 'bedroom', 'living', 'bath', 'corridor', 'hall'] as const) {
      expect(gapKindFor(room, 'base'), room).not.toBeNull();
    }
  });

  it('точка от стената се намира в стаята за всяка страна', () => {
    const room = { width: 4000, depth: 3000 };
    expect(wallPoint(room, 'top', 100, 50, 0)).toEqual({ x: 100, y: 0, z: 50 });
    expect(wallPoint(room, 'right', 100, 50, 0)).toEqual({ x: 3950, y: 0, z: 100 });
    expect(wallPoint(room, 'bottom', 100, 50, 0)).toEqual({ x: 3900, y: 0, z: 2950 });
    expect(wallPoint(room, 'left', 100, 50, 0)).toEqual({ x: 50, y: 0, z: 2900 });
  });
});
