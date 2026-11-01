/**
 * Планът отгоре: всяка стена върви по своята страна, а модулите
 * стърчат навътре в стаята с дълбочината си.
 */

import { describe, expect, it } from 'vitest';
import {
  type Room,
  type WallSide,
  WALL_SIDES,
  clampRoom,
  cornerClashes,
  facingOf,
  footprint,
  freeSides,
  planGeometry,
  sideLength,
  wallRun,
} from './room';
import { KITCHEN, placeWall, type Wall } from '../cabinet-rules';

const room: Room = { width: 4000, depth: 3000 };

describe('размери на стаята', () => {
  it('се закръглят на стъпката и стоят в границите', () => {
    expect(clampRoom(4234)).toBe(4230);
    expect(clampRoom(10)).toBe(1200);
    expect(clampRoom(99999)).toBe(12000);
  });

  it('горната и долната стена вървят по ширината, другите две по дълбочината', () => {
    expect(sideLength(room, 'top')).toBe(4000);
    expect(sideLength(room, 'bottom')).toBe(4000);
    expect(sideLength(room, 'left')).toBe(3000);
    expect(sideLength(room, 'right')).toBe(3000);
  });
});

describe('отсечката на стената', () => {
  it('обхожда стаята по часовника, започвайки от горния ляв ъгъл', () => {
    expect(wallRun(room, 'top', 4000)).toEqual({ x1: 0, y1: 0, x2: 4000, y2: 0 });
    expect(wallRun(room, 'right', 3000)).toEqual({ x1: 4000, y1: 0, x2: 4000, y2: 3000 });
    expect(wallRun(room, 'bottom', 4000)).toEqual({ x1: 4000, y1: 3000, x2: 0, y2: 3000 });
    expect(wallRun(room, 'left', 3000)).toEqual({ x1: 0, y1: 3000, x2: 0, y2: 0 });
  });

  it('по-късият участък тръгва от началния ъгъл на стената', () => {
    expect(wallRun(room, 'bottom', 1000)).toEqual({ x1: 4000, y1: 3000, x2: 3000, y2: 3000 });
    expect(wallRun(room, 'left', 1200)).toEqual({ x1: 0, y1: 3000, x2: 0, y2: 1800 });
  });

  it('не излиза извън стаята, дори да е поискана по-дълга', () => {
    expect(wallRun(room, 'top', 9000).x2).toBe(4000);
  });
});

describe('правоъгълникът на модул', () => {
  // Един и същ модул: 600 широк, 560 дълбок, на 400 мм от началото.
  const of = (side: WallSide) => footprint(room, side, 400, 600, 560);

  it('на горната стена стърчи надолу', () => {
    expect(of('top')).toEqual({ x: 400, y: 0, width: 600, height: 560 });
  });

  it('на дясната стена стърчи наляво', () => {
    expect(of('right')).toEqual({ x: 3440, y: 400, width: 560, height: 600 });
  });

  it('на долната стена се мери отдясно наляво и стърчи нагоре', () => {
    expect(of('bottom')).toEqual({ x: 3000, y: 2440, width: 600, height: 560 });
  });

  it('на лявата стена се мери отдолу нагоре и стърчи надясно', () => {
    expect(of('left')).toEqual({ x: 0, y: 2000, width: 560, height: 600 });
  });

  it('стои вътре в стаята при всяка страна', () => {
    for (const side of WALL_SIDES) {
      const r = of(side);
      expect(r.x, side).toBeGreaterThanOrEqual(0);
      expect(r.y, side).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width, side).toBeLessThanOrEqual(room.width);
      expect(r.y + r.height, side).toBeLessThanOrEqual(room.depth);
    }
  });

  it('лицето гледа навътре в стаята', () => {
    expect(facingOf('top')).toEqual({ dx: 0, dy: 1 });
    expect(facingOf('bottom')).toEqual({ dx: 0, dy: -1 });
    expect(facingOf('left')).toEqual({ dx: 1, dy: 0 });
    expect(facingOf('right')).toEqual({ dx: -1, dy: 0 });
  });
});

describe('планът на стаята', () => {
  const wall = (side: WallSide, length: number, base: Wall['base']): Wall => ({
    side,
    length,
    base,
    upper: [],
  });

  const kitchenWall = wall('top', 2000, [
    { id: 'a', kind: 'door', width: 600 },
    { id: 'b', kind: 'sink', width: 800 },
  ]);

  const input = (w: Wall) => ({
    side: w.side ?? 'top',
    length: w.length,
    placed: placeWall(w),
  });

  it('дава по един правоъгълник на модул, с дълбочината от системата', () => {
    const [plan] = planGeometry(KITCHEN, room, [input(kitchenWall)]);
    expect(plan.modules.base.map((m) => m.rect)).toEqual([
      { x: 0, y: 0, width: 600, height: 560 },
      { x: 600, y: 0, width: 800, height: 560 },
    ]);
  });

  it('горните шкафове са по-плитки от долните', () => {
    const w = wall('top', 2000, [{ id: 'a', kind: 'door', width: 600 }]);
    w.upper = [{ id: 'u', kind: 'upper', width: 600 }];
    const [plan] = planGeometry(KITCHEN, room, [input(w)]);
    expect(plan.modules.base[0].rect.height).toBe(560);
    expect(plan.modules.upper[0].rect.height).toBe(320);
  });

  it('казва, когато участъкът не се събира в стаята', () => {
    const long = wall('left', 3600, []);
    const [plan] = planGeometry(KITCHEN, room, [input(long)]);
    expect(plan.tooLong).toBe(true);
  });

  it('подрежда няколко стени, всяка по своята страна', () => {
    const plan = planGeometry(KITCHEN, room, [
      input(kitchenWall),
      input(wall('left', 1800, [{ id: 'c', kind: 'drawers', width: 600 }])),
    ]);
    expect(plan.map((p) => p.side)).toEqual(['top', 'left']);
    expect(plan[1].modules.base[0].rect).toEqual({ x: 0, y: 2400, width: 560, height: 600 });
  });
});

describe('ъглите', () => {
  const wallWith = (side: WallSide, length: number, width: number): Wall => ({
    side,
    length,
    base: [{ id: `${side}-1`, kind: 'door', width }],
    upper: [],
  });

  const planOf = (walls: Wall[]) =>
    planGeometry(
      KITCHEN,
      room,
      walls.map((w) => ({ side: w.side ?? 'top', length: w.length, placed: placeWall(w) })),
    );

  /** Горната стена, запълнена с ниши до `until`, и шкаф след тях. */
  const topUntil = (until: number): Wall => {
    const gaps: Wall['base'] = [];
    let x = 0;
    while (x + 900 <= until) {
      gaps.push({ id: `gap-${x}`, kind: 'lgap', width: 900 });
      x += 900;
    }
    while (x + 300 <= until) {
      gaps.push({ id: `gap-${x}`, kind: 'lgap', width: 300 });
      x += 300;
    }
    return {
      side: 'top',
      length: room.width,
      base: [...gaps, { id: 'top-1', kind: 'door', width: 600 }],
      upper: [],
    };
  };

  it('мълчи, когато шкафовете са далеч от ъгъла', () => {
    // Горният шкаф свършва на 600, дясната стена заема от 3440 нататък.
    expect(cornerClashes(planOf([wallWith('top', 3000, 600), wallWith('right', 2000, 600)]))).toEqual(
      [],
    );
  });

  it('казва, когато два модула искат един и същи ъгъл', () => {
    // Горният шкаф стига до 3600, дясната стена започва на 3440.
    const clashes = cornerClashes(planOf([topUntil(3000), wallWith('right', 3000, 600)]));
    expect(clashes).toHaveLength(1);
    expect([clashes[0].a.id, clashes[0].b.id]).toEqual(['top-1', 'right-1']);
  });

  it('не брои за сблъсък модули по една и съща стена', () => {
    const wall: Wall = {
      side: 'top',
      length: 2000,
      base: [
        { id: 'a', kind: 'door', width: 600 },
        { id: 'b', kind: 'door', width: 600 },
      ],
      upper: [],
    };
    expect(cornerClashes(planOf([wall]))).toHaveLength(0);
  });
});

describe('свободните страни', () => {
  it('са тези, по които още няма стена', () => {
    expect(freeSides(['top', 'left'])).toEqual(['right', 'bottom']);
    expect(freeSides([...WALL_SIDES])).toEqual([]);
  });
});
