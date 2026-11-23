import { describe, expect, it } from 'vitest';
import {
  MODULES,
  type KitchenModule,
  type ModuleKind,
  type Wall,
  defaultWidth,
  placeWall,
} from './cabinet-rules';
import { dropTargetAt, ghostPlacement, wallPlane } from './drop3d';
import { alongFrom, pointAlong, type Room, type WallSide } from './furniture/room';
import { DEFAULT_CAMERA, floorPointAt, planePointAt, project } from './scene3d';

const ROOM: Room = { width: 3600, depth: 3000 };
const SIDES: WallSide[] = ['top', 'right', 'bottom', 'left'];

let seq = 0;
const mod = (kind: ModuleKind, width: number): KitchenModule => ({
  id: `m${++seq}`,
  kind,
  width,
  hingeSide: 'right',
});

const wallOf = (base: KitchenModule[] = [], upper: KitchenModule[] = [], length = 3600): Wall => ({
  id: 'w1',
  side: 'top',
  length,
  base,
  upper,
});

describe('мястото по стената е обратното на точката', () => {
  it('връща се същото число, от която и да е стена', () => {
    for (const side of SIDES) {
      for (const along of [0, 250, 1200, 3000]) {
        const p = pointAlong(ROOM, side, along);
        expect(alongFrom(ROOM, side, p)).toBeCloseTo(along, 6);
      }
    }
  });
});

describe('обратната проекция към равнина', () => {
  const cam = DEFAULT_CAMERA(ROOM);

  it('проектирана точка се връща на себе си', () => {
    const точки = [
      { x: 400, y: 0, z: 0 },
      { x: 2600, y: 1500, z: 0 },
      { x: 0, y: 900, z: 1800 },
    ];
    for (const p of точки) {
      const s = project(p, cam);
      // Равнината се избира по оста, по която точката е закована.
      const axis = p.z === 0 ? 'z' : 'x';
      const back = planePointAt(s.x, s.y, cam, axis, p[axis]);
      expect(back).not.toBeNull();
      expect(back!.x).toBeCloseTo(p.x, 3);
      expect(back!.y).toBeCloseTo(p.y, 3);
      expect(back!.z).toBeCloseTo(p.z, 3);
    }
  });

  it('дава същото като старата сметка за пода', () => {
    for (const [sx, sy] of [
      [0, 120],
      [-300, 240],
      [420, 80],
    ]) {
      const стар = floorPointAt(sx, sy, cam);
      const нов = planePointAt(sx, sy, cam, 'y', 0);
      expect(нов).not.toBeNull();
      expect(нов!.x).toBeCloseTo(стар.x, 3);
      expect(нов!.z).toBeCloseTo(стар.z, 3);
    }
  });

  it('лъч, успореден на равнината, няма пробождане', () => {
    // Камера без наклон гледа водоравно: подът ѝ е успореден.
    const равна = { ...cam, pitch: 0 };
    expect(planePointAt(0, 0, равна, 'y', 0)).toBeNull();
  });

  it('равнината на всяка стена е нейната собствена', () => {
    expect(wallPlane(ROOM, 'top')).toEqual({ axis: 'z', value: 0 });
    expect(wallPlane(ROOM, 'bottom')).toEqual({ axis: 'z', value: 3000 });
    expect(wallPlane(ROOM, 'left')).toEqual({ axis: 'x', value: 0 });
    expect(wallPlane(ROOM, 'right')).toEqual({ axis: 'x', value: 3600 });
  });
});

describe('къде ще легне модулът', () => {
  it('в празен ред — в началото на стената, не под показалеца', () => {
    const g = ghostPlacement(wallOf(), 'kitchen', [], 'door', 'base', 0);
    expect(g).not.toBeNull();
    expect(g!.x).toBe(0);
    expect(g!.width).toBe(defaultWidth('door'));
  });

  it('след два шкафа — опрян в тях', () => {
    const wall = wallOf([mod('door', 600), mod('drawers', 400)]);
    const g = ghostPlacement(wall, 'kitchen', [], 'door', 'base', 2);
    expect(g!.x).toBe(1000);
  });

  it('между тях — на тяхното място', () => {
    const wall = wallOf([mod('door', 600), mod('drawers', 400)]);
    const g = ghostPlacement(wall, 'kitchen', [], 'door', 'base', 1);
    expect(g!.x).toBe(600);
  });

  it('призракът е там, където ляга и истинският модул', () => {
    const wall = wallOf([mod('door', 600), mod('drawers', 400)]);
    const g = ghostPlacement(wall, 'kitchen', [], 'sink', 'base', 1);

    // Същото вмъкване, направено наистина.
    const нов = mod('sink', defaultWidth('sink'));
    const след = placeWall(
      { ...wall, base: [wall.base[0], нов, wall.base[1]] },
      {},
      'kitchen',
      [],
    );
    const истински = след.base.find((m) => m.id === нов.id)!;
    expect(g!.x).toBe(истински.x);
    expect(g!.width).toBe(истински.width);
  });
});

describe('къде влиза пуснатият модул', () => {
  const cam = DEFAULT_CAMERA(ROOM);

  const scene = (wall: Wall, side: WallSide = 'top') => ({
    room: ROOM,
    roomKind: 'kitchen' as const,
    side,
    wall: { ...wall, side },
    openings: [],
    placed: placeWall({ ...wall, side }, {}, 'kitchen', []),
  });

  /** Точката от кадъра, която гледа към даденото място на стената. */
  const кадър = (side: WallSide, along: number, height: number) => {
    const p = pointAlong(ROOM, side, along);
    return project({ x: p.x, y: height, z: p.y }, cam);
  };

  it('в празна стая модулът влиза пръв и застава в началото', () => {
    const s = кадър('top', 1500, 400);
    const цел = dropTargetAt(scene(wallOf()), 'door', s.x, s.y, cam);
    expect(цел).not.toBeNull();
    expect(цел!.row).toBe('base');
    expect(цел!.index).toBe(0);
    expect(цел!.left).toBe(0);
  });

  it('редът решава кой е редът, не височината на показалеца', () => {
    // Една и съща точка, два различни модула: долният пада долу,
    // горният — горе. Височината на показалеца не участва.
    const s = кадър('top', 1200, 300);
    expect(dropTargetAt(scene(wallOf()), 'door', s.x, s.y, cam)!.row).toBe('base');
    expect(dropTargetAt(scene(wallOf()), 'upper', s.x, s.y, cam)!.row).toBe('upper');
  });

  it('между два шкафа влиза на мястото между тях', () => {
    const wall = wallOf([mod('door', 600), mod('drawers', 600), mod('sink', 800)]);
    // Показалецът държи средата: за да падне след втория шкаф (1200),
    // той гледа половин ширина по-нататък.
    const s = кадър('top', 1200 + defaultWidth('door') / 2, 400);
    const цел = dropTargetAt(scene(wall), 'door', s.x, s.y, cam);
    expect(цел!.index).toBe(2);
    expect(цел!.left).toBe(1200);
  });

  it('към левия край влиза пръв, към десния — последен', () => {
    const wall = wallOf([mod('door', 600), mod('drawers', 600)]);
    const ляво = dropTargetAt(scene(wall), 'door', ...xy(кадър('top', 0, 400)), cam);
    const дясно = dropTargetAt(scene(wall), 'door', ...xy(кадър('top', 3500, 400)), cam);
    expect(ляво!.index).toBe(0);
    expect(дясно!.index).toBe(2);
  });

  it('пуснатото никога не излиза извън стената', () => {
    for (const along of [-500, 0, 1800, 3600, 4200]) {
      const s = кадър('top', along, 400);
      const цел = dropTargetAt(scene(wallOf()), 'door', s.x, s.y, cam);
      if (!цел) continue;
      expect(цел.left).toBeGreaterThanOrEqual(0);
      expect(цел.left + цел.width).toBeLessThanOrEqual(3600);
    }
  });

  it('работи и на четирите стени', () => {
    for (const side of SIDES) {
      const дълга = side === 'top' || side === 'bottom';
      const wall = wallOf([], [], дълга ? 3600 : 3000);
      const s = кадър(side, 1000, 400);
      const цел = dropTargetAt(scene(wall, side), 'door', s.x, s.y, cam);
      expect(цел, side).not.toBeNull();
      expect(цел!.index, side).toBe(0);
    }
  });

  it('широчината за хващане е каталожна', () => {
    for (const kind of Object.keys(MODULES) as ModuleKind[]) {
      expect(MODULES[kind].widths).toContain(defaultWidth(kind));
    }
  });
});

/** Точка от кадъра като два отделни довода. */
function xy(p: { x: number; y: number }): [number, number] {
  return [p.x, p.y];
}
