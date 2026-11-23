import { describe, expect, it } from 'vitest';
import { FLAT, type Flat, defaultFlat, overlappingRooms } from '@/lib/flat';
import {
  type FlatAction,
  canRedoFlat,
  canUndoFlat,
  flatHistoryReducer,
  flatReducer,
  initFlatHistory,
} from './flatState';

const run = (actions: FlatAction[], from: Flat = { rooms: [] }): Flat =>
  actions.reduce(flatReducer, from);

describe('чертаене на жилището', () => {
  it('добавените стаи не се застъпват', () => {
    const flat = run([
      { type: 'add', kind: 'kitchen' },
      { type: 'add', kind: 'living' },
      { type: 'add', kind: 'corridor' },
    ]);
    expect(flat.rooms).toHaveLength(3);
    expect(overlappingRooms(flat)).toEqual([]);
  });

  it('влаченето лепи стаята за съседа', () => {
    const start = run([{ type: 'add', kind: 'kitchen' }, { type: 'add', kind: 'bath' }]);
    const bath = start.rooms[1];
    const moved = flatReducer(start, { type: 'move', id: bath.id, x: bath.x + 100, y: bath.y });
    expect(moved.rooms[1].x).toBe(bath.x);
  });

  it('размерът остава в границите', () => {
    const start = run([{ type: 'add', kind: 'kitchen' }]);
    const id = start.rooms[0].id;
    expect(flatReducer(start, { type: 'size', id, width: 10, depth: 10 }).rooms[0].width).toBe(
      FLAT.MIN_SIDE,
    );
    expect(
      flatReducer(start, { type: 'size', id, width: 99_999, depth: 99_999 }).rooms[0].depth,
    ).toBe(FLAT.MAX_SIDE);
  });

  it('преименуването не приема роман', () => {
    const start = run([{ type: 'add', kind: 'kitchen' }]);
    const long = flatReducer(start, {
      type: 'rename',
      id: start.rooms[0].id,
      name: 'а'.repeat(200),
    });
    expect(long.rooms[0].name.length).toBe(40);
  });

  it('смяната на вида мени и подразбиращото се име, но не чуждото', () => {
    const start = run([{ type: 'add', kind: 'kitchen' }]);
    const id = start.rooms[0].id;
    expect(flatReducer(start, { type: 'kind', id, kind: 'bath' }).rooms[0].name).toBe('Баня');

    const named = flatReducer(start, { type: 'rename', id, name: 'Кухня на мама' });
    expect(flatReducer(named, { type: 'kind', id, kind: 'bath' }).rooms[0].name).toBe(
      'Кухня на мама',
    );
  });

  it('махнатата стая си отива, другите остават', () => {
    const start = run([{ type: 'add', kind: 'kitchen' }, { type: 'add', kind: 'bath' }]);
    const after = flatReducer(start, { type: 'remove', id: start.rooms[0].id });
    expect(after.rooms.map((r) => r.kind)).toEqual(['bath']);
  });

  it('заредено жилище се вкарва в границите', () => {
    const loaded = flatReducer(
      { rooms: [] },
      {
        type: 'load',
        value: { rooms: [{ id: 'x', kind: 'other', name: 'Стая', x: 7, y: 7, width: 5, depth: 5 }] },
      },
    );
    expect(loaded.rooms[0].width).toBe(FLAT.MIN_SIDE);
    expect(loaded.rooms[0].x % FLAT.STEP).toBe(0);
  });

  it('нулирането връща жилището по подразбиране', () => {
    expect(flatReducer({ rooms: [] }, { type: 'reset' }).rooms).toEqual(defaultFlat().rooms);
  });
});

describe('история на чертежа', () => {
  it('връщането и повтарянето работят', () => {
    let h = initFlatHistory({ rooms: [] });
    h = flatHistoryReducer(h, { type: 'add', kind: 'kitchen' });
    h = flatHistoryReducer(h, { type: 'add', kind: 'bath' });
    expect(h.present.rooms).toHaveLength(2);

    h = flatHistoryReducer(h, { type: 'undo' });
    expect(h.present.rooms).toHaveLength(1);
    expect(canRedoFlat(h)).toBe(true);

    h = flatHistoryReducer(h, { type: 'redo' });
    expect(h.present.rooms).toHaveLength(2);
  });

  it('едно влачене е една стъпка назад, не двайсет', () => {
    let h = initFlatHistory({ rooms: [] });
    h = flatHistoryReducer(h, { type: 'add', kind: 'kitchen' });
    const id = h.present.rooms[0].id;
    const before = h.past.length;
    for (let x = 1000; x <= 3000; x += 100) {
      h = flatHistoryReducer(h, { type: 'move', id, x, y: 0 });
    }
    expect(h.past.length).toBe(before + 1);
  });

  it('празна история не се връща наникъде', () => {
    const h = initFlatHistory(defaultFlat());
    expect(canUndoFlat(h)).toBe(false);
    expect(flatHistoryReducer(h, { type: 'undo' })).toBe(h);
  });

  it('действие, което нищо не мени, не трупа история', () => {
    let h = initFlatHistory(defaultFlat());
    h = flatHistoryReducer(h, { type: 'remove', id: 'няма такава' });
    expect(canUndoFlat(h)).toBe(false);
  });
});

describe('отмятане на готова стая', () => {
  const kitchen = () => run([{ type: 'add', kind: 'kitchen' }]);

  it('върнатият проект отмята стаята', () => {
    const start = kitchen();
    const id = start.rooms[0].id;
    const after = flatReducer(start, { type: 'finish', id, project: 'КОД' });
    expect(after.rooms[0].project).toBe('КОД');
  });

  it('отметката се маха и стаята става пак незавършена', () => {
    const base = kitchen();
    const id = base.rooms[0].id;
    const finished = flatReducer(base, { type: 'finish', id, project: 'КОД' });
    const undone = flatReducer(finished, { type: 'unfinish', id });
    expect(undone.rooms[0].project).toBeUndefined();
  });

  it('смяната на вида обезсилва проекта — мебелта за баня не е за спалня', () => {
    const base = kitchen();
    const id = base.rooms[0].id;
    const finished = flatReducer(base, { type: 'finish', id, project: 'КОД' });
    const changed = flatReducer(finished, { type: 'kind', id, kind: 'bath' });
    expect(changed.rooms[0].project).toBeUndefined();
    expect(changed.rooms[0].kind).toBe('bath');
  });

  it('местенето и преоразмеряването не бутат отметката', () => {
    const base = kitchen();
    const id = base.rooms[0].id;
    let flat = flatReducer(base, { type: 'finish', id, project: 'КОД' });
    flat = flatReducer(flat, { type: 'move', id, x: 2000, y: 1000 });
    flat = flatReducer(flat, { type: 'size', id, width: 4000, depth: 3000 });
    flat = flatReducer(flat, { type: 'rename', id, name: 'Кухня на мама' });
    expect(flat.rooms[0].project).toBe('КОД');
  });

  it('отмятането се връща с ⌘Z', () => {
    let h = initFlatHistory({ rooms: [] });
    h = flatHistoryReducer(h, { type: 'add', kind: 'kitchen' });
    const id = h.present.rooms[0].id;
    h = flatHistoryReducer(h, { type: 'finish', id, project: 'КОД' });
    expect(h.present.rooms[0].project).toBe('КОД');
    h = flatHistoryReducer(h, { type: 'undo' });
    expect(h.present.rooms[0].project).toBeUndefined();
  });

  it('повторно отмятане със същия проект не трупа история', () => {
    let h = initFlatHistory({ rooms: [] });
    h = flatHistoryReducer(h, { type: 'add', kind: 'kitchen' });
    const id = h.present.rooms[0].id;
    h = flatHistoryReducer(h, { type: 'finish', id, project: 'КОД' });
    const steps = h.past.length;
    h = flatHistoryReducer(h, { type: 'finish', id, project: 'КОД' });
    expect(h.past.length).toBe(steps);
  });

  it('записът в браузъра пази отметката', () => {
    const base = kitchen();
    const id = base.rooms[0].id;
    const finished = flatReducer(base, { type: 'finish', id, project: 'КОД' });
    const reloaded = flatReducer({ rooms: [] }, { type: 'load', value: finished });
    expect(reloaded.rooms[0].project).toBe('КОД');
  });
});

describe('няколко стаи наведнъж', () => {
  const two = () => run([{ type: 'add', kind: 'kitchen' }, { type: 'add', kind: 'living' }]);

  it('групата се мести заедно, без да се разпада', () => {
    const flat = two();
    const [a, b] = flat.rooms;
    const gap = b.x - a.x;
    const after = flatReducer(flat, {
      type: 'moveMany',
      ids: [a.id, b.id],
      x: a.x + 1000,
      y: a.y + 500,
    });
    expect(after.rooms[1].x - after.rooms[0].x).toBe(gap);
    expect(after.rooms[0].y).toBe(a.y + 500);
  });

  it('лепенето важи за водещата, а другите я следват', () => {
    const flat = two();
    const [a, b] = flat.rooms;
    // Половин праг не е желание да се отдели, а трепване на ръката.
    const after = flatReducer(flat, {
      type: 'moveMany',
      ids: [b.id, a.id],
      x: b.x + FLAT.SNAP / 2,
      y: b.y,
    });
    expect(after.rooms[1].x).toBe(b.x);
    expect(after.rooms[0].x).toBe(a.x);
  });

  it('махането на няколко е една стъпка назад', () => {
    let h = initFlatHistory(two());
    const ids = h.present.rooms.map((r) => r.id);
    h = flatHistoryReducer(h, { type: 'removeMany', ids });
    expect(h.present.rooms).toEqual([]);
    h = flatHistoryReducer(h, { type: 'undo' });
    expect(h.present.rooms).toHaveLength(2);
  });

  it('едно влачене на групата е една стъпка назад', () => {
    let h = initFlatHistory(two());
    const ids = h.present.rooms.map((r) => r.id);
    const before = h.past.length;
    // Влаченето праща водещата все по-далеч; лепенето не я държи.
    for (let i = 1; i <= 8; i++) {
      h = flatHistoryReducer(h, { type: 'moveMany', ids, x: FLAT.SNAP * 2 * i, y: 0 });
    }
    expect(h.past.length).toBe(before + 1);
    expect(h.present.rooms[0].x).toBe(FLAT.SNAP * 2 * 8);
  });

  it('цел в прегръдката на съседа се връща обратно', () => {
    const flat = two();
    const ids = flat.rooms.map((r) => r.id);
    const after = flatReducer(flat, {
      type: 'moveMany',
      ids,
      x: flat.rooms[0].x + FLAT.SNAP / 2,
      y: flat.rooms[0].y,
    });
    expect(after).toBe(flat);
  });

  it('копието застава до оригинала и е празно', () => {
    const flat = flatReducer(two(), { type: 'finish', id: two().rooms[0].id, project: 'КОД' });
    const base = two();
    const id = base.rooms[0].id;
    const done = flatReducer(base, { type: 'finish', id, project: 'КОД' });
    const copied = flatReducer(done, { type: 'duplicate', id });
    const copy = copied.rooms.at(-1)!;
    expect(copied.rooms).toHaveLength(3);
    expect(copy.kind).toBe(done.rooms[0].kind);
    expect(copy.project).toBeUndefined();
    expect(copy.x).toBe(done.rooms[0].x + done.rooms[0].width);
    void flat;
  });

  it('копие над тавана не влиза', () => {
    let flat: Flat = { rooms: [] };
    for (let i = 0; i < FLAT.MAX_ROOMS; i++) flat = flatReducer(flat, { type: 'add', kind: 'other' });
    expect(flatReducer(flat, { type: 'duplicate', id: flat.rooms[0].id })).toBe(flat);
  });

  it('непознати идентификатори не менят нищо', () => {
    const flat = two();
    expect(flatReducer(flat, { type: 'removeMany', ids: ['няма'] })).toBe(flat);
    expect(flatReducer(flat, { type: 'moveMany', ids: [], x: 10, y: 10 })).toBe(flat);
    expect(flatReducer(flat, { type: 'duplicate', id: 'няма' })).toBe(flat);
  });
});
