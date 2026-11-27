import { describe, expect, it } from 'vitest';
import { DEFAULT_ROOM_NEEDS, layoutFor } from '@/lib/autolayout';
import { type RoomKind, emptyKitchen } from '@/lib/cabinet-rules';
import { type Flat, defaultFlat } from '@/lib/flat';
import { flatBreakdown } from '@/lib/flat-export';
import { encodeProject } from '@/lib/share';
import { flatFileName, renderFlat } from './flat';

function обзаведено(колко = 3): Flat {
  const f = defaultFlat();
  return {
    rooms: f.rooms.map((r, i) => {
      if (i >= колко || r.kind === 'other') return r;
      const k = emptyKitchen(3600);
      k.roomKind = r.kind as RoomKind;
      const l = layoutFor(k.roomKind, 3600, DEFAULT_ROOM_NEEDS);
      k.walls[0] = { ...k.walls[0], base: l.base, upper: l.upper };
      return { ...r, project: encodeProject(k) };
    }),
  };
}

describe('PDF за цялото жилище', () => {
  it('излиза истински PDF за шест стаи', async () => {
    const pdf = await renderFlat(flatBreakdown(обзаведено(6)));
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    // Корица плюс по страница на стена — повече от офертата за една стая.
    expect(pdf.length).toBeGreaterThan(20_000);
  }, 120_000);

  it('минава и за едничка стая', async () => {
    const pdf = await renderFlat(flatBreakdown(обзаведено(1)));
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(8_000);
  }, 60_000);

  it('нечетима стая не спира файла — влиза като предупреждение', async () => {
    const flat = обзаведено(3);
    flat.rooms[1] = { ...flat.rooms[1], project: 'това-не-е-запис' };
    const b = flatBreakdown(flat);
    expect(b.broken).toHaveLength(1);

    const pdf = await renderFlat(b);
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  }, 60_000);

  it('името на файла носи датата', () => {
    expect(flatFileName(new Date('2026-11-27T10:00:00Z'))).toBe('korpus-jilishte-2026-11-27.pdf');
  });
});
