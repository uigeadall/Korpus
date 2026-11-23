import { describe, expect, it } from 'vitest';
import { type Kitchen, computeKitchen, emptyKitchen } from './cabinet-rules';
import { DEFAULT_ROOM_NEEDS, layoutFor } from './autolayout';
import { PRICES } from '@/config/prices';
import { estimatePrice, formatMoney } from './price';

/** Кухня, подредена от правилата по стена с тази дължина. */
function kitchenOf(length: number, patch: Partial<Kitchen['materials']> = {}): Kitchen {
  const k = emptyKitchen(length);
  const layout = layoutFor('kitchen', length, DEFAULT_ROOM_NEEDS);
  return {
    ...k,
    walls: [{ ...k.walls[0], base: layout.base, upper: layout.upper }],
    materials: { ...k.materials, ...patch },
  };
}

const priceOf = (k: Kitchen) => estimatePrice(k, computeKitchen(k));

describe('ориентировъчната цена', () => {
  it('празната стая не струва нищо — и няма доставка', () => {
    const e = priceOf(emptyKitchen(3600));
    expect(e).toEqual({ lines: [], total: 0, low: 0, high: 0, unpriced: [] });
  });

  it('сумата е сборът на редовете, а всеки ред е количество по цена', () => {
    const e = priceOf(kitchenOf(3600));
    expect(e.lines.length).toBeGreaterThan(5);
    for (const l of e.lines) expect(l.total).toBeCloseTo(l.qty * l.unitPrice, 1);
    expect(e.total).toBeCloseTo(e.lines.reduce((s, l) => s + l.total, 0), 1);
  });

  it('диапазонът обгражда сумата и е закръглен', () => {
    const e = priceOf(kitchenOf(3600));
    expect(e.low).toBeLessThan(e.total);
    expect(e.high).toBeGreaterThan(e.total);
    expect(e.low % PRICES.roundTo).toBe(0);
    expect(e.high % PRICES.roundTo).toBe(0);
  });

  it('по-дълга кухня струва повече', () => {
    expect(priceOf(kitchenOf(4200)).total).toBeGreaterThan(priceOf(kitchenOf(3000)).total);
  });

  it('кварцов плот е по-скъп от ламиниран, с разликата на плота', () => {
    const lam = priceOf(kitchenOf(3600, { worktop: 'laminate38' }));
    const quartz = priceOf(kitchenOf(3600, { worktop: 'quartz20' }));
    const metres = computeKitchen(kitchenOf(3600)).summary.worktopLength / 1000;
    expect(quartz.total - lam.total).toBeCloseTo(
      metres * (PRICES.worktopM.quartz20 - PRICES.worktopM.laminate38),
      1,
    );
  });

  it('плотът се брои веднъж, не и като обков', () => {
    const e = priceOf(kitchenOf(3600));
    expect(e.lines.filter((l) => l.label.startsWith('Плот'))).toHaveLength(1);
  });

  it('целият обков от всички стаи има цена', () => {
    for (const room of ['kitchen', 'bedroom', 'living', 'bath', 'corridor', 'hall'] as const) {
      for (const opening of ['handles', 'push', 'alu-profile'] as const) {
        const k = emptyKitchen(3600);
        const layout = layoutFor(room, 3600, DEFAULT_ROOM_NEEDS);
        const kitchen: Kitchen = {
          ...k,
          roomKind: room,
          walls: [{ ...k.walls[0], base: layout.base, upper: layout.upper }],
          materials: { ...k.materials, opening },
        };
        expect(priceOf(kitchen).unpriced, `${room}/${opening}`).toEqual([]);
      }
    }
  });

  it('обков без цена се казва, не се пропуска тихо', () => {
    const k = kitchenOf(3600);
    const result = computeKitchen(k);
    const e = estimatePrice(k, result, { ...PRICES, hardware: {} });
    expect(e.unpriced).toContain('Панти с плавно затваряне');
  });

  it('сумите се пишат с интервал между хилядите', () => {
    expect(formatMoney(3240)).toBe('3 240');
    expect(formatMoney(980)).toBe('980');
    expect(formatMoney(12500.4)).toBe('12 500');
  });
});
