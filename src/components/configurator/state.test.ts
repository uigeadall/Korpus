import { describe, expect, it } from 'vitest';
import {
  DIM,
  DOOR,
  MODULES,
  WINDOW,
  computeKitchen,
  emptyKitchen,
  kitchenDoor,
  kitchenRoom,
  kitchenWindows,
} from '@/lib/cabinet-rules';
import {
  type Action,
  HISTORY_LIMIT,
  canRedo,
  canUndo,
  clampWall,
  defaultWidth,
  historyReducer,
  initHistory,
  migrate,
  reducer,
  sampleKitchen,
} from './state';

/** Действие без посочена стена отива в първата — спестява шум в тестовете. */
type LooseAction =
  | Action
  | Omit<Extract<Action, { type: 'add' }>, 'wallId'>
  | Omit<Extract<Action, { type: 'wallLength' }>, 'wallId'>
  | Omit<Extract<Action, { type: 'fill' }>, 'wallId'>;

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
  it('вратата се мести по стените и остава в зида', () => {
    const k = run([]);
    const moved = reducer(k, { type: 'door', value: { side: 'left', x: 99_999 } });
    const d = kitchenDoor(moved);
    expect(d.side).toBe('left');
    expect(d.x + d.width).toBeLessThanOrEqual(kitchenRoom(moved).depth);
  });

  it('ширината и височината на вратата се вкарват в допустимото', () => {
    const k = run([]);
    expect(kitchenDoor(reducer(k, { type: 'door', value: { width: 99_999 } })).width).toBe(
      DOOR.MAX_WIDTH,
    );
    expect(kitchenDoor(reducer(k, { type: 'door', value: { height: 1 } })).height).toBe(
      DOOR.MIN_HEIGHT,
    );
  });

  it('нов прозорец влиза с парапет и стои на стена без друг', () => {
    const one = reducer(run([]), { type: 'addWindow' });
    const windows = kitchenWindows(one);
    expect(windows).toHaveLength(1);
    expect(windows[0].sill).toBeGreaterThan(0);

    const two = kitchenWindows(reducer(one, { type: 'addWindow' }));
    expect(two).toHaveLength(2);
    expect(two[1].side).not.toBe(two[0].side);
  });

  it('повече прозорци от разумното не влизат', () => {
    let k = run([]);
    for (let i = 0; i < WINDOW.MAX_COUNT + 3; i++) k = reducer(k, { type: 'addWindow' });
    expect(kitchenWindows(k)).toHaveLength(WINDOW.MAX_COUNT);
  });

  it('размерите на прозореца се вкарват в стената', () => {
    const k = reducer(run([]), { type: 'addWindow' });
    const id = kitchenWindows(k)[0].id;
    const wide = reducer(k, { type: 'window', id, value: { width: 99_999 } });
    const w = kitchenWindows(wide)[0];
    expect(w.x + w.width).toBeLessThanOrEqual(
      w.side === 'top' || w.side === 'bottom'
        ? kitchenRoom(wide).width
        : kitchenRoom(wide).depth,
    );
    expect(kitchenWindows(reducer(k, { type: 'window', id, value: { sill: 99_999 } }))[0].sill).toBe(
      WINDOW.MAX_SILL,
    );
  });

  it('прозорецът се маха по свой идентификатор', () => {
    const k = reducer(run([]), { type: 'addWindow' });
    const id = kitchenWindows(k)[0].id;
    expect(kitchenWindows(reducer(k, { type: 'removeWindow', id }))).toEqual([]);
  });

  it('горният ред заобикаля прозорец на стаята', () => {
    let k = run([
      { type: 'add', row: 'upper', kind: 'upper' },
      { type: 'add', row: 'upper', kind: 'upper' },
    ]);
    k = reducer(k, { type: 'addWindow' });
    const id = kitchenWindows(k)[0].id;
    k = reducer(k, { type: 'window', id, value: { side: 'top', x: 600, width: 1200 } });

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

/* --- Редактиране там, където гледаш -------------------------------- */

describe('вмъкване след избрания', () => {
  it('новият модул застава веднага след посочения, не накрая', () => {
    const k = run([
      { type: 'add', row: 'base', kind: 'column' },
      { type: 'add', row: 'base', kind: 'sink' },
      { type: 'add', row: 'base', kind: 'dw' },
    ]);
    const first = base(k)[0].id;
    const after = reducer(k, {
      type: 'add',
      wallId: k.walls[0].id!,
      row: 'base',
      kind: 'drawers',
      afterId: first,
    });
    expect(base(after).map((m) => m.kind)).toEqual(['column', 'drawers', 'sink', 'dw']);
  });

  it('без посочен модул си остава най-отзад', () => {
    const k = run([
      { type: 'add', row: 'base', kind: 'column' },
      { type: 'add', row: 'base', kind: 'sink' },
    ]);
    expect(base(k).map((m) => m.kind)).toEqual(['column', 'sink']);
  });

  it('посоченият модул от другия ред не мести новия в него', () => {
    const k = run([
      { type: 'add', row: 'base', kind: 'sink' },
      { type: 'add', row: 'upper', kind: 'upper' },
    ]);
    const upperId = upper(k)[0].id;
    const after = reducer(k, {
      type: 'add',
      wallId: k.walls[0].id!,
      row: 'base',
      kind: 'door',
      afterId: upperId,
    });
    expect(base(after).map((m) => m.kind)).toEqual(['sink', 'door']);
    expect(upper(after)).toHaveLength(1);
  });
});

describe('дублиране', () => {
  it('прави копие веднага вдясно, със същата ширина и панти', () => {
    const k = run([
      { type: 'add', row: 'upper', kind: 'upper' },
      { type: 'add', row: 'upper', kind: 'hood' },
    ]);
    const id = upper(k)[0].id;
    const after = reducer(reducer(k, { type: 'width', id, value: 900 }), {
      type: 'duplicate',
      id,
    });
    expect(upper(after).map((m) => m.kind)).toEqual(['upper', 'upper', 'hood']);
    expect(upper(after)[1].width).toBe(900);
    expect(upper(after)[1].id).not.toBe(id);
  });

  it('непознат модул не променя нищо', () => {
    const k = run([{ type: 'add', row: 'base', kind: 'sink' }]);
    expect(reducer(k, { type: 'duplicate', id: 'няма такъв' })).toBe(k);
  });
});

describe('стъпка на ширината', () => {
  it('минава през позволените ширини нагоре и надолу', () => {
    const k = run([{ type: 'add', row: 'base', kind: 'door' }]);
    const id = base(k)[0].id;
    expect(base(k)[0].width).toBe(600);
    const wider = reducer(k, { type: 'nudgeWidth', id, dir: 1 });
    expect(base(wider)[0].width).toBe(800);
    const back = reducer(wider, { type: 'nudgeWidth', id, dir: -1 });
    expect(base(back)[0].width).toBe(600);
  });

  it('спира в краищата на каталога', () => {
    const k = run([{ type: 'add', row: 'base', kind: 'door' }]);
    const id = base(k)[0].id;
    let wide = k;
    for (let i = 0; i < 10; i++) wide = reducer(wide, { type: 'nudgeWidth', id, dir: 1 });
    expect(base(wide)[0].width).toBe(900);
    let narrow = k;
    for (let i = 0; i < 10; i++) narrow = reducer(narrow, { type: 'nudgeWidth', id, dir: -1 });
    expect(base(narrow)[0].width).toBe(300);
  });
});

describe('запълване на остатъка', () => {
  it('застила свободното с възможно най-малко шкафове', () => {
    // 3600 стена, зает 1200 → остават 2400 = 900 + 900 + 600
    const k = run([
      { type: 'add', row: 'base', kind: 'sink' },
      { type: 'add', row: 'base', kind: 'door' },
    ]);
    expect(computeKitchen(k).rowStatus[0].base.diff).toBe(2400);
    const filled = reducer(k, { type: 'fill', wallId: k.walls[0].id!, row: 'base' });
    const status = computeKitchen(filled).rowStatus[0].base;
    expect(status.state).toBe('exact');
    expect(base(filled)).toHaveLength(5);
  });

  it('ляга точно и когато най-широкото първо не би стигнало', () => {
    // 3650 се покрива точно с 800 + 800 + 800 + 800 + 450. Лакомият избор
    // би взел 900 три пъти и би оставил дупка.
    const k = run([{ type: 'wallLength', value: 3650 }]);
    const filled = reducer(k, { type: 'fill', wallId: k.walls[0].id!, row: 'base' });
    expect(computeKitchen(filled).rowStatus[0].base.state).toBe('exact');
  });

  it('оставя остатък, който никой шкаф не покрива', () => {
    // Ширините са кратни на 50; 3630 не е, затова 30 мм остават.
    const k = run([{ type: 'wallLength', value: 3630 }]);
    const filled = reducer(k, { type: 'fill', wallId: k.walls[0].id!, row: 'base' });
    const status = computeKitchen(filled).rowStatus[0].base;
    expect(status.state).toBe('left');
    expect(status.diff).toBe(30);
  });

  it('не прави нищо, когато редът вече е пълен или прелива', () => {
    const k = run([{ type: 'fill', row: 'base' }]);
    const again = reducer(k, { type: 'fill', wallId: k.walls[0].id!, row: 'base' });
    expect(again).toBe(k);
  });

  it('горният ред се пълни с горни шкафове', () => {
    const k = run([{ type: 'fill', row: 'upper' }]);
    expect(upper(k).every((m) => m.kind === 'upper')).toBe(true);
    expect(upper(k).length).toBeGreaterThan(0);
  });
});

describe('връщане назад', () => {
  const start = () => initHistory(emptyKitchen(3600));

  it('връща последната промяна и я пуска напред пак', () => {
    const wallId = start().present.walls[0].id!;
    const added = historyReducer(start(), { type: 'add', wallId, row: 'base', kind: 'sink' });
    expect(added.present.walls[0].base).toHaveLength(1);

    const undone = historyReducer(added, { type: 'undo' });
    expect(undone.present.walls[0].base).toHaveLength(0);
    expect(canRedo(undone)).toBe(true);

    const redone = historyReducer(undone, { type: 'redo' });
    expect(redone.present.walls[0].base).toHaveLength(1);
  });

  it('в началото няма какво да се връща', () => {
    expect(canUndo(start())).toBe(false);
    expect(historyReducer(start(), { type: 'undo' })).toEqual(start());
  });

  it('нова промяна след връщане изтрива напредването', () => {
    const wallId = start().present.walls[0].id!;
    const added = historyReducer(start(), { type: 'add', wallId, row: 'base', kind: 'sink' });
    const undone = historyReducer(added, { type: 'undo' });
    const other = historyReducer(undone, { type: 'add', wallId, row: 'base', kind: 'door' });
    expect(canRedo(other)).toBe(false);
    expect(other.present.walls[0].base[0].kind).toBe('door');
  });

  it('влаченето на стената не залива историята — слива се в една стъпка', () => {
    const wallId = start().present.walls[0].id!;
    let h = start();
    for (const value of [3610, 3620, 3630, 3700]) {
      h = historyReducer(h, { type: 'wallLength', wallId, value });
    }
    expect(h.present.walls[0].length).toBe(3700);
    expect(historyReducer(h, { type: 'undo' }).present.walls[0].length).toBe(3600);
  });

  it('различни действия помежду им спират сливането', () => {
    const wallId = start().present.walls[0].id!;
    let h = historyReducer(start(), { type: 'wallLength', wallId, value: 3000 });
    h = historyReducer(h, { type: 'add', wallId, row: 'base', kind: 'sink' });
    h = historyReducer(h, { type: 'wallLength', wallId, value: 2500 });
    expect(historyReducer(h, { type: 'undo' }).present.walls[0].length).toBe(3000);
  });

  it('действие, което не променя нищо, не влиза в историята', () => {
    const h = historyReducer(start(), { type: 'remove', id: 'няма такъв' });
    expect(canUndo(h)).toBe(false);
  });

  it('„изчисти всичко" се връща — иначе е капан', () => {
    const wallId = start().present.walls[0].id!;
    const added = historyReducer(start(), { type: 'add', wallId, row: 'base', kind: 'sink' });
    const cleared = historyReducer(added, { type: 'reset' });
    expect(cleared.present.walls[0].base).toHaveLength(0);
    expect(historyReducer(cleared, { type: 'undo' }).present.walls[0].base).toHaveLength(1);
  });

  it('зареждане отвън започва на чисто — няма към какво да се връща', () => {
    const wallId = start().present.walls[0].id!;
    const added = historyReducer(start(), { type: 'add', wallId, row: 'base', kind: 'sink' });
    const loaded = historyReducer(added, { type: 'load', value: sampleKitchen() });
    expect(canUndo(loaded)).toBe(false);
    expect(canRedo(loaded)).toBe(false);
    expect(loaded.present.walls[0].base).toHaveLength(6);
  });

  it('историята не расте без край', () => {
    const wallId = start().present.walls[0].id!;
    let h = start();
    for (let i = 0; i < HISTORY_LIMIT + 20; i++) {
      h = historyReducer(h, { type: 'add', wallId, row: 'base', kind: 'door' });
    }
    expect(h.past).toHaveLength(HISTORY_LIMIT);
  });
});

describe('рафтове от обемния изглед', () => {
  it('задава брой и го стига до разкроя', () => {
    const k = run([{ type: 'add', row: 'base', kind: 'door' }]);
    const id = base(k)[0].id;
    const four = reducer(k, { type: 'shelves', id, value: 4 });
    expect(base(four)[0].shelves).toBe(4);
    const cut = (x: typeof k) =>
      computeKitchen(x).parts.filter((p) => /рафт/i.test(p.name)).length;
    expect(cut(four)).toBe(cut(k) + 3);
  });

  it('не приема безсмислени числа', () => {
    const k = run([{ type: 'add', row: 'base', kind: 'door' }]);
    const id = base(k)[0].id;
    expect(base(reducer(k, { type: 'shelves', id, value: -5 }))[0].shelves).toBe(0);
    expect(base(reducer(k, { type: 'shelves', id, value: 999 }))[0].shelves).toBe(10);
  });

  it('поредните промени се сливат в една стъпка назад', () => {
    const start = initHistory(run([{ type: 'add', row: 'base', kind: 'door' }]));
    const id = start.present.walls[0].base[0].id;
    let h = start;
    for (const value of [1, 2, 3]) h = historyReducer(h, { type: 'shelves', id, value });
    expect(h.present.walls[0].base[0].shelves).toBe(3);
    expect(historyReducer(h, { type: 'undo' }).present.walls[0].base[0].shelves).toBeUndefined();
  });
});

/** Стена с три модула, увита в история — за груповите действия. */
function initFlatless() {
  const start = run([
    { type: 'add', row: 'base', kind: 'door' },
    { type: 'add', row: 'base', kind: 'drawers' },
    { type: 'add', row: 'base', kind: 'sink' },
  ]);
  return initHistory(start);
}

describe('няколко модула наведнъж', () => {
  const three = () =>
    run([
      { type: 'add', row: 'base', kind: 'door' },
      { type: 'add', row: 'base', kind: 'drawers' },
      { type: 'add', row: 'base', kind: 'sink' },
    ]);
  const ids = (k: ReturnType<typeof three>) => k.walls[0].base.map((m) => m.id);

  it('махането на няколко е една стъпка назад, не три', () => {
    let h = initFlatless();
    const [a, b] = ids(h.present);
    h = historyReducer(h, { type: 'removeMany', ids: [a, b] });
    expect(h.present.walls[0].base).toHaveLength(1);
    h = historyReducer(h, { type: 'undo' });
    expect(h.present.walls[0].base).toHaveLength(3);
  });

  it('ширината се мени на всички и се закръгля до каталожната', () => {
    const k = three();
    const [a, b] = ids(k);
    const after = reducer(k, { type: 'widthMany', ids: [a, b], value: 613 });
    const widths = after.walls[0].base.map((m) => m.width);
    expect(widths[0]).toBe(600);
    expect(widths[1]).toBe(600);
    // Третият не е пипан.
    expect(widths[2]).toBe(k.walls[0].base[2].width);
  });

  it('всеки вид получава своята най-близка ширина, не чуждата', () => {
    const k = run([
      { type: 'add', row: 'base', kind: 'door' },
      { type: 'add', row: 'base', kind: 'sink' },
    ]);
    const after = reducer(k, { type: 'widthMany', ids: ids(k), value: 5000 });
    for (const m of after.walls[0].base) {
      expect(MODULES[m.kind].widths, m.kind).toContain(m.width);
    }
  });

  it('копията застават след своите, без да разместват другите', () => {
    const k = three();
    const [a, , c] = ids(k);
    const after = reducer(k, { type: 'duplicateMany', ids: [a, c] });
    expect(after.walls[0].base.map((m) => m.kind)).toEqual([
      'door',
      'door',
      'drawers',
      'sink',
      'sink',
    ]);
  });

  it('непознати идентификатори не менят нищо', () => {
    const k = three();
    expect(reducer(k, { type: 'removeMany', ids: ['няма', 'и такъв'] })).toBe(k);
    expect(reducer(k, { type: 'duplicateMany', ids: [] })).toBe(k);
  });

  it('едно дръпване на ширината е една стъпка назад', () => {
    let h = initFlatless();
    const all = ids(h.present);
    const before = h.past.length;
    for (const w of [500, 550, 600, 650]) {
      h = historyReducer(h, { type: 'widthMany', ids: all, value: w });
    }
    expect(h.past.length).toBe(before + 1);
  });
});
