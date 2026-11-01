/**
 * Сметките върху детайлите: плочата и надписът на канта са параметри,
 * а не кухненски константи.
 */

import { describe, expect, it } from 'vitest';
import { edgeUsage, facadeArea, materialUsage, mergeParts, numberParts } from './parts';

const raw = [
  { name: 'Страница', material: 'pdch18' as const, length: 1000, width: 500, qty: 2, edgeL: 1 as const, edgeThickness: 0.8 },
  { name: 'Чело', material: 'facade' as const, length: 1000, width: 500 },
];

describe('номериране', () => {
  const parts = numberParts('Г1', 'upper', raw);

  it('тече по реда на детайлите', () => {
    expect(parts.map((p) => p.no)).toEqual(['Г1-01', 'Г1-02']);
  });

  it('смята канта по броя страни и количеството', () => {
    expect(parts[0].edgeMm).toBe(2000);
    expect(parts[1].edgeMm).toBe(0);
  });
});

describe('обединяване', () => {
  it('събира еднаквите детайли и пази номерата им', () => {
    const a = numberParts('Г1', 'upper', raw);
    const b = numberParts('Г2', 'upper', raw);
    const merged = mergeParts([...a, ...b]).find((p) => p.name === 'Страница');
    expect(merged).toMatchObject({ qty: 4, edgeMm: 4000, numbers: ['Г1-01', 'Г2-01'] });
  });
});

describe('плочи и кант', () => {
  const parts = numberParts('Г1', 'upper', raw);

  it('броят плочи зависи от подадения формат', () => {
    const big = materialUsage(parts, { length: 2800, width: 2070, waste: 0 });
    const small = materialUsage(parts, { length: 1000, width: 500, waste: 0 });
    expect(big[0].sheets).toBe(1);
    expect(small[0].sheets).toBe(2);
  });

  it('фирата влиза в площта, по която се поръчва', () => {
    const [usage] = materialUsage(parts, { length: 2800, width: 2070, waste: 0.15 });
    expect(usage.areaM2).toBe(1);
    expect(usage.areaWithWasteM2).toBe(1.15);
  });

  it('фасадите не влизат в плочите, а в площта за боядисване', () => {
    expect(materialUsage(parts, { length: 2800, width: 2070, waste: 0 })).toHaveLength(1);
    expect(facadeArea(parts)).toBe(0.5);
  });

  it('надписът на канта идва отвън', () => {
    expect(edgeUsage(parts, (t) => `кант ${t}`)).toEqual([
      { thickness: 0.8, label: 'кант 0.8', meters: 2 },
    ]);
  });
});
