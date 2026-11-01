import { describe, expect, it } from 'vitest';
import { DIM, computeKitchen, emptyKitchen } from '@/lib/cabinet-rules';
import {
  type Action,
  OPENING_LIMITS,
  clampWall,
  defaultWidth,
  migrate,
  reducer,
  sampleKitchen,
} from './state';

/** Действие без посочена стена отива в първата — спестява шум в тестовете. */
type LooseAction =
  | Action
  | Omit<Extract<Action, { type: 'add' }>, 'wallId'>
  | Omit<Extract<Action, { type: 'wallLength' }>, 'wallId'>;

const run = (actions: LooseAction[], start = emptyKitchen(3600)) =>
  actions.reduce(
    (k, a) => reducer(k, 'wallId' in a ? a : ({ ...a, wallId: k.walls[0].id } as Action)),
    start,
  );

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

describe('преместване между редовете', () => {
  const start = run([
    { type: 'add', row: 'base', kind: 'door' },
    { type: 'add', row: 'base', kind: 'sink' },
    { type: 'add', row: 'upper', kind: 'upper' },
  ]);
  const baseIds = base(start).map((m) => m.id);

  it('долният шкаф се качва горе и сменя вида си', () => {
    const k = reducer(start, { type: 'moveToRow', id: baseIds[0], toIndex: 0 });
    expect(base(k)).toHaveLength(1);
    expect(upper(k).map((m) => m.kind)).toEqual(['upper', 'upper']);
    expect(upper(k)[0].id).toBe(baseIds[0]);
  });

  it('горният слиза долу', () => {
    const upperId = upper(start)[0].id;
    const k = reducer(start, { type: 'moveToRow', id: upperId, toIndex: 1 });
    expect(upper(k)).toHaveLength(0);
    expect(base(k).map((m) => m.kind)).toEqual(['door', 'door', 'sink']);
    expect(base(k)[1].id).toBe(upperId);
  });

  it('мивката остава на мястото си', () => {
    const k = reducer(start, { type: 'moveToRow', id: baseIds[1], toIndex: 0 });
    expect(base(k).map((m) => m.id)).toEqual(baseIds);
    expect(upper(k)).toHaveLength(1);
  });

  it('индексът се ограничава в целевия ред', () => {
    const k = reducer(start, { type: 'moveToRow', id: baseIds[0], toIndex: 99 });
    expect(upper(k)).toHaveLength(2);
    expect(upper(k)[1].id).toBe(baseIds[0]);
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

describe('стените на стаята', () => {
  const two = () => {
    const k = run([{ type: 'addWall' }]);
    return { k, first: k.walls[0].id!, second: k.walls[1].id! };
  };

  it('новата стена заема следващата свободна страна и е дълга колкото нея', () => {
    const { k } = two();
    expect(k.walls.map((w) => w.side)).toEqual(['top', 'right']);
    expect(k.walls[1].length).toBe(clampWall(k.room!.depth));
  });

  it('не се добавя пета стена', () => {
    let k = run([{ type: 'addWall' }, { type: 'addWall' }, { type: 'addWall' }]);
    expect(k.walls).toHaveLength(4);
    k = reducer(k, { type: 'addWall' });
    expect(k.walls).toHaveLength(4);
  });

  it('добавянето на модул пипа само посочената стена', () => {
    const { k, second } = two();
    const after = reducer(k, { type: 'add', wallId: second, row: 'base', kind: 'door' });
    expect(after.walls[0].base).toHaveLength(0);
    expect(after.walls[1].base).toHaveLength(1);
  });

  it('редакцията намира стената по модула, без да ѝ се казва', () => {
    const { k, second } = two();
    const added = reducer(k, { type: 'add', wallId: second, row: 'base', kind: 'door' });
    const id = added.walls[1].base[0].id;
    const wider = reducer(added, { type: 'width', id, value: 900 });
    expect(wider.walls[1].base[0].width).toBe(900);
    expect(wider.walls[0].base).toHaveLength(0);
  });

  it('номерацията тече през стените', () => {
    const { k, first, second } = two();
    const filled = (
      [
        { type: 'add', wallId: first, row: 'base', kind: 'door' },
        { type: 'add', wallId: first, row: 'base', kind: 'sink' },
        { type: 'add', wallId: second, row: 'base', kind: 'drawers' },
        { type: 'add', wallId: second, row: 'upper', kind: 'upper' },
      ] satisfies Action[]
    ).reduce(reducer, k);

    const r = computeKitchen(filled);
    expect(r.placed[0].base.map((m) => m.code)).toEqual(['Д1', 'Д2']);
    expect(r.placed[1].base.map((m) => m.code)).toEqual(['Д3']);
    expect(r.placed[1].upper.map((m) => m.code)).toEqual(['Г1']);
    expect(r.cabinets.map((c) => c.code)).toEqual(['Д1', 'Д2', 'Д3', 'Г1']);
  });

  it('премахва стена, но не и последната', () => {
    const { k, second } = two();
    const one = reducer(k, { type: 'removeWall', wallId: second });
    expect(one.walls).toHaveLength(1);
    expect(reducer(one, { type: 'removeWall', wallId: one.walls[0].id! }).walls).toHaveLength(1);
  });
});

describe('врати и прозорци', () => {
  const withDoor = () => {
    const k = run([]);
    const id = k.walls[0].id!;
    return reducer(k, { type: 'addOpening', wallId: id, kind: 'door' });
  };

  it('вратата влиза със стандартните си размери', () => {
    const o = withDoor().walls[0].openings![0];
    expect(o).toMatchObject({ kind: 'door', x: 0, width: 900, bottom: 0, height: 2000 });
  });

  it('вторият отвор застава след първия, не върху него', () => {
    const k = withDoor();
    const after = reducer(k, { type: 'addOpening', wallId: k.walls[0].id!, kind: 'window' });
    const [first, second] = after.walls[0].openings!;
    expect(second.x).toBeGreaterThanOrEqual(first.x + first.width);
    expect(second).toMatchObject({ kind: 'window', bottom: 900 });
  });

  it('размерите се вкарват в стената', () => {
    const k = withDoor();
    const id = k.walls[0].openings![0].id;
    const wide = reducer(k, { type: 'opening', id, value: { width: 99_999 } });
    expect(wide.walls[0].openings![0].width).toBe(k.walls[0].length);

    const far = reducer(k, { type: 'opening', id, value: { x: 99_999 } });
    expect(far.walls[0].openings![0].x).toBe(k.walls[0].length - 900);

    const tall = reducer(k, { type: 'opening', id, value: { height: 99_999 } });
    expect(tall.walls[0].openings![0].height).toBe(OPENING_LIMITS.maxHeight);
  });

  it('отворът се маха по свой идентификатор, без да се казва коя стена', () => {
    const k = withDoor();
    const id = k.walls[0].openings![0].id;
    expect(reducer(k, { type: 'removeOpening', id }).walls[0].openings).toEqual([]);
  });

  it('горният ред заобикаля прозореца', () => {
    let k = run([
      { type: 'add', row: 'upper', kind: 'upper' },
      { type: 'add', row: 'upper', kind: 'upper' },
    ]);
    k = reducer(k, { type: 'addOpening', wallId: k.walls[0].id!, kind: 'window' });
    const id = k.walls[0].openings![0].id;
    k = reducer(k, { type: 'opening', id, value: { x: 600 } });

    const placed = computeKitchen(k).placed[0].upper;
    // Първият се събира преди прозореца, вторият минава след него.
    expect(placed.map((m) => m.x)).toEqual([0, 1800]);
  });
});

describe('размерите на стаята', () => {
  it('се сменят поотделно и се закръглят на стъпката', () => {
    const k = run([
      { type: 'room', value: { width: 5234 } },
      { type: 'room', value: { depth: 2777 } },
    ]);
    expect(k.room).toEqual({ width: 5230, depth: 2780 });
  });

  it('не излизат от границите', () => {
    const k = run([{ type: 'room', value: { width: 99_999, depth: 10 } }]);
    expect(k.room).toEqual({ width: 12_000, depth: 1200 });
  });
});

describe('стара конфигурация', () => {
  const old = {
    walls: [{ length: 3600, base: [], upper: [] }],
    materials: emptyKitchen().materials,
    rulesVersion: '',
  };

  it('получава страна, идентификатор и стая, в която се събира', () => {
    const k = migrate(old);
    expect(k.walls[0].side).toBe('top');
    expect(k.walls[0].id).toBe('wall-1');
    expect(k.room!.width).toBeGreaterThanOrEqual(3600);
    expect(k.rulesVersion).toBeTruthy();
  });

  it('минава и през „зареди", за да работят старите линкове', () => {
    const k = reducer(emptyKitchen(), { type: 'load', value: old });
    expect(k.walls[0].id).toBe('wall-1');
  });
});
