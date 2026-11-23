import { describe, expect, it } from 'vitest';
import { emptyKitchen, kitchenRoom } from './cabinet-rules';
import { reducer } from '@/components/configurator/state';
import { fitsNoWorse, keepInside, overflowOf, roomFor, rotateInside } from './fit';
import { halfExtent } from './furnishings';

const wallOf = (k: ReturnType<typeof emptyKitchen>) => k.walls[0];

function fill(length = 1800) {
  let k = emptyKitchen(length);
  const wallId = wallOf(k).id!;
  for (let i = 0; i < 20; i++) k = reducer(k, { type: 'add', wallId, row: 'base', kind: 'door' });
  return { k, wallId };
}

describe('мебелта остава в стената', () => {
  it('редът се пълни до стената и спира — не е безкраен', () => {
    const { k } = fill(1800);
    const used = wallOf(k).base.reduce((s, m) => s + m.width, 0);
    expect(used).toBeLessThanOrEqual(1800);
    expect(wallOf(k).base.length).toBeGreaterThan(0);
    expect(overflowOf(k).get(wallOf(k).id!)!.base).toBe(0);
  });

  it('копиране и разширяване не минават през стената', () => {
    const { k } = fill(1800);
    const id = wallOf(k).base[0].id;
    expect(reducer(k, { type: 'duplicate', id })).toBe(k);
    expect(reducer(k, { type: 'width', id, value: 1200 })).toBe(k);
  });

  it('стената не се скъсява под мебелта', () => {
    const { k, wallId } = fill(1800);
    expect(reducer(k, { type: 'wallLength', wallId, value: 1200 })).toBe(k);
  });

  it('махане и стесняване минават винаги', () => {
    const { k } = fill(1800);
    const id = wallOf(k).base[0].id;
    expect(wallOf(reducer(k, { type: 'remove', id })).base.length).toBe(wallOf(k).base.length - 1);
  });

  it('препълнен отвън проект се отваря и може да се оправя', () => {
    const { k } = fill(1800);
    // Стар линк, отпреди правилото: шкафове повече от стената.
    const over = { ...k, walls: [{ ...wallOf(k), length: 1200 }] };
    const loaded = reducer(emptyKitchen(), { type: 'load', value: over });
    expect(overflowOf(loaded).get(wallOf(loaded).id!)!.base).toBeGreaterThan(0);
    // Добавяне — не; махане — да.
    expect(reducer(loaded, { type: 'add', wallId: wallOf(loaded).id!, row: 'base', kind: 'door' })).toBe(loaded);
    const fewer = reducer(loaded, { type: 'remove', id: wallOf(loaded).base[0].id });
    expect(fitsNoWorse(loaded, fewer)).toBe(true);
    expect(fewer).not.toBe(loaded);
  });

  it('знае предварително дали има място — за призрака при влачене', () => {
    const empty = emptyKitchen(1800);
    expect(roomFor(empty, 0, 'door')).toBe(true);
    const { k } = fill(1800);
    expect(roomFor(k, 0, 'door')).toBe(false);
    // Горният ред е отделен — там още има място.
    expect(roomFor(k, 0, 'upper')).toBe(true);
  });
});

describe('готовите изделия остават в стаята', () => {
  const room = kitchenRoom(emptyKitchen(3600));

  it('диван до стената се дърпа навътре, щом се завърти', () => {
    const sofa = { id: 's', kind: 'sofa' as const, x: room.width / 2, z: 500, rotation: 0 };
    const placed = keepInside(sofa, room);
    const turned = rotateInside(placed, room);
    const half = halfExtent('sofa', turned.rotation);
    expect(turned.z - half.z).toBeGreaterThanOrEqual(0);
    expect(turned.z + half.z).toBeLessThanOrEqual(room.depth);
    expect(turned.x - half.x).toBeGreaterThanOrEqual(0);
    expect(turned.x + half.x).toBeLessThanOrEqual(room.width);
  });

  it('изделие вътре не се пипа', () => {
    const chair = { id: 'c', kind: 'chair' as const, x: 1500, z: 1500, rotation: 0 };
    expect(keepInside(chair, room)).toBe(chair);
  });
});
