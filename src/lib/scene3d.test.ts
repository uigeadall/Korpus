import { describe, expect, it } from 'vitest';
import {
  DIM,
  type RoomDoor,
  type RoomWindow,
  acceptsShelves,
  canOpen,
  computeKitchen,
  defaultDoor,
  emptyKitchen,
  kitchenDoor,
  kitchenRoom,
  shelfCount,
} from './cabinet-rules';
import { WALL_SIDES } from './furniture/room';
import { doorHingePoint, doorSpan, windowSpan } from './openings';
import {
  DEFAULT_BEDROOM,
  DEFAULT_LIVING,
  DEFAULT_NEEDS,
  autoLayout,
  livingLayout,
  wardrobeLayout,
} from './autolayout';
import {
  type Box,
  type Camera,
  DEFAULT_CAMERA,
  VIEW_ASPECT,
  boxFaces,
  cameraFacing,
  castShadow,
  centroid,
  clipToRoom,
  convexHull,
  dropToFloor,
  facesCamera,
  facingNormal,
  floorPointAt,
  paintOrder,
  project,
  sceneFor,
  shade,
  shellWall,
  sideVisible,
  wallWithHoles,
  tint,
  viewBoxFor,
  visibleFaces,
  wallInTheWay,
} from './scene3d';

const room = { width: 4200, depth: 3200 };
const cam = (over: Partial<Camera> = {}): Camera => ({ ...DEFAULT_CAMERA(room), ...over });

/**
 * Самата стая: под с фугите и петната по него, зидове, отворът в тях и
 * касата. Всичко това се рисува, преди в стаята да влезе каквото и да
 * било — ред, който важи от всеки ъгъл.
 */
const SHELL = new Set(['floor', 'wall', 'doorway', 'casing', 'seam', 'shadow']);

/**
 * Кое има право да излиза извън правоъгълника на стаята: зидът има
 * дебелина, зад вратата има друга стая, а крилото стои в отвора, тоест
 * вътре в зида. Мебелта няма това право.
 */
const OUTSIDE_OK = new Set(['floor', 'wall', 'doorway', 'casing', 'door']);

const cube: Box = {
  x: 0,
  y: 0,
  z: 0,
  width: 600,
  height: 600,
  depth: 600,
  role: 'carcass',
  facing: 'top',
};

describe('проекция', () => {
  it('точката, в която гледа камерата, пада в центъра на картината', () => {
    const c = cam();
    const p = project(c.target, c);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.y).toBeCloseTo(0, 6);
  });

  it('по-далечното изглежда по-малко', () => {
    const c = cam({ yaw: 0, pitch: 0 });
    const near = project({ x: 600, y: 1000, z: c.target.z + 1000 }, c);
    const far = project({ x: 600, y: 1000, z: c.target.z - 1000 }, c);
    expect(Math.abs(near.x)).toBeGreaterThan(Math.abs(far.x));
    expect(near.depth).toBeLessThan(far.depth);
  });

  it('нагоре в света е нагоре в картината', () => {
    const c = cam();
    const low = project({ ...c.target, y: 0 }, c);
    const high = project({ ...c.target, y: 2000 }, c);
    expect(high.y).toBeLessThan(low.y);
  });

  it('пълен оборот връща същата картина', () => {
    const a = project({ x: 1000, y: 800, z: 500 }, cam({ yaw: 0.4 }));
    const b = project({ x: 1000, y: 800, z: 500 }, cam({ yaw: 0.4 + Math.PI * 2 }));
    expect(a.x).toBeCloseTo(b.x, 6);
    expect(a.y).toBeCloseTo(b.y, 6);
  });
});

describe('стените на обема', () => {
  it('обемът има шест стени по четири върха', () => {
    const faces = boxFaces(cube);
    expect(faces).toHaveLength(6);
    for (const f of faces) expect(f.corners).toHaveLength(4);
  });

  it('върховете стоят в границите на обема', () => {
    for (const f of boxFaces(cube)) {
      for (const p of f.corners) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(600);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.z).toBeLessThanOrEqual(600);
      }
    }
  });

  it('само една стена е лицева и тя гледа накъдето гледа мебелта', () => {
    const faces = boxFaces(cube);
    const fronts = faces.filter((f) => f.front);
    expect(fronts).toHaveLength(1);
    expect(fronts[0].normal).toEqual(facingNormal('top'));
  });

  it('под и стени нямат лице', () => {
    expect(boxFaces({ ...cube, facing: null, role: 'floor' }).some((f) => f.front)).toBe(false);
  });

  it('всяка стена до съседна стена гледа в различна посока', () => {
    const normals = boxFaces(cube).map((f) => `${f.normal.x},${f.normal.y},${f.normal.z}`);
    expect(new Set(normals).size).toBe(6);
  });
});

describe('какво се вижда', () => {
  it('обърнатите настрани стени отпадат', () => {
    const c = cam();
    const faces = boxFaces({ ...cube, x: room.width / 2, z: room.depth / 2 });
    const visible = faces.filter((f) => facesCamera(f, c));
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.length).toBeLessThan(6);
  });

  it('обръщането на камерата сменя кои стени се виждат', () => {
    const box = { ...cube, x: room.width / 2, z: room.depth / 2 };
    const front = boxFaces(box).filter((f) => facesCamera(f, cam({ yaw: 0 })));
    const behind = boxFaces(box).filter((f) => facesCamera(f, cam({ yaw: Math.PI })));
    const key = (f: { normal: { x: number; z: number } }) => `${f.normal.x},${f.normal.z}`;
    expect(front.map(key).sort()).not.toEqual(behind.map(key).sort());
  });

  it('отгоре се вижда горната стена, не долната', () => {
    const box = { ...cube, x: room.width / 2, z: room.depth / 2 };
    const visible = boxFaces(box).filter((f) => facesCamera(f, cam({ pitch: 1.2 })));
    expect(visible.some((f) => f.normal.y === 1)).toBe(true);
    expect(visible.some((f) => f.normal.y === -1)).toBe(false);
  });
});

describe('ред на рисуване', () => {
  it('далечното се рисува първо', () => {
    const c = cam({ yaw: 0, pitch: 0 });
    const near: Box = { ...cube, z: c.target.z + 1200 };
    const far: Box = { ...cube, z: c.target.z - 1200 };
    const ordered = paintOrder([...boxFaces(near), ...boxFaces(far)], c);
    const depthOf = (f: (typeof ordered)[number]) => project(centroid(f.corners), c).depth;
    for (let i = 1; i < ordered.length; i++) {
      expect(depthOf(ordered[i - 1])).toBeGreaterThanOrEqual(depthOf(ordered[i]));
    }
  });
});

describe('осветяване', () => {
  it('всяка стена получава стойност между тъмно и светло', () => {
    for (const f of boxFaces(cube)) {
      const value = shade(f.normal);
      expect(value).toBeGreaterThanOrEqual(0.42);
      expect(value).toBeLessThanOrEqual(1.15);
    }
  });

  it('нито една страна не пада в мъртво черно', () => {
    // Насрещната и разсеяната светлина вдигат и най-тъмната страна.
    const darkest = Math.min(...boxFaces(cube).map((f) => shade(f.normal)));
    expect(darkest).toBeGreaterThan(0.4);
  });

  it('топлото и студеното разделят страните', () => {
    const lit = tint({ x: -1, y: 0, z: 0 });
    const away = tint({ x: 1, y: 0, z: 0 });
    // Огряната от главната светлина клони към топло, насрещната — към студено.
    expect(lit.r - lit.b).toBeGreaterThan(away.r - away.b);
  });

  it('горната стена е най-светлата', () => {
    const top = shade({ x: 0, y: 1, z: 0 });
    for (const f of boxFaces(cube)) {
      if (f.normal.y === 1) continue;
      expect(top).toBeGreaterThanOrEqual(shade(f.normal));
    }
  });
});

describe('сцената на истинска кухня', () => {
  const build = () => {
    const layout = autoLayout(3600, DEFAULT_NEEDS);
    const k = emptyKitchen(3600);
    k.walls[0] = { ...k.walls[0], base: layout.base, upper: layout.upper };
    const result = computeKitchen(k);
    return { k, result, boxes: sceneFor(k, kitchenRoom(k), result.placed, k.materials.worktop) };
  };

  it('има под, стени, шкафове, плот и цокъл', () => {
    const roles = new Set(build().boxes.map((b) => b.role));
    for (const role of ['floor', 'wall', 'carcass', 'worktop', 'plinth']) {
      expect(roles, role).toContain(role);
    }
  });

  it('всеки шкаф стъпва на пода или виси над него, но не под него', () => {
    for (const b of build().boxes) {
      if (b.role === 'floor') continue;
      expect(b.y).toBeGreaterThanOrEqual(0);
    }
  });

  it('нищо не излиза извън стаята', () => {
    const { boxes } = build();
    for (const b of boxes) {
      if (OUTSIDE_OK.has(b.role)) continue;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(room.width + 1);
      expect(b.z).toBeGreaterThanOrEqual(0);
      expect(b.z + b.depth).toBeLessThanOrEqual(room.depth + 1);
    }
  });

  it('плотът стои на височината на долния корпус', () => {
    const worktops = build().boxes.filter((b) => b.role === 'worktop');
    expect(worktops.length).toBeGreaterThan(0);
    for (const w of worktops) expect(w.y).toBe(100 + 720);
  });

  it('нишите не стават обеми', () => {
    const layout = autoLayout(3600, DEFAULT_NEEDS);
    const k = emptyKitchen(3600);
    k.walls[0] = {
      ...k.walls[0],
      base: [...layout.base, { id: 'gap-1', kind: 'lgap', width: 600 }],
      upper: layout.upper,
    };
    const result = computeKitchen(k);
    const boxes = sceneFor(k, kitchenRoom(k), result.placed, k.materials.worktop);
    /*
     * Корпусите са слети на участъци, затова се мери обхванатата
     * ширина, не броят: нишата не бива да попадне под корпус.
     */
    const covered = boxes
      .filter((b) => b.role === 'carcass')
      .reduce((sum, b) => sum + Math.max(b.width, b.depth), 0);
    const expected = [...layout.base, ...layout.upper].reduce((s, m) => s + m.width, 0);
    expect(covered).toBe(expected);
  });

  it('всеки шкаф носи лицата си и дръжки, залепени пред корпуса', () => {
    const { boxes } = build();
    const facades = boxes.filter((b) => b.role === 'facade' || b.role === 'appliance');
    const handles = boxes.filter((b) => b.role === 'handle');
    expect(facades.length).toBeGreaterThan(boxes.filter((b) => b.role === 'carcass').length);
    expect(handles.length).toBeGreaterThan(0);

    // Кухнята е до горната стена, значи лицата гледат към +Z и стърчат
    // пред корпусите, а дръжките — пред лицата.
    const frontOf = (role: string) =>
      Math.max(...boxes.filter((b) => b.role === role).map((b) => b.z + b.depth));
    expect(frontOf('facade')).toBeGreaterThan(frontOf('carcass'));
    expect(frontOf('handle')).toBeGreaterThan(frontOf('facade'));
  });

  it('няма шкаф без лице, при каквато и да е кухня', () => {
    for (const needs of [
      DEFAULT_NEEDS,
      { ...DEFAULT_NEEDS, fridge: false, oven: false, dishwasher: false, hood: false },
      { ...DEFAULT_NEEDS, upperRow: 'none' as const },
      { ...DEFAULT_NEEDS, drawers: 'many' as const },
    ]) {
      for (const wall of [1200, 2400, 3600, 5000]) {
        const layout = autoLayout(wall, needs);
        const k = emptyKitchen(wall);
        k.walls[0] = { ...k.walls[0], base: layout.base, upper: layout.upper };
        const boxes = sceneFor(
          k,
          kitchenRoom(k),
          computeKitchen(k).placed,
          k.materials.worktop,
        );
        const faces = boxes.filter((b) => b.role === 'facade' || b.role === 'appliance').length;
        const modules = layout.base.length + layout.upper.length;
        expect(faces, `стена ${wall}, ${JSON.stringify(needs)}`).toBeGreaterThanOrEqual(modules);
      }
    }
  });

  it('без дръжки няма дръжки', () => {
    const layout = autoLayout(3600, DEFAULT_NEEDS);
    const k = emptyKitchen(3600);
    k.walls[0] = { ...k.walls[0], base: layout.base, upper: layout.upper };
    const result = computeKitchen(k);
    const boxes = sceneFor(k, kitchenRoom(k), result.placed, k.materials.worktop, 'push');
    expect(boxes.filter((b) => b.role === 'handle')).toHaveLength(0);
  });

  it('сянката ляга на пода пред шкафовете, вътре в стаята', () => {
    const { boxes } = build();
    const shadows = boxes.filter((b) => b.role === 'shadow');
    expect(shadows.length).toBeGreaterThan(0);
    for (const s of shadows) {
      expect(s.y).toBeLessThan(DIM.LEG);
      expect(s.z + s.depth).toBeLessThanOrEqual(room.depth);
      expect(s.x).toBeGreaterThanOrEqual(0);
    }
  });

  it('дълга стена в тясна стая не пробива зида', () => {
    // Плъзгачите позволяват 6 м кухня и 2 м стая; стаята трябва да се
    // разтегне, а не мебелта да излезе навън.
    const layout = autoLayout(6000, DEFAULT_NEEDS);
    const k = emptyKitchen(6000);
    k.room = { width: 2000, depth: 2000 };
    k.walls[0] = { ...k.walls[0], base: layout.base, upper: layout.upper };
    const grown = kitchenRoom(k);
    expect(grown.width).toBeGreaterThanOrEqual(6000);

    const boxes = sceneFor(k, grown, computeKitchen(k).placed, k.materials.worktop);
    for (const b of boxes) {
      if (OUTSIDE_OK.has(b.role)) continue;
      expect(b.x).toBeGreaterThanOrEqual(-1);
      expect(b.x + b.width).toBeLessThanOrEqual(grown.width + 1);
      expect(b.z + b.depth).toBeLessThanOrEqual(grown.depth + 1);
    }
  });

  it('малка стая с къса стена си остава малка', () => {
    const k = emptyKitchen(1500);
    k.room = { width: 1800, depth: 1600 };
    expect(kitchenRoom(k)).toEqual({ width: 1800, depth: 1600 });
  });

  it('зидът пред окото се маха, този зад кухнята остава', () => {
    const { boxes } = build();
    const walls = boxes.filter((b) => b.role === 'wall');
    // Стената с вратата е нарязана на стълбове и праг, затова се броят
    // посоките, а не обемите.
    const facing = (list: Box[]) =>
      new Set(list.map((w) => `${w.outward?.x},${w.outward?.z}`)).size;
    expect(facing(walls)).toBe(4);

    for (const yaw of [-1.2, -0.5, 0, 0.5, 1.2, 2.5, Math.PI]) {
      const c = { ...DEFAULT_CAMERA(room), yaw };
      const shown = walls.filter((w) => !wallInTheWay(w, c));
      // Винаги остава нещо за фон, но никога целият кош.
      expect(facing(shown), `yaw ${yaw}`).toBeGreaterThan(0);
      expect(facing(shown), `yaw ${yaw}`).toBeLessThan(4);
    }

    // Кухнята е до задния зид. Докато окото е пред стаята, той стои зад
    // мебелта и не ѝ пречи; обиколиш ли зад него, пада и той.
    const back = walls.find((w) => w.outward?.z === -1)!;
    for (const yaw of [-1.2, -0.5, 0, 0.5, 1.2]) {
      expect(wallInTheWay(back, { ...DEFAULT_CAMERA(room), yaw }), `отпред, yaw ${yaw}`).toBe(
        false,
      );
    }
    expect(wallInTheWay(back, { ...DEFAULT_CAMERA(room), yaw: Math.PI })).toBe(true);
  });

  it('кадърът е с постоянна форма, каквато и да е кухнята', () => {
    const shapes = [
      [1200, 2000, 3200],
      [3600, 4200, 3200],
      [6000, 6000, 2000],
    ].map(([wall, rw, rd]) => {
      const layout = autoLayout(wall, DEFAULT_NEEDS);
      const k = emptyKitchen(wall);
      k.room = { width: rw, depth: rd };
      k.walls[0] = { ...k.walls[0], base: layout.base, upper: layout.upper };
      const r = kitchenRoom(k);
      const boxes = sceneFor(k, r, computeKitchen(k).placed, k.materials.worktop);
      const [, , w, h] = viewBoxFor(boxes, DEFAULT_CAMERA(r)).split(' ').map(Number);
      return w / h;
    });
    for (const ratio of shapes) expect(ratio).toBeCloseTo(VIEW_ASPECT, 6);
  });

  it('кадърът не зависи от зидовете, за да не подскача при въртене', () => {
    const { boxes } = build();
    const withWalls = viewBoxFor(boxes, DEFAULT_CAMERA(room));
    const withoutWalls = viewBoxFor(
      boxes.filter((b) => b.role !== 'wall'),
      DEFAULT_CAMERA(room),
    );
    expect(withWalls).toBe(withoutWalls);
  });

  it('нито един зид не се рисува върху мебел, от който и да е ъгъл', () => {
    const { boxes } = build();
    for (const yaw of [-1.2, -0.5, 0, 0.5, 1.2]) {
      for (const pitch of [0, 0.22, 0.8]) {
        const faces = visibleFaces(boxes, { ...DEFAULT_CAMERA(room), yaw, pitch });
        const lastShell = faces.map((f) => f.role).findLastIndex((r) => SHELL.has(r));
        const firstFurniture = faces.findIndex((f) => !SHELL.has(f.role));
        expect(lastShell, `yaw ${yaw} pitch ${pitch}`).toBeLessThan(firstFurniture);
      }
    }
  });

  it('рисува се нещо видимо', () => {
    const { boxes } = build();
    const faces = visibleFaces(boxes, DEFAULT_CAMERA(room));
    expect(faces.length).toBeGreaterThan(10);
  });
});

describe('отваряне на вратите', () => {
  const build = (open: number, kind: 'kitchen' | 'bedroom' = 'kitchen') => {
    const layout =
      kind === 'bedroom'
        ? wardrobeLayout(3600, DEFAULT_BEDROOM)
        : autoLayout(3600, DEFAULT_NEEDS);
    const k = emptyKitchen(3600);
    k.roomKind = kind;
    k.walls[0] = { ...k.walls[0], base: layout.base, upper: layout.upper };
    return sceneFor(
      k,
      kitchenRoom(k),
      computeKitchen(k).placed,
      k.materials.worktop,
      'handles',
      open,
    );
  };

  it('затворено нищо не е завъртяно', () => {
    // Крилото на стаята стои отворено винаги — то не е вратичка на шкаф.
    expect(build(0).every((b) => b.role === 'door' || b.swing === undefined)).toBe(true);
  });

  it('отворено вратите се въртят, а уредите и блендите — не', () => {
    const boxes = build(1);
    expect(boxes.some((b) => b.swing)).toBe(true);
    expect(boxes.filter((b) => b.role === 'appliance').every((b) => !b.swing)).toBe(true);
    expect(boxes.filter((b) => b.role === 'carcass').every((b) => !b.swing)).toBe(true);
  });

  it('вратата излиза в стаята, не в зида', () => {
    // Кухнята е до горната стена и гледа към +Z; свободният ръб на
    // всяка отворена врата трябва да отиде пред корпуса.
    const closed = build(0).filter((b) => b.role === 'facade');
    const frontPlane = Math.max(...closed.map((b) => b.z + b.depth));

    for (const door of build(1).filter((b) => b.role === 'facade' && b.swing)) {
      const far = Math.max(
        ...boxFaces(door).flatMap((f) => f.corners.map((c) => c.z)),
      );
      expect(far).toBeGreaterThan(frontPlane);
    }
  });

  it('чекмеджетата се изтеглят напред, без да излизат от стаята', () => {
    const closed = build(0).filter((b) => b.role === 'facade');
    const opened = build(1).filter((b) => b.role === 'facade');
    const front = (list: typeof closed) => Math.max(...list.map((b) => b.z + b.depth));
    expect(front(opened)).toBeGreaterThan(front(closed));
  });

  it('рафтовете стоят вътре и при затворено, и при отворено', () => {
    for (const open of [0, 1]) {
      const shelves = build(open).filter((b) => b.role === 'shelf');
      expect(shelves.length, `при open=${open}`).toBeGreaterThan(0);
    }
  });

  it('гардеробът с лост получава лост на правилната височина', () => {
    const rods = build(1, 'bedroom').filter((b) => b.role === 'rod');
    expect(rods.length).toBeGreaterThan(0);
    for (const rod of rods) expect(rod.y).toBeCloseTo(DIM.ROD_HEIGHT, 0);
  });

  it('броят рафтове в обема съвпада с броя нарязани рафтове', () => {
    const k = emptyKitchen(3600);
    k.roomKind = 'bedroom';
    const layout = wardrobeLayout(3600, DEFAULT_BEDROOM);
    k.walls[0] = { ...k.walls[0], base: layout.base, upper: layout.upper };
    const result = computeKitchen(k);
    const drawn = sceneFor(k, kitchenRoom(k), result.placed, k.materials.worktop).filter(
      (b) => b.role === 'shelf',
    ).length;
    const cut = result.parts.filter((p) => /рафт/i.test(p.name)).reduce(
      (sum, p) => sum + (p.qty ?? 1),
      0,
    );
    expect(drawn).toBe(cut);
  });

  it('кадърът не мърда, докато вратите се отварят', () => {
    const cam = DEFAULT_CAMERA(room);
    expect(viewBoxFor(build(1), cam)).toBe(viewBoxFor(build(0), cam));
  });
});

describe('всеки шкаф сам за себе си', () => {
  const build = (open: number | Record<string, number>) => {
    const layout = autoLayout(3600, DEFAULT_NEEDS);
    const k = emptyKitchen(3600);
    k.walls[0] = { ...k.walls[0], base: layout.base, upper: layout.upper };
    return {
      modules: layout.base,
      boxes: sceneFor(
        k,
        kitchenRoom(k),
        computeKitchen(k).placed,
        k.materials.worktop,
        'handles',
        open,
      ),
    };
  };

  it('всяко лице знае на кой модул е', () => {
    const { boxes } = build(0);
    for (const b of boxes) {
      if (b.role === 'facade' || b.role === 'handle' || b.role === 'shelf') {
        expect(b.moduleId, b.role).toBeTruthy();
      }
    }
  });

  it('отваря се само посоченият шкаф', () => {
    const { modules } = build(0);
    const one = modules.find((m) => m.kind === 'sink')!;
    const { boxes } = build({ [one.id]: 1 });
    const swung = boxes.filter((b) => b.swing && b.role !== 'door');
    expect(swung.length).toBeGreaterThan(0);
    for (const b of swung) expect(b.moduleId).toBe(one.id);
  });

  it('наполовина отворена врата стои между затворената и отворената', () => {
    const angle = (open: number) => {
      const one = build(0).modules.find((m) => m.kind === 'sink')!;
      const box = build({ [one.id]: open }).boxes.find((b) => b.swing && b.role === 'facade');
      return Math.abs(box?.swing?.angle ?? 0);
    };
    expect(angle(0.5)).toBeGreaterThan(0);
    expect(angle(0.5)).toBeLessThan(angle(1));
  });
});

describe('рафтове по мярка на шкафа', () => {
  const kitchenWith = (shelves?: number) => {
    const layout = autoLayout(3600, DEFAULT_NEEDS);
    const target = layout.base.find((m) => m.kind === 'sink')!;
    const base = layout.base.map((m) => (m.id === target.id ? { ...m, shelves } : m));
    const k = emptyKitchen(3600);
    k.walls[0] = { ...k.walls[0], base, upper: layout.upper };
    const result = computeKitchen(k);
    return {
      target,
      result,
      boxes: sceneFor(k, kitchenRoom(k), result.placed, k.materials.worktop),
    };
  };

  it('повече рафтове в шкафа значи повече рафтове в обема', () => {
    const before = kitchenWith(undefined).boxes.filter((b) => b.role === 'shelf').length;
    const after = kitchenWith(4).boxes.filter((b) => b.role === 'shelf').length;
    // Мивката тръгва без рафтове, затова четири са четири повече.
    expect(after).toBe(before + 4);
  });

  it('и повече нарязани рафтове в разбивката', () => {
    const cut = (r: ReturnType<typeof kitchenWith>) =>
      r.result.parts.filter((p) => /рафт/i.test(p.name)).reduce((s, p) => s + (p.qty ?? 1), 0);
    expect(cut(kitchenWith(4))).toBe(cut(kitchenWith(undefined)) + 4);
  });

  it('нула рафта значи нула нарязани рафта в този шкаф', () => {
    const withFour = kitchenWith(4);
    const code = withFour.result.placed[0].base.find((m) => m.id === withFour.target.id)!.code;
    const shelvesOf = (r: ReturnType<typeof kitchenWith>) =>
      r.result.cabinets.find((c) => c.code === code)?.parts.filter((p) => /рафт/i.test(p.name))
        .length ?? 0;
    expect(shelvesOf(withFour)).toBe(4);
    expect(shelvesOf(kitchenWith(0))).toBe(0);
  });

  it('броят се ограничава, за да не се поиска абсурд', () => {
    const { boxes } = kitchenWith(999);
    const one = boxes.filter((b) => b.role === 'shelf' && b.moduleId);
    expect(one.length).toBeLessThan(40);
  });
});

describe('рафт влиза само там, където има къде', () => {
  it('шкафът с чекмеджета и панелът на уреда не приемат рафтове', () => {
    expect(acceptsShelves('drawers')).toBe(false);
    expect(acceptsShelves('oven')).toBe(false);
    expect(acceptsShelves('dw')).toBe(false);
    expect(acceptsShelves('lgap')).toBe(false);
    expect(acceptsShelves('wardrobe-drawers')).toBe(false);
    expect(acceptsShelves('tv')).toBe(false);
  });

  it('шкафовете с врата и отворените секции приемат', () => {
    for (const kind of ['door', 'upper', 'sink', 'wardrobe', 'bookcase', 'lowboard'] as const) {
      expect(acceptsShelves(kind), kind).toBe(true);
    }
  });

  it('поискан рафт в шкаф с чекмеджета се пренебрегва, не се рисува и не се реже', () => {
    const layout = autoLayout(3600, DEFAULT_NEEDS);
    const target = layout.base.find((m) => m.kind === 'drawers')!;
    const base = layout.base.map((m) => (m.id === target.id ? { ...m, shelves: 5 } : m));
    const k = emptyKitchen(3600);
    k.walls[0] = { ...k.walls[0], base, upper: layout.upper };
    const result = computeKitchen(k);

    expect(shelfCount({ kind: 'drawers', shelves: 5 })).toBe(0);
    const code = result.placed[0].base.find((m) => m.id === target.id)!.code;
    const cabinet = result.cabinets.find((c) => c.code === code);
    expect(cabinet?.parts.some((p) => /рафт/i.test(p.name))).toBe(false);

    const drawn = sceneFor(k, kitchenRoom(k), result.placed, k.materials.worktop).filter(
      (b) => b.role === 'shelf' && b.moduleId === target.id,
    );
    expect(drawn).toHaveLength(0);
  });
});

describe('обзавеждане', () => {
  const withSofa = (rotation = 0) => {
    const layout = livingLayout(4200, DEFAULT_LIVING);
    const k = emptyKitchen(4200);
    k.roomKind = 'living';
    k.walls[0] = { ...k.walls[0], base: layout.base, upper: layout.upper };
    k.furnishings = [
      { id: 'f1', kind: 'sofa', x: 2100, z: 2000, rotation },
      { id: 'f2', kind: 'coffee-table', x: 2100, z: 1200, rotation: 0 },
    ];
    const result = computeKitchen(k);
    return { k, result, boxes: sceneFor(k, kitchenRoom(k), result.placed, k.materials.worktop) };
  };

  it('не влиза в разкроя, в обкова и в номерацията', () => {
    const bare = (() => {
      const { k } = withSofa();
      const without = { ...k, furnishings: [] };
      return computeKitchen(without);
    })();
    const { result } = withSofa();
    expect(result.parts.length).toBe(bare.parts.length);
    expect(result.cabinets.length).toBe(bare.cabinets.length);
    expect(result.hardware).toEqual(bare.hardware);
  });

  it('стои на пода и се вижда в сцената', () => {
    const soft = withSofa().boxes.filter((b) => b.role === 'soft');
    const wood = withSofa().boxes.filter((b) => b.role === 'wood');
    expect(soft.length).toBeGreaterThan(0);
    expect(wood.length).toBeGreaterThan(0);
    for (const b of [...soft, ...wood]) expect(b.y).toBeGreaterThanOrEqual(0);
  });

  it('завъртането го върти около собствения му център', () => {
    const straight = withSofa(0).boxes.filter((b) => b.moduleId === 'f1');
    const turned = withSofa(Math.PI / 2).boxes.filter((b) => b.moduleId === 'f1');
    expect(turned.every((b) => b.swing)).toBe(true);

    const spread = (list: typeof straight) => {
      const pts = list.flatMap((b) => boxFaces(b).flatMap((f) => f.corners));
      return {
        x: Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x)),
        z: Math.max(...pts.map((p) => p.z)) - Math.min(...pts.map((p) => p.z)),
      };
    };
    // Диванът е по-широк, отколкото дълбок; на четвърт оборот става обратното.
    const a = spread(straight);
    const b = spread(turned);
    expect(a.x).toBeGreaterThan(a.z);
    expect(b.z).toBeGreaterThan(b.x);
  });

  it('всяко изделие носи своята самоличност, за да се влачи', () => {
    const ids = new Set(
      withSofa()
        .boxes.filter((b) => b.role === 'soft' || b.role === 'wood')
        .map((b) => b.moduleId),
    );
    expect(ids).toEqual(new Set(['f1', 'f2']));
  });
});

describe('обратна проекция към пода', () => {
  it('точка от пода, проектирана и върната, е същата', () => {
    for (const c of [cam(), cam({ yaw: 0.9, pitch: 0.5 }), cam({ yaw: -1.4, pitch: 0.05 })]) {
      for (const p of [
        { x: 500, y: 0, z: 500 },
        { x: 3000, y: 0, z: 2000 },
        { x: 1200, y: 0, z: 2900 },
      ]) {
        const screen = project(p, c);
        const back = floorPointAt(screen.x, screen.y, c);
        expect(back.x).toBeCloseTo(p.x, 3);
        expect(back.z).toBeCloseTo(p.z, 3);
        expect(back.y).toBe(0);
      }
    }
  });
});

describe('всеки обем има свой ключ', () => {
  it('никакви повторения, включително с обзавеждане', () => {
    const layout = livingLayout(4200, DEFAULT_LIVING);
    const k = emptyKitchen(4200);
    k.roomKind = 'living';
    k.walls[0] = { ...k.walls[0], base: layout.base, upper: layout.upper };
    k.furnishings = [
      { id: 'f1', kind: 'sofa', x: 2100, z: 2000, rotation: 0 },
      { id: 'f2', kind: 'armchair', x: 900, z: 2000, rotation: 0 },
      { id: 'f3', kind: 'coffee-table', x: 2100, z: 1300, rotation: 0 },
    ];
    const boxes = sceneFor(k, kitchenRoom(k), computeKitchen(k).placed, k.materials.worktop);

    const keys = boxes.map((b) => b.key);
    expect(keys.every(Boolean), 'обем без ключ').toBe(true);
    expect(new Set(keys).size).toBe(keys.length);

    const faceKeys = visibleFaces(boxes, DEFAULT_CAMERA(kitchenRoom(k))).map((f) => f.key);
    expect(new Set(faceKeys).size).toBe(faceKeys.length);
  });
});

describe('кое може да се отвори', () => {
  it('шкафовете с врата, чела и панел се отварят', () => {
    for (const kind of ['door', 'upper', 'sink', 'drawers', 'column', 'hood', 'dw',
                        'wardrobe', 'attic', 'wardrobe-drawers', 'tv', 'lowboard',
                        'wallbox'] as const) {
      expect(canOpen(kind), kind).toBe(true);
    }
  });

  it('отворените секции, рафтовете и нишите нямат какво да отворят', () => {
    for (const kind of ['wardrobe-open', 'bookcase', 'wallshelf', 'lgap', 'ugap',
                        'wgap', 'vgap'] as const) {
      expect(canOpen(kind), kind).toBe(false);
    }
  });

  it('фурната е уред, не наша врата', () => {
    expect(canOpen('oven')).toBe(false);
  });
});

describe('хвърлени сенки', () => {
  const room2 = { width: 4000, depth: 3000 };

  it('по-високото хвърля по-далечна сянка', () => {
    const low = dropToFloor({ x: 2000, y: 300, z: 1500 });
    const high = dropToFloor({ x: 2000, y: 1800, z: 1500 });
    const away = (p: { x: number; z: number }) => Math.hypot(p.x - 2000, p.z - 1500);
    expect(away(high)).toBeGreaterThan(away(low));
  });

  it('точка на пода си остава на място', () => {
    const p = dropToFloor({ x: 1200, y: 0, z: 900 });
    expect(p.x).toBeCloseTo(1200, 6);
    expect(p.z).toBeCloseTo(900, 6);
  });

  it('обвивката обхваща всички точки и е изпъкнала', () => {
    const pts = [
      { x: 0, z: 0 },
      { x: 10, z: 0 },
      { x: 10, z: 10 },
      { x: 0, z: 10 },
      { x: 5, z: 5 },
    ];
    const hull = convexHull(pts);
    expect(hull).toHaveLength(4);
    expect(hull.some((p) => p.x === 5 && p.z === 5)).toBe(false);
  });

  it('сянката се реже по пода, не пада извън стаята', () => {
    const wide = clipToRoom(
      [
        { x: -2000, z: -2000 },
        { x: 9000, z: -2000 },
        { x: 9000, z: 9000 },
        { x: -2000, z: 9000 },
      ],
      room2,
    );
    for (const p of wide) {
      expect(p.x).toBeGreaterThanOrEqual(-0.001);
      expect(p.x).toBeLessThanOrEqual(room2.width + 0.001);
      expect(p.z).toBeGreaterThanOrEqual(-0.001);
      expect(p.z).toBeLessThanOrEqual(room2.depth + 0.001);
    }
  });

  it('тяло в стаята хвърля сянка, която ляга на пода', () => {
    const box: Box = {
      x: 1500,
      y: 100,
      z: 500,
      width: 600,
      height: 700,
      depth: 560,
      role: 'carcass',
      facing: 'top',
    };
    const shape = castShadow(box, room2)!;
    expect(shape.length).toBeGreaterThanOrEqual(3);
    for (const p of shape) expect(p.y).toBe(2);
  });

  it('кухнята хвърля сенки и те не се въртят повторно', () => {
    const layout = autoLayout(3600, DEFAULT_NEEDS);
    const k = emptyKitchen(3600);
    k.walls[0] = { ...k.walls[0], base: layout.base, upper: layout.upper };
    const open = Object.fromEntries(layout.base.map((m) => [m.id, 1]));
    const boxes = sceneFor(
      k,
      kitchenRoom(k),
      computeKitchen(k).placed,
      k.materials.worktop,
      'handles',
      open,
    );
    const shadows = boxes.filter((b) => b.role === 'shadow' && b.shape);
    expect(shadows.length).toBeGreaterThan(5);
    expect(shadows.every((b) => b.swing === undefined)).toBe(true);
  });
});

describe('вратата на стаята в обема', () => {
  const build = (door?: Partial<RoomDoor>) => {
    const layout = autoLayout(3600, DEFAULT_NEEDS);
    const k = emptyKitchen(3600);
    k.walls[0] = { ...k.walls[0], base: layout.base, upper: layout.upper };
    const r = kitchenRoom(k);
    if (door) k.door = { ...defaultDoor(r, 'top'), ...door };
    return { k, room: r, boxes: sceneFor(k, r, computeKitchen(k).placed, k.materials.worktop) };
  };

  it('стаята винаги има отвор, каса и крило', () => {
    const roles = new Set(build().boxes.map((b) => b.role));
    for (const role of ['doorway', 'casing', 'door']) expect(roles, role).toContain(role);
  });

  it('зидът с вратата се разпада на стълбове и праг, другите остават цели', () => {
    for (const side of WALL_SIDES) {
      const { boxes } = build({ side });
      const walls = boxes.filter((b) => b.role === 'wall');
      // Три къса на пробитата стена плюс три цели.
      expect(walls.length, side).toBe(6);
    }
  });

  it('няма зид пред самия отвор', () => {
    const { k, room, boxes } = build({ side: 'top', x: 1200, width: 800 });
    const door = kitchenDoor(k);
    const span = doorSpan(room, door);
    const inTheHole = boxes.filter(
      (b) =>
        b.role === 'wall' &&
        b.z < 0 &&
        b.x < span.to - 1 &&
        b.x + b.width > span.from + 1 &&
        b.y < door.height - 1,
    );
    expect(inTheHole).toHaveLength(0);
  });

  it('отворът е точно толкова широк, колкото е вратата', () => {
    const { k, room, boxes } = build({ side: 'top', x: 1200, width: 900 });
    const span = doorSpan(room, kitchenDoor(k));
    const pillars = boxes.filter((b) => b.role === 'wall' && b.z < 0 && b.y === 0);
    const right = pillars.find((b) => b.x >= span.to - 1)!;
    const left = pillars.find((b) => b.x + b.width <= span.from + 1)!;
    expect(left.x + left.width).toBe(span.from);
    expect(right.x).toBe(span.to);
  });

  it('крилото се завърта в стаята, а не през зида', () => {
    for (const side of WALL_SIDES) {
      for (const hinge of ['left', 'right'] as const) {
        const { room, boxes } = build({ side, hinge });
        const leaf = boxes.find((b) => b.role === 'door')!;
        expect(leaf.swing, `${side}/${hinge}`).toBeDefined();
        for (const corner of boxFaces(leaf).flatMap((f) => f.corners)) {
          expect(corner.x, `${side}/${hinge} x`).toBeGreaterThan(-200);
          expect(corner.x, `${side}/${hinge} x`).toBeLessThan(room.width + 200);
          expect(corner.z, `${side}/${hinge} z`).toBeGreaterThan(-200);
          expect(corner.z, `${side}/${hinge} z`).toBeLessThan(room.depth + 200);
        }
      }
    }
  });

  it('крилото виси на пантите и не се откача от тях', () => {
    for (const side of WALL_SIDES) {
      const { k, room, boxes } = build({ side });
      const hinge = doorHingePoint(room, kitchenDoor(k));
      const leaf = boxes.find((b) => b.role === 'door')!;
      const corners = boxFaces(leaf).flatMap((f) => f.corners);
      const nearest = Math.min(
        ...corners.map((c) => Math.hypot(c.x - hinge.x, c.z - hinge.y)),
      );
      expect(nearest, side).toBeLessThan(80);
    }
  });

  it('тъмнината отвъд стои в отвора, а не стърчи извън зида', () => {
    for (const side of WALL_SIDES) {
      const { boxes } = build({ side });
      const dark = boxes.find((b) => b.role === 'doorway')!;
      expect(dark.x, side).toBeGreaterThan(-200);
      expect(dark.z, side).toBeGreaterThan(-200);
    }
  });

  it('вратата пада зад зида си и изчезва заедно с него', () => {
    const { room, boxes } = build({ side: 'bottom' });
    // Окото стои пред долната стена — тя се маха, с нея и вратата.
    const cam = DEFAULT_CAMERA(room);
    const shown = boxes.filter((b) => !wallInTheWay(b, cam)).map((b) => b.role);
    expect(shown).not.toContain('door');
    expect(shown).not.toContain('doorway');
  });
});

describe('към коя стена гледа камерата', () => {
  it('отпред се виждат задната и едната странична, не всички', () => {
    const c = DEFAULT_CAMERA(room);
    const shown = WALL_SIDES.filter((side) => sideVisible(room, side, c));
    expect(shown).toContain('top');
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.length).toBeLessThan(4);
  });

  it('за всяка стена има изглед, от който се вижда', () => {
    for (const side of WALL_SIDES) {
      const turned = cameraFacing(room, side, 'top', DEFAULT_CAMERA(room));
      expect(sideVisible(room, side, turned), side).toBe(true);
    }
  });

  it('мебелта никога не остава с гръб към окото', () => {
    for (const side of WALL_SIDES) {
      const turned = cameraFacing(room, side, 'top', DEFAULT_CAMERA(room));
      expect(sideVisible(room, 'top', turned), side).toBe(true);
    }
  });

  it('стената, през която се гледа, се показва с вдигане, не с обикаляне', () => {
    const c = DEFAULT_CAMERA(room);
    const near = WALL_SIDES.find((s) => !sideVisible(room, s, c) && s !== 'left')!;
    const turned = cameraFacing(room, near, 'top', c);
    expect(turned.pitch).toBeGreaterThan(c.pitch);
    expect(turned.yaw).toBe(c.yaw);
  });

  it('вече видима стена не върти изгледа напразно', () => {
    const c = DEFAULT_CAMERA(room);
    expect(cameraFacing(room, 'top', 'top', c)).toBe(c);
  });

  it('работи и в тясна, и в широка стая', () => {
    for (const r of [{ width: 2000, depth: 2000 }, { width: 7000, depth: 5000 }]) {
      for (const side of WALL_SIDES) {
        const turned = cameraFacing(r, side, 'top', DEFAULT_CAMERA(r));
        expect(sideVisible(r, side, turned), `${r.width}/${side}`).toBe(true);
      }
    }
  });

  it('зидовете обграждат стаята от четирите страни', () => {
    for (const side of WALL_SIDES) {
      const w = shellWall(room, side);
      expect(w.role, side).toBe('wall');
      expect(w.outward, side).toBeDefined();
      expect(w.height, side).toBeGreaterThan(2000);
    }
    const normals = WALL_SIDES.map((s) => {
      const o = shellWall(room, s).outward!;
      return `${o.x},${o.z}`;
    });
    expect(new Set(normals).size).toBe(4);
  });
});

describe('зид с отвори', () => {
  const wall = (): Omit<Box, 'role' | 'facing'> => ({
    x: 0,
    y: 0,
    z: 0,
    width: 4000,
    height: 2600,
    depth: 120,
  });

  const total = (pieces: { width: number; height: number }[]) =>
    pieces.reduce((sum, p) => sum + p.width * p.height, 0);

  it('зид без отвори си остава един обем', () => {
    expect(wallWithHoles(wall(), 'x', [])).toEqual([wall()]);
  });

  it('отвор извън стената не я реже', () => {
    expect(wallWithHoles(wall(), 'x', [{ from: 9000, to: 9800, bottom: 0, top: 2000 }])).toEqual([
      wall(),
    ]);
  });

  it('врата до пода оставя два стълба и праг', () => {
    const pieces = wallWithHoles(wall(), 'x', [{ from: 1000, to: 1800, bottom: 0, top: 2040 }]);
    expect(pieces).toHaveLength(3);
    // Площта на зида намалява точно с площта на отвора.
    expect(total(pieces)).toBe(4000 * 2600 - 800 * 2040);
  });

  it('прозорец оставя и парапет под себе си', () => {
    const pieces = wallWithHoles(wall(), 'x', [{ from: 1000, to: 2200, bottom: 900, top: 2300 }]);
    // Два стълба, парапет и праг.
    expect(pieces).toHaveLength(4);
    expect(total(pieces)).toBe(4000 * 2600 - 1200 * 1400);
  });

  it('врата и два прозореца на една стена се броят заедно', () => {
    const pieces = wallWithHoles(wall(), 'x', [
      { from: 200, to: 1000, bottom: 0, top: 2040 },
      { from: 1400, to: 2200, bottom: 900, top: 2300 },
      { from: 2600, to: 3400, bottom: 900, top: 2300 },
    ]);
    expect(total(pieces)).toBe(4000 * 2600 - 800 * 2040 - 2 * 800 * 1400);
  });

  it('нито едно парче не влиза в отвор', () => {
    const holes = [
      { from: 200, to: 1000, bottom: 0, top: 2040 },
      { from: 1400, to: 2200, bottom: 900, top: 2300 },
    ];
    for (const p of wallWithHoles(wall(), 'x', holes)) {
      for (const h of holes) {
        const overlaps =
          p.x < h.to && h.from < p.x + p.width && p.y < h.top && h.bottom < p.y + p.height;
        expect(overlaps, `${p.x}..${p.x + p.width} / ${p.y}..${p.y + p.height}`).toBe(false);
      }
    }
  });

  it('застъпени отвори не оставят зид между тях', () => {
    const pieces = wallWithHoles(wall(), 'x', [
      { from: 1000, to: 2000, bottom: 0, top: 2000 },
      { from: 1800, to: 2600, bottom: 0, top: 2000 },
    ]);
    expect(total(pieces)).toBe(4000 * 2600 - 1600 * 2000);
  });

  it('работи и по другата ос', () => {
    const side: Omit<Box, 'role' | 'facing'> = {
      x: 0,
      y: 0,
      z: 0,
      width: 120,
      height: 2600,
      depth: 3200,
    };
    const pieces = wallWithHoles(side, 'z', [{ from: 800, to: 1600, bottom: 0, top: 2040 }]);
    expect(pieces).toHaveLength(3);
    expect(pieces.reduce((s, p) => s + p.depth * p.height, 0)).toBe(3200 * 2600 - 800 * 2040);
  });
});

describe('прозорецът в обема', () => {
  const build = (windows: RoomWindow[]) => {
    const layout = autoLayout(3600, DEFAULT_NEEDS);
    const k = emptyKitchen(3600);
    k.walls[0] = { ...k.walls[0], base: layout.base, upper: layout.upper };
    k.windows = windows;
    const r = kitchenRoom(k);
    return { k, room: r, boxes: sceneFor(k, r, computeKitchen(k).placed, k.materials.worktop) };
  };

  const aWindow = (over: Partial<RoomWindow> = {}): RoomWindow => ({
    id: 'w1',
    side: 'top',
    x: 1000,
    width: 1200,
    sill: 900,
    height: 1400,
    ...over,
  });

  it('стая без прозорци няма стъкло', () => {
    expect(build([]).boxes.some((b) => b.role === 'glass')).toBe(false);
  });

  it('прозорецът носи стъкло, рамка и перваз', () => {
    const { boxes } = build([aWindow()]);
    expect(boxes.filter((b) => b.role === 'glass')).toHaveLength(1);
    expect(boxes.filter((b) => b.role === 'casing').length).toBeGreaterThan(8);
  });

  it('стъклото стои на своя парапет, не на пода', () => {
    const { boxes } = build([aWindow({ sill: 900, height: 1400 })]);
    const glass = boxes.find((b) => b.role === 'glass')!;
    expect(glass.y).toBeGreaterThanOrEqual(900);
    expect(glass.y + glass.height).toBeLessThanOrEqual(2300);
  });

  it('стои на всяка от четирите стени, без да излиза от стаята', () => {
    for (const side of WALL_SIDES) {
      const { room, boxes } = build([aWindow({ side })]);
      const glass = boxes.find((b) => b.role === 'glass')!;
      expect(glass, side).toBeDefined();
      expect(glass.x, side).toBeGreaterThan(-300);
      expect(glass.x + glass.width, side).toBeLessThan(room.width + 300);
      expect(glass.z, side).toBeGreaterThan(-300);
      expect(glass.z + glass.depth, side).toBeLessThan(room.depth + 300);
    }
  });

  it('два прозореца дават две стъкла', () => {
    const { boxes } = build([aWindow(), aWindow({ id: 'w2', side: 'left', x: 400 })]);
    expect(boxes.filter((b) => b.role === 'glass')).toHaveLength(2);
  });

  it('зидът се отваря точно там, където е прозорецът', () => {
    const { room, boxes } = build([aWindow({ side: 'top', x: 1000, width: 1200 })]);
    const span = windowSpan(room, aWindow({ side: 'top', x: 1000, width: 1200 }));
    const inTheHole = boxes.filter(
      (b) =>
        b.role === 'wall' &&
        b.z < 0 &&
        b.x < span.to - 1 &&
        b.x + b.width > span.from + 1 &&
        b.y < 2300 - 1 &&
        b.y + b.height > 900 + 1,
    );
    expect(inTheHole).toHaveLength(0);
  });

  it('под прозореца остава зид — парапетът', () => {
    const { boxes } = build([aWindow({ side: 'top', x: 1000, width: 1200, sill: 900 })]);
    const under = boxes.filter(
      (b) => b.role === 'wall' && b.z < 0 && b.y === 0 && b.height <= 900 && b.x >= 1000,
    );
    expect(under.length).toBeGreaterThan(0);
  });
});
