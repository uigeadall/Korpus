import { describe, expect, it } from 'vitest';
import { DIM, computeKitchen, emptyKitchen } from '@/lib/cabinet-rules';
import { type Action, clampWall, defaultWidth, reducer, sampleKitchen } from './state';

const run = (actions: Action[], start = emptyKitchen(3600)) =>
  actions.reduce(reducer, start);

const base = (k = run([])) => k.walls[0].base;
const upper = (k = run([])) => k.walls[0].upper;

describe('дължина на стената', () => {
  it('се закръгля на стъпка 10 и не излиза от диапазона', () => {
    expect(clampWall(3604)).toBe(3600);
    expect(clampWall(3606)).toBe(3610);
    expect(clampWall(100)).toBe(DIM.WALL_MIN);
    expect(clampWall(99999)).toBe(DIM.WALL_MAX);
  });

  it('редукторът пази диапазона', () => {
    const k = run([{ type: 'wallLength', value: 50_000 }]);
    expect(k.walls[0].length).toBe(DIM.WALL_MAX);
  });
});

describe('добавяне', () => {
  it('долните отиват в долния ред, горните в горния', () => {
    const k = run([
      { type: 'add', row: 'base', kind: 'door' },
      { type: 'add', row: 'upper', kind: 'upper' },
    ]);
    expect(base(k)).toHaveLength(1);
    expect(upper(k)).toHaveLength(1);
  });

  it('редът се взема от модула, не от подадения ред', () => {
    const k = run([{ type: 'add', row: 'base', kind: 'hood' }]);
    expect(base(k)).toHaveLength(0);
    expect(upper(k)).toHaveLength(1);
  });

  it('ширината по подразбиране е от каталога на модула', () => {
    expect(defaultWidth('oven')).toBe(600);
    expect(defaultWidth('ugap')).toBe(600);
    const k = run([{ type: 'add', row: 'base', kind: 'sink' }]);
    expect(base(k)[0].width).toBe(600);
  });

  it('всеки модул получава собствен id', () => {
    const k = run([
      { type: 'add', row: 'base', kind: 'door' },
      { type: 'add', row: 'base', kind: 'door' },
    ]);
    expect(base(k)[0].id).not.toBe(base(k)[1].id);
  });
});

describe('редакция', () => {
  const start = run([
    { type: 'add', row: 'base', kind: 'door' },
    { type: 'add', row: 'base', kind: 'drawers' },
    { type: 'add', row: 'base', kind: 'sink' },
  ]);
  const ids = base(start).map((m) => m.id);

  it('сменя ширината', () => {
    const k = reducer(start, { type: 'width', id: ids[0], value: 900 });
    expect(base(k)[0].width).toBe(900);
  });

  it('сменя страната на пантите', () => {
    const k = reducer(start, { type: 'hinge', id: ids[0], value: 'left' });
    expect(base(k)[0].hingeSide).toBe('left');
  });

  it('мести наляво и надясно', () => {
    const right = reducer(start, { type: 'move', id: ids[0], dir: 1 });
    expect(base(right).map((m) => m.id)).toEqual([ids[1], ids[0], ids[2]]);

    const left = reducer(right, { type: 'move', id: ids[0], dir: -1 });
    expect(base(left).map((m) => m.id)).toEqual(ids);
  });

  it('не мести извън реда', () => {
    const k = reducer(start, { type: 'move', id: ids[0], dir: -1 });
    expect(base(k).map((m) => m.id)).toEqual(ids);
  });

  it('премахва', () => {
    const k = reducer(start, { type: 'remove', id: ids[1] });
    expect(base(k).map((m) => m.id)).toEqual([ids[0], ids[2]]);
  });

  it('не пипа оригинала', () => {
    reducer(start, { type: 'remove', id: ids[0] });
    expect(base(start)).toHaveLength(3);
  });
});

describe('преподреждане', () => {
  const start = run([
    { type: 'add', row: 'base', kind: 'door' },
    { type: 'add', row: 'base', kind: 'drawers' },
    { type: 'add', row: 'base', kind: 'sink' },
  ]);
  const ids = base(start).map((m) => m.id);

  it('мести на произволна позиция', () => {
    const k = reducer(start, { type: 'reorder', id: ids[0], toIndex: 2 });
    expect(base(k).map((m) => m.id)).toEqual([ids[1], ids[2], ids[0]]);
  });

  it('мести назад', () => {
    const k = reducer(start, { type: 'reorder', id: ids[2], toIndex: 0 });
    expect(base(k).map((m) => m.id)).toEqual([ids[2], ids[0], ids[1]]);
  });

  it('ограничава индекса в реда', () => {
    const k = reducer(start, { type: 'reorder', id: ids[0], toIndex: 99 });
    expect(base(k).map((m) => m.id)).toEqual([ids[1], ids[2], ids[0]]);
    const k2 = reducer(start, { type: 'reorder', id: ids[2], toIndex: -5 });
    expect(base(k2).map((m) => m.id)).toEqual([ids[2], ids[0], ids[1]]);
  });

  it('на същото място не прави нищо', () => {
    const k = reducer(start, { type: 'reorder', id: ids[1], toIndex: 1 });
    expect(base(k).map((m) => m.id)).toEqual(ids);
  });

  it('не бърка двата реда', () => {
    const k = run([{ type: 'add', row: 'upper', kind: 'upper' }], start);
    const upperId = upper(k)[0].id;
    const moved = reducer(k, { type: 'reorder', id: upperId, toIndex: 0 });
    expect(base(moved).map((m) => m.id)).toEqual(ids);
    expect(upper(moved)).toHaveLength(1);
  });
});

describe('материали', () => {
  it('се сливат частично', () => {
    const k = run([{ type: 'materials', value: { worktop: 'quartz20' } }]);
    expect(k.materials.worktop).toBe('quartz20');
    expect(k.materials.drawers).toBe('metal-box');
  });
});

describe('примерната кухня', () => {
  const k = sampleKitchen();

  it('е с фиксирани id, за да няма разминаване при hydration', () => {
    expect(sampleKitchen().walls[0].base[0].id).toBe(k.walls[0].base[0].id);
  });

  it('дава контролните стойности от спецификацията', () => {
    const r = computeKitchen(k);
    const hw = (n: string) => r.hardware.find((h) => h.name === n)?.qty;
    expect(hw('Панти с плавно затваряне')).toBe(22);
    expect(hw('Крака')).toBe(22);
    expect(r.rowStatus[0].base.state).toBe('exact');
  });
});

describe('изчистване', () => {
  it('пази дължината на стената', () => {
    const k = run([
      { type: 'wallLength', value: 2400 },
      { type: 'add', row: 'base', kind: 'door' },
      { type: 'reset' },
    ]);
    expect(k.walls[0].length).toBe(2400);
    expect(base(k)).toHaveLength(0);
  });
});
