import { describe, expect, it } from 'vitest';
import { DIM, RULES_VERSION } from './cabinet-rules';
import { LIMITS, parseKitchen } from './kitchen-schema';

const valid = {
  walls: [
    {
      length: 3600,
      base: [
        { id: 'a', kind: 'door', width: 600, hingeSide: 'left' },
        { id: 'b', kind: 'sink', width: 800 },
      ],
      upper: [{ id: 'c', kind: 'upper', width: 600 }],
    },
  ],
  materials: {
    carcassColor: 'Антрацит',
    facade: { type: 'pdch-decor', color: 'Дъб' },
    worktop: 'quartz20',
    opening: 'push',
    drawers: 'ball-bearing',
  },
  rulesVersion: '0.0.1',
};

function ok(input: unknown) {
  const r = parseKitchen(input);
  if (!r.ok) throw new Error(`очаквах да мине, но: ${r.error}`);
  return r.kitchen;
}

function err(input: unknown): string {
  const r = parseKitchen(input);
  if (r.ok) throw new Error('очаквах отказ');
  return r.error;
}

describe('приема валидна конфигурация', () => {
  const k = ok(valid);

  it('пази стените и модулите', () => {
    expect(k.walls[0].length).toBe(3600);
    expect(k.walls[0].base.map((m) => m.kind)).toEqual(['door', 'sink']);
    expect(k.walls[0].base[0].hingeSide).toBe('left');
  });

  it('пази материалите', () => {
    expect(k.materials.facade).toEqual({ type: 'pdch-decor', color: 'Дъб' });
    expect(k.materials.worktop).toBe('quartz20');
    expect(k.materials.opening).toBe('push');
    expect(k.materials.drawers).toBe('ball-bearing');
  });

  it('смята с текущата версия на правилата, не с подадената', () => {
    expect(k.rulesVersion).toBe(RULES_VERSION);
  });

  it('липсващ ред е празен', () => {
    const only = ok({ walls: [{ length: 2400, base: [] }] });
    expect(only.walls[0].upper).toEqual([]);
  });

  it('непознати материали падат на подразбиращите се', () => {
    const k2 = ok({ ...valid, materials: { worktop: 'мрамор', opening: 'магия' } });
    expect(k2.materials.worktop).toBe('laminate38');
    expect(k2.materials.opening).toBe('handles');
    expect(k2.materials.carcassColor).toBe('Бял');
  });
});

describe('стая и страни', () => {
  it('конфигурация отпреди стаите получава страна и стая, в която се събира', () => {
    const k = ok(valid);
    expect(k.walls[0].side).toBe('top');
    expect(k.walls[0].id).toBe('wall-1');
    expect(k.room?.width).toBeGreaterThanOrEqual(3600);
  });

  it('подадената стая минава през същите граници', () => {
    expect(ok({ ...valid, room: { width: 4234, depth: 99_999 } }).room).toEqual({
      width: 4230,
      depth: 12_000,
    });
  });

  it('стая без размери е отказ, а не мълчаливо подразбиране', () => {
    expect(err({ ...valid, room: { width: 4000 } })).toContain('без размери');
    expect(err({ ...valid, room: 'голяма' })).toContain('не е обект');
  });

  it('пази подадената страна и отказва две стени на една страна', () => {
    const k = ok({
      walls: [
        { side: 'left', length: 2400, base: [] },
        { side: 'bottom', length: 3000, base: [] },
      ],
    });
    expect(k.walls.map((w) => w.side)).toEqual(['left', 'bottom']);

    expect(
      err({
        walls: [
          { side: 'left', length: 2400, base: [] },
          { side: 'left', length: 3000, base: [] },
        ],
      }),
    ).toContain('една и съща страна');
  });

  it('чете отворите и ги вкарва в стената', () => {
    const k = ok({
      walls: [
        {
          length: 3600,
          base: [],
          openings: [
            { kind: 'window', x: 600, width: 1200, bottom: 900, height: 1400 },
            { kind: 'door', x: 99_999, width: 900 },
          ],
        },
      ],
    });
    expect(k.walls[0].openings![0]).toMatchObject({ kind: 'window', x: 600, width: 1200 });
    // Втората е избутана вътре в стената и взема височина по подразбиране.
    expect(k.walls[0].openings![1]).toMatchObject({ kind: 'door', x: 2700, height: 2000 });
  });

  it('отказва непознат отвор и прекалено много отвори', () => {
    expect(err({ walls: [{ length: 3600, openings: [{ kind: 'люк' }] }] })).toContain(
      'непознат вид',
    );
    const many = Array.from({ length: LIMITS.openingsPerWall + 1 }, () => ({ kind: 'door' }));
    expect(err({ walls: [{ length: 3600, openings: many }] })).toContain('отвора');
  });

  it('непозната страна пада на реда по часовника', () => {
    const k = ok({
      walls: [
        { side: 'таванът', length: 2400, base: [] },
        { length: 2400, base: [] },
      ],
    });
    expect(k.walls.map((w) => w.side)).toEqual(['top', 'right']);
  });
});

describe('отказва невалидна конфигурация', () => {
  it('тяло, което не е обект', () => {
    expect(err('кухня')).toContain('не е обект');
    expect(err(null)).toContain('не е обект');
  });

  it('без стени', () => {
    expect(err({ walls: [] })).toContain('липсват стени');
    expect(err({})).toContain('липсват стени');
  });

  it('непознат вид модул', () => {
    expect(err({ walls: [{ length: 2400, base: [{ kind: 'диван', width: 600 }] }] })).toContain(
      'непознат вид',
    );
  });

  it('модул в грешния ред', () => {
    expect(err({ walls: [{ length: 2400, base: [{ kind: 'upper', width: 600 }] }] })).toContain(
      'не е от долния ред',
    );
    expect(err({ walls: [{ length: 2400, upper: [{ kind: 'sink', width: 600 }] }] })).toContain(
      'не е от горния ред',
    );
  });

  it('ширина извън каталога', () => {
    expect(err({ walls: [{ length: 2400, base: [{ kind: 'door', width: 637 }] }] })).toContain(
      'не е в каталога',
    );
  });

  it('дължина извън диапазона', () => {
    expect(err({ walls: [{ length: 90_000, base: [] }] })).toContain('извън');
    expect(err({ walls: [{ length: 10, base: [] }] })).toContain('извън');
    expect(err({ walls: [{ base: [] }] })).toContain('липсва дължина');
  });

  it('прекалено много стени или модули', () => {
    const walls = Array.from({ length: LIMITS.walls + 1 }, () => ({ length: 2400, base: [] }));
    expect(err({ walls })).toContain('стени');

    const base = Array.from({ length: LIMITS.modulesPerRow + 1 }, () => ({
      kind: 'door',
      width: 600,
    }));
    expect(err({ walls: [{ length: DIM.WALL_MAX, base }] })).toContain('модула');
  });
});
