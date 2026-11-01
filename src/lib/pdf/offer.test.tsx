import { describe, expect, it } from 'vitest';
import { DEFAULT_MATERIALS, type Kitchen, type ModuleKind, computeKitchen } from '@/lib/cabinet-rules';
import { DISCLAIMER, offerFileName, renderOffer } from './offer';

function exampleKitchen(): Kitchen {
  let n = 0;
  const m = (kind: ModuleKind, width: number) => ({
    id: `m${++n}`,
    kind,
    width,
    hingeSide: 'right' as const,
  });
  return {
    walls: [
      {
        length: 3600,
        base: [
          m('column', 600),
          m('drawers', 600),
          m('oven', 600),
          m('door', 400),
          m('sink', 800),
          m('dw', 600),
        ],
        upper: [m('upper', 600), m('hood', 600), m('upper', 400), m('upper', 800), m('upper', 600)],
      },
    ],
    materials: { ...DEFAULT_MATERIALS },
    rulesVersion: '1.0.0',
  };
}

describe('PDF за клиента', () => {
  it('излиза истински PDF', async () => {
    const kitchen = exampleKitchen();
    const pdf = await renderOffer(kitchen, computeKitchen(kitchen));
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(8_000);
  }, 60_000);

  it('минава и за празна кухня, и за надвишен ред', async () => {
    const empty: Kitchen = {
      walls: [{ length: 2400, base: [], upper: [] }],
      materials: { ...DEFAULT_MATERIALS },
      rulesVersion: '1.0.0',
    };
    expect((await renderOffer(empty, computeKitchen(empty))).length).toBeGreaterThan(1_000);

    const over = exampleKitchen();
    over.walls[0].length = 1200;
    expect((await renderOffer(over, computeKitchen(over))).length).toBeGreaterThan(1_000);
  }, 60_000);

  it('дисклеймърът е по спецификацията', () => {
    expect(DISCLAIMER).toBe('Това не е оферта. Точната цена следва след измерване на място.');
  });

  it('името на файла носи датата', () => {
    expect(offerFileName(new Date('2026-11-01T10:00:00Z'))).toBe(
      'korpus-konfiguraciya-2026-11-01.pdf',
    );
  });
});
