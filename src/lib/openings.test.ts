import { describe, expect, it } from 'vitest';
import { WALL_SIDES, type Room, type WallSide, pointAlong, sideLength } from './furniture/room';
import {
  DOOR,
  type RoomDoor,
  clampDoor,
  defaultDoor,
  doorBlocks,
  doorClashes,
  doorFreeRuns,
  doorHingePoint,
  doorKeepOut,
  doorAsOpening,
  doorDrop,
  doorPlan,
  doorSpan,
  placeDoorAt,
  longestFreeRun,
  WINDOW,
  type RoomWindow,
  clampWindow,
  defaultWindow,
  openingSpan,
  placeWindowAt,
  wallOpeningsOn,
  windowAsOpening,
  windowSpan,
} from './openings';

const room: Room = { width: 4200, depth: 3200 };

const door = (over: Partial<RoomDoor> = {}): RoomDoor => ({
  side: 'top',
  x: 1000,
  width: 800,
  height: 2040,
  hinge: 'left',
  swing: 'in',
  ...over,
});

describe('вратата стои в зида си', () => {
  it('не излиза извън стената', () => {
    const d = clampDoor(room, door({ side: 'left', x: 9000 }));
    expect(d.x + d.width).toBeLessThanOrEqual(sideLength(room, 'left'));
    expect(d.x).toBeGreaterThanOrEqual(0);
  });

  it('не става по-широка от стената в тясна стая', () => {
    const tiny: Room = { width: 1200, depth: 1200 };
    const d = clampDoor(tiny, door({ width: 1800 }));
    expect(d.width).toBeLessThanOrEqual(1200);
    expect(d.x + d.width).toBeLessThanOrEqual(1200);
  });

  it('спазва най-малката и най-голямата мярка', () => {
    expect(clampDoor(room, door({ width: 100 })).width).toBe(DOOR.MIN_WIDTH);
    expect(clampDoor(room, door({ width: 9000 })).width).toBe(DOOR.MAX_WIDTH);
    expect(clampDoor(room, door({ height: 100 })).height).toBe(DOOR.MIN_HEIGHT);
    expect(clampDoor(room, door({ height: 9000 })).height).toBe(DOOR.MAX_HEIGHT);
  });

  it('закръгля на стъпката', () => {
    expect(clampDoor(room, door({ x: 1003 })).x % DOOR.STEP).toBe(0);
    expect(clampDoor(room, door({ width: 807 })).width % DOOR.STEP).toBe(0);
  });

  it('по подразбиране не стои на стената с мебелта', () => {
    for (const side of WALL_SIDES) {
      const d = defaultDoor(room, side);
      expect(d.side, side).not.toBe(side);
      expect(d.x, side).toBeGreaterThanOrEqual(0);
      expect(d.x + d.width, side).toBeLessThanOrEqual(sideLength(room, d.side));
    }
  });

  it('по подразбиране пада на стена, която се вижда при отваряне', () => {
    // Стаята се гледа иззад долната стена; врата на нея е зад гърба.
    for (const side of WALL_SIDES) {
      if (side === 'bottom') continue;
      expect(defaultDoor(room, side).side, side).not.toBe('bottom');
    }
  });

  it('по подразбиране стои в далечния край на съседната стена', () => {
    // Мебелта е на горната стена; вратата отива на дясната, но долу,
    // за да не се отваря право в шкафовете.
    const d = defaultDoor(room, 'top');
    expect(d.side).toBe('right');
    expect(d.x + d.width).toBeGreaterThan(sideLength(room, 'right') / 2);
  });

  it('се побира и в стая, по-тясна от самата врата', () => {
    const narrow: Room = { width: 1300, depth: 1300 };
    const d = defaultDoor(narrow, 'top');
    expect(d.x).toBeGreaterThanOrEqual(0);
    expect(d.x + d.width).toBeLessThanOrEqual(sideLength(narrow, d.side));
  });
});

describe('отворът в плана', () => {
  it('лежи върху своята стена и е дълъг колкото вратата', () => {
    const at: Record<WallSide, number> = { top: 0, bottom: room.depth, left: 0, right: room.width };
    for (const side of WALL_SIDES) {
      const span = doorSpan(room, door({ side }));
      expect(span.to - span.from, side).toBe(800);
      expect(span.at, side).toBe(at[side]);
      expect(span.axis, side).toBe(side === 'top' || side === 'bottom' ? 'x' : 'z');
    }
  });

  it('пантите са на единия край на отвора, различен за двете страни', () => {
    for (const side of WALL_SIDES) {
      const left = doorHingePoint(room, door({ side, hinge: 'left' }));
      const right = doorHingePoint(room, door({ side, hinge: 'right' }));
      expect(left, side).not.toEqual(right);
      const span = doorSpan(room, door({ side }));
      for (const p of [left, right]) {
        const along = span.axis === 'x' ? p.x : p.y;
        expect(along, side).toBeGreaterThanOrEqual(span.from);
        expect(along, side).toBeLessThanOrEqual(span.to);
      }
    }
  });
});

describe('подът пред вратата', () => {
  it('крилото мете навътре в стаята, не през зида', () => {
    for (const side of WALL_SIDES) {
      for (const hinge of ['left', 'right'] as const) {
        const keep = doorKeepOut(room, door({ side, hinge }));
        expect(keep.x, `${side}/${hinge}`).toBeGreaterThanOrEqual(0);
        expect(keep.y, `${side}/${hinge}`).toBeGreaterThanOrEqual(0);
        expect(keep.x + keep.width, `${side}/${hinge}`).toBeLessThanOrEqual(room.width);
        expect(keep.y + keep.height, `${side}/${hinge}`).toBeLessThanOrEqual(room.depth);
      }
    }
  });

  it('е квадрат със страна ширината на вратата', () => {
    const keep = doorKeepOut(room, door());
    expect(keep.width).toBe(800);
    expect(keep.height).toBe(800);
  });

  it('врата навън иска само пътека, не цяла четвъртина', () => {
    const keep = doorKeepOut(room, door({ swing: 'out' }));
    expect(keep.height).toBe(DOOR.CLEARANCE);
  });

  it('допира стената, на която виси', () => {
    expect(doorKeepOut(room, door({ side: 'top' })).y).toBe(0);
    expect(doorKeepOut(room, door({ side: 'left' })).x).toBe(0);
    expect(doorKeepOut(room, door({ side: 'right' })).x + doorKeepOut(room, door({ side: 'right' })).width).toBe(room.width);
    expect(doorKeepOut(room, door({ side: 'bottom' })).y + doorKeepOut(room, door({ side: 'bottom' })).height).toBe(room.depth);
  });
});

describe('свободната стена', () => {
  it('вратата реже стената на две', () => {
    const runs = doorFreeRuns(room, door({ x: 1000, width: 800 }), 'top');
    expect(runs).toEqual([
      { x: 0, width: 1000 },
      { x: 1800, width: 2400 },
    ]);
  });

  it('врата до ъгъла оставя един участък', () => {
    expect(doorFreeRuns(room, door({ x: 0 }), 'top')).toEqual([{ x: 800, width: 3400 }]);
  });

  it('чужда стена остава цяла', () => {
    expect(doorFreeRuns(room, door({ side: 'left' }), 'top')).toEqual([
      { x: 0, width: room.width },
    ]);
    expect(doorFreeRuns(room, undefined, 'top')).toEqual([{ x: 0, width: room.width }]);
  });

  it('най-дългият участък е този, в който се нарежда мебелта', () => {
    expect(longestFreeRun(room, door({ x: 1000 }), 'top')).toEqual({ x: 1800, width: 2400 });
    expect(longestFreeRun(room, undefined, 'top')).toEqual({ x: 0, width: room.width });
  });

  it('отворът се подава на правилата като зает участък', () => {
    expect(doorBlocks(room, door({ x: 1000 }), 'top')).toEqual([{ x: 1000, width: 800 }]);
    expect(doorBlocks(room, door({ x: 1000 }), 'bottom')).toEqual([]);
  });
});

describe('какво пречи на вратата', () => {
  const cabinet = (x: number, y: number) => ({ rect: { x, y, width: 600, height: 560 } });

  it('шкаф в обхвата на крилото се обажда', () => {
    const hit = doorClashes(room, door({ side: 'top', x: 1000 }), [cabinet(1200, 0)]);
    expect(hit).toHaveLength(1);
  });

  it('шкаф далеч от вратата мълчи', () => {
    expect(doorClashes(room, door({ side: 'top', x: 1000 }), [cabinet(3000, 0)])).toHaveLength(0);
  });

  it('без врата няма от какво да се оплачем', () => {
    expect(doorClashes(room, undefined, [cabinet(1200, 0)])).toHaveLength(0);
  });

  it('врата навън пуска мебелта по-близо, отколкото врата навътре', () => {
    const near = [cabinet(1000, 700)];
    expect(doorClashes(room, door({ swing: 'in', x: 1000 }), near)).toHaveLength(1);
    expect(doorClashes(room, door({ swing: 'out', x: 1000 }), near)).toHaveLength(0);
  });
});

describe('знакът на вратата в план', () => {
  it('крилото е дълго колкото отвора и тръгва от пантите', () => {
    const sym = doorPlan(room, door());
    expect(sym.radius).toBe(800);
    expect(Math.hypot(sym.closed.x - sym.hinge.x, sym.closed.y - sym.hinge.y)).toBeCloseTo(800, 6);
    expect(Math.hypot(sym.open.x - sym.hinge.x, sym.open.y - sym.hinge.y)).toBeCloseTo(800, 6);
  });

  it('отвореното крило стои на прав ъгъл спрямо затвореното', () => {
    for (const side of WALL_SIDES) {
      for (const hinge of ['left', 'right'] as const) {
        const s = doorPlan(room, door({ side, hinge }));
        const a = { x: s.closed.x - s.hinge.x, y: s.closed.y - s.hinge.y };
        const b = { x: s.open.x - s.hinge.x, y: s.open.y - s.hinge.y };
        expect(a.x * b.x + a.y * b.y, `${side}/${hinge}`).toBeCloseTo(0, 6);
      }
    }
  });

  it('отвореното крило сочи навътре в стаята', () => {
    for (const side of WALL_SIDES) {
      const s = doorPlan(room, door({ side }));
      expect(s.open.x, side).toBeGreaterThanOrEqual(0);
      expect(s.open.x, side).toBeLessThanOrEqual(room.width);
      expect(s.open.y, side).toBeGreaterThanOrEqual(0);
      expect(s.open.y, side).toBeLessThanOrEqual(room.depth);
    }
  });

  it('дъгата върви от затвореното към отвореното, не по обиколния път', () => {
    // Средата на дъгата при избрания sweep трябва да е вътре в стаята.
    for (const side of WALL_SIDES) {
      for (const hinge of ['left', 'right'] as const) {
        const s = doorPlan(room, door({ side, hinge }));
        const a = Math.atan2(s.closed.y - s.hinge.y, s.closed.x - s.hinge.x);
        const b = Math.atan2(s.open.y - s.hinge.y, s.open.x - s.hinge.x);
        let delta = b - a;
        while (delta <= -Math.PI) delta += 2 * Math.PI;
        while (delta > Math.PI) delta -= 2 * Math.PI;
        expect(delta > 0 ? 1 : 0, `${side}/${hinge}`).toBe(s.sweep);
      }
    }
  });

  it('врата навън мете извън стаята', () => {
    const s = doorPlan(room, door({ side: 'top', swing: 'out' }));
    expect(s.open.y).toBeLessThan(0);
  });
});

describe('посочване на вратата в плана', () => {
  it('точка до всяка стена се хваща за нея', () => {
    expect(doorDrop(room, { x: 2000, y: 40 }).side).toBe('top');
    expect(doorDrop(room, { x: 2000, y: room.depth - 40 }).side).toBe('bottom');
    expect(doorDrop(room, { x: 40, y: 1600 }).side).toBe('left');
    expect(doorDrop(room, { x: room.width - 40, y: 1600 }).side).toBe('right');
  });

  it('върнатото x е същото, с което се мери стената', () => {
    for (const side of WALL_SIDES) {
      const probe = doorDrop(room, pointAlong(room, side, 1200));
      expect(probe.side, side).toBe(side);
      expect(probe.x, side).toBeCloseTo(1200, 6);
    }
  });

  it('вратата застава със средата си там, където е посочено', () => {
    const moved = placeDoorAt(room, door(), { x: 40, y: 1600 });
    expect(moved.side).toBe('left');
    // Посочено е на 1600 от горния ръб, тоест depth-1600 по местното x.
    expect(moved.x + moved.width / 2).toBeCloseTo(room.depth - 1600, 0);
  });

  it('посочено до ъгъла вратата пак остава в зида', () => {
    for (const side of WALL_SIDES) {
      const moved = placeDoorAt(room, door(), pointAlong(room, side, 0));
      expect(moved.x, side).toBeGreaterThanOrEqual(0);
      expect(moved.x + moved.width, side).toBeLessThanOrEqual(sideLength(room, moved.side));
    }
  });

  it('местенето не променя ширината, пантите и посоката', () => {
    const before = door({ width: 900, hinge: 'right', swing: 'out' });
    const after = placeDoorAt(room, before, { x: 2000, y: 40 });
    expect(after.width).toBe(900);
    expect(after.hinge).toBe('right');
    expect(after.swing).toBe('out');
  });
});

describe('вратата като отвор в стената', () => {
  it('излиза само на своята стена', () => {
    expect(doorAsOpening(door({ side: 'top' }), 'top')).not.toBeNull();
    expect(doorAsOpening(door({ side: 'top' }), 'left')).toBeNull();
    expect(doorAsOpening(undefined, 'top')).toBeNull();
  });

  it('стъпва на пода и е висока колкото вратата', () => {
    const o = doorAsOpening(door({ height: 2040, width: 900, x: 1200 }), 'top')!;
    expect(o).toEqual({ id: 'room-door', kind: 'door', x: 1200, width: 900, bottom: 0, height: 2040 });
  });
});

const win = (over: Partial<RoomWindow> = {}): RoomWindow => ({
  id: 'w1',
  side: 'top',
  x: 1000,
  width: 1200,
  sill: 900,
  height: 1400,
  ...over,
});

describe('прозорецът стои в зида си', () => {
  it('не излиза извън стената', () => {
    for (const side of WALL_SIDES) {
      const w = clampWindow(room, win({ side, x: 9000 }));
      expect(w.x, side).toBeGreaterThanOrEqual(0);
      expect(w.x + w.width, side).toBeLessThanOrEqual(sideLength(room, side));
    }
  });

  it('не става по-широк от стената в тясна стая', () => {
    const tiny: Room = { width: 1400, depth: 1400 };
    const w = clampWindow(tiny, win({ width: 4000 }));
    expect(w.width).toBeLessThanOrEqual(1400);
    expect(w.x + w.width).toBeLessThanOrEqual(1400);
  });

  it('спазва мерките и стъпката', () => {
    expect(clampWindow(room, win({ width: 50 })).width).toBe(WINDOW.MIN_WIDTH);
    expect(clampWindow(room, win({ height: 9000 })).height).toBe(WINDOW.MAX_HEIGHT);
    expect(clampWindow(room, win({ sill: -500 })).sill).toBe(WINDOW.MIN_SILL);
    expect(clampWindow(room, win({ sill: 9000 })).sill).toBe(WINDOW.MAX_SILL);
    expect(clampWindow(room, win({ x: 1003 })).x % WINDOW.STEP).toBe(0);
  });

  it('виси на парапет, не стъпва на пода', () => {
    expect(defaultWindow(room).sill).toBeGreaterThan(0);
  });

  it('нов прозорец отива на свободна стена', () => {
    const first = defaultWindow(room, [], 'w1');
    const second = defaultWindow(room, [first], 'w2');
    expect(second.side).not.toBe(first.side);
  });

  it('не застава върху вратата', () => {
    const d = door({ side: 'top' });
    expect(defaultWindow(room, [d], 'w1').side).not.toBe('top');
  });

  it('долната стена е последният избор — иззад нея се гледа стаята', () => {
    const three = [{ side: 'top' as const }, { side: 'left' as const }, { side: 'right' as const }];
    expect(defaultWindow(room, three, 'w1').side).toBe('bottom');
    expect(defaultWindow(room, three.slice(0, 2), 'w2').side).toBe('right');
  });

  it('заетите свършат ли, пак дава стена, вместо да се счупи', () => {
    const all = WALL_SIDES.map((side) => ({ side }));
    expect(WALL_SIDES).toContain(defaultWindow(room, all, 'w1').side);
  });

  it('нов прозорец застава в средата на стената си', () => {
    const w = defaultWindow(room, [], 'w1');
    const wall = sideLength(room, w.side);
    expect(w.x + w.width / 2).toBeCloseTo(wall / 2, 0);
  });

  it('и в стая, по-тясна от самия прозорец, се побира', () => {
    const narrow: Room = { width: 1300, depth: 1300 };
    const w = defaultWindow(narrow, [], 'w1');
    expect(w.x).toBeGreaterThanOrEqual(0);
    expect(w.x + w.width).toBeLessThanOrEqual(sideLength(narrow, w.side));
  });
});

describe('прозорецът в плана', () => {
  it('лежи на своята стена, дълъг колкото е широк', () => {
    for (const side of WALL_SIDES) {
      const span = windowSpan(room, win({ side }));
      expect(span.to - span.from, side).toBe(1200);
    }
  });

  it('врата и прозорец на една стена ползват една и съща сметка', () => {
    const a = openingSpan(room, 'left', 500, 800);
    const b = windowSpan(room, win({ side: 'left', x: 500, width: 800 }));
    expect(b).toEqual(a);
  });

  it('се мести със средата си там, където е посочено', () => {
    const moved = placeWindowAt(room, win(), { x: 40, y: 1600 });
    expect(moved.side).toBe('left');
    expect(moved.x + moved.width / 2).toBeCloseTo(room.depth - 1600, 0);
  });

  it('местенето не променя парапета и височината', () => {
    const moved = placeWindowAt(room, win({ sill: 700, height: 1600 }), { x: 2000, y: 40 });
    expect(moved.sill).toBe(700);
    expect(moved.height).toBe(1600);
  });
});

describe('отворите на една стена', () => {
  it('излизат само тези на нея, подредени отляво надясно', () => {
    const d = door({ side: 'top', x: 2600 });
    const list = wallOpeningsOn(d, [win({ id: 'w1', side: 'top', x: 400 }), win({ id: 'w2', side: 'left' })], 'top');
    expect(list.map((o) => o.id)).toEqual(['w1', 'room-door']);
    expect(list.map((o) => o.kind)).toEqual(['window', 'door']);
  });

  it('прозорецът носи парапета си, вратата стъпва на нула', () => {
    const list = wallOpeningsOn(door({ side: 'top' }), [win({ side: 'top', x: 2600 })], 'top');
    expect(list.find((o) => o.kind === 'door')!.bottom).toBe(0);
    expect(list.find((o) => o.kind === 'window')!.bottom).toBe(900);
  });

  it('стена без нищо дава празен списък', () => {
    expect(wallOpeningsOn(door({ side: 'top' }), [], 'bottom')).toEqual([]);
    expect(wallOpeningsOn(undefined, undefined, 'top')).toEqual([]);
  });

  it('прозорец на чужда стена не се появява', () => {
    expect(windowAsOpening(win({ side: 'top' }), 'left')).toBeNull();
  });
});
