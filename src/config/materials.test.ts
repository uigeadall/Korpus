import { describe, expect, it } from 'vitest';
import { DECOR_ONLY, FACADE_COLORS, FACADE_TYPES, colorAfterType, colorsFor } from './materials';
import { isWood } from '@/lib/povarhnost';

describe('кой цвят пред кой вид фасада', () => {
  /*
   * Дървесният декор е готово фолио върху ПДЧ, а не боя. „МДФ
   * боядисан, орех" е поръчка, която цехът не може да изпълни — и
   * най-евтиното място да се спре е списъкът, от който се избира.
   */
  it('декорите ги има само на ПДЧ', () => {
    const pdch = colorsFor('pdch-decor').map((c) => c.id);
    const boya = colorsFor('mdf-painted').map((c) => c.id);
    for (const id of DECOR_ONLY) {
      expect(pdch, id).toContain(id);
      expect(boya, id).not.toContain(id);
    }
  });

  it('боите ги има навсякъде', () => {
    const boi = FACADE_COLORS.filter((c) => !DECOR_ONLY.has(c.id));
    for (const t of FACADE_TYPES) {
      const list = colorsFor(t.id).map((c) => c.id);
      for (const c of boi) expect(list, `${t.id}/${c.id}`).toContain(c.id);
    }
  });

  it('всеки вид има поне един цвят — празен списък е задънена улица', () => {
    for (const t of FACADE_TYPES) expect(colorsFor(t.id).length, t.id).toBeGreaterThan(0);
  });
});

describe('смяна на вида', () => {
  it('възможният цвят си остава', () => {
    expect(colorAfterType('pdch-decor', 'RAL 9010 чисто бяло')).toBe('RAL 9010 чисто бяло');
    expect(colorAfterType('mdf-painted', 'RAL 7016 антрацит')).toBe('RAL 7016 антрацит');
  });

  it('невъзможният се заменя, а не се оставя мълчаливо', () => {
    const sled = colorAfterType('mdf-painted', 'Орех');
    expect(sled).not.toBe('Орех');
    expect(colorsFor('mdf-painted').some((c) => c.name === sled)).toBe(true);
  });

  it('непознат цвят също получава възможен', () => {
    const sled = colorAfterType('pdch-decor', 'Няма такъв');
    expect(colorsFor('pdch-decor').some((c) => c.name === sled)).toBe(true);
  });
});

describe('каталогът и обемът си отговарят', () => {
  it('точно декорите се разпознават за дърво — иначе фладер няма да легне', () => {
    for (const c of FACADE_COLORS) {
      expect(isWood(c.name), c.name).toBe(DECOR_ONLY.has(c.id));
    }
  });
});
