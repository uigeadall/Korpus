/**
 * Състоянието на конфигуратора — редуктор без React, за да е тестваем.
 *
 * Кухнята е в стая с няколко стени. Действията, които пипат модул, го
 * намират по негов идентификатор — той е уникален през всички стени.
 * Само добавянето и дължината трябва да им се каже коя стена.
 */

import {
  type HingeSide,
  type Kitchen,
  type KitchenModule,
  MODULES,
  type Materials,
  type ModuleKind,
  OPENING_DEFAULT,
  clampOpening,
  type OpeningKind,
  type Room,
  type RowId,
  type WallOpening,
  RULES_VERSION,
  type Wall,
  type WallSide,
  WALL_SIDES,
  clampRoom,
  clampWallLength,
  emptyKitchen,
  freeSides,
  kitchenRoom,
  sideLength,
  toOtherRow,
  wallSide,
} from '@/lib/cabinet-rules';

export type Action =
  | { type: 'wallLength'; wallId: string; value: number }
  | { type: 'add'; wallId: string; row: RowId; kind: ModuleKind }
  | { type: 'remove'; id: string }
  | { type: 'width'; id: string; value: number }
  | { type: 'hinge'; id: string; value: HingeSide }
  | { type: 'move'; id: string; dir: -1 | 1 }
  | { type: 'reorder'; id: string; toIndex: number }
  | { type: 'moveToRow'; id: string; toIndex: number }
  | { type: 'addWall'; side?: WallSide }
  | { type: 'removeWall'; wallId: string }
  | { type: 'addOpening'; wallId: string; kind: OpeningKind }
  | { type: 'opening'; id: string; value: Partial<Omit<WallOpening, 'id' | 'kind'>> }
  | { type: 'removeOpening'; id: string }
  | { type: 'room'; value: Partial<Room> }
  | { type: 'materials'; value: Partial<Materials> }
  | { type: 'load'; value: Kitchen }
  | { type: 'reset' };

let counter = 0;
export function moduleId(kind: ModuleKind): string {
  counter += 1;
  return `${kind}-${Date.now().toString(36)}-${counter}`;
}

export function wallId(): string {
  counter += 1;
  return `wall-${Date.now().toString(36)}-${counter}`;
}

export function openingId(kind: OpeningKind): string {
  counter += 1;
  return `${kind}-${Date.now().toString(36)}-${counter}`;
}

export { OPENING_LIMITS } from '@/lib/cabinet-rules';

export { clampWallLength as clampWall } from '@/lib/cabinet-rules';

/** Ширина по подразбиране: средната от каталога, за да не е винаги най-малката. */
export function defaultWidth(kind: ModuleKind): number {
  const widths = MODULES[kind].widths;
  return widths.includes(600) ? 600 : widths[Math.floor(widths.length / 2)];
}

function rowOf(kind: ModuleKind): RowId {
  return MODULES[kind].row;
}

/** Стената, в чийто ред стои модулът с този идентификатор. */
export function wallOfModule(kitchen: Kitchen, id: string): Wall | undefined {
  return kitchen.walls.find(
    (w) => w.base.some((m) => m.id === id) || w.upper.some((m) => m.id === id),
  );
}

/** Прилага промяна върху редовете на една стена и връща нова кухня. */
function withWall(
  kitchen: Kitchen,
  id: string | undefined,
  fn: (base: KitchenModule[], upper: KitchenModule[]) => void,
): Kitchen {
  const index = kitchen.walls.findIndex((w) => w.id === id);
  if (index < 0) return kitchen;
  const wall = kitchen.walls[index];
  const base = [...wall.base];
  const upper = [...wall.upper];
  fn(base, upper);
  const walls = [...kitchen.walls];
  walls[index] = { ...wall, base, upper };
  return { ...kitchen, walls };
}

/** Същото, но стената се намира по модула, който се пипа. */
function withWallOf(
  kitchen: Kitchen,
  moduleId: string,
  fn: (base: KitchenModule[], upper: KitchenModule[]) => void,
): Kitchen {
  return withWall(kitchen, wallOfModule(kitchen, moduleId)?.id, fn);
}

function rowOfModule(kitchen: Kitchen, id: string): RowId | null {
  const wall = wallOfModule(kitchen, id);
  if (!wall) return null;
  return wall.base.some((m) => m.id === id) ? 'base' : 'upper';
}

export function reducer(kitchen: Kitchen, action: Action): Kitchen {
  switch (action.type) {
    case 'wallLength': {
      const index = kitchen.walls.findIndex((w) => w.id === action.wallId);
      if (index < 0) return kitchen;
      const walls = [...kitchen.walls];
      walls[index] = { ...walls[index], length: clampWallLength(action.value) };
      return { ...kitchen, walls };
    }

    case 'add': {
      const kind = action.kind;
      const spec = MODULES[kind];
      const m: KitchenModule = {
        id: moduleId(kind),
        kind,
        width: defaultWidth(kind),
        hingeSide: spec.hasCarcass || kind === 'dw' ? 'right' : undefined,
      };
      return withWall(kitchen, action.wallId, (base, upper) => {
        (rowOf(kind) === 'base' ? base : upper).push(m);
      });
    }

    case 'remove':
      return withWallOf(kitchen, action.id, (base, upper) => {
        for (const list of [base, upper]) {
          const i = list.findIndex((m) => m.id === action.id);
          if (i >= 0) list.splice(i, 1);
        }
      });

    case 'width':
      return withWallOf(kitchen, action.id, (base, upper) => {
        for (const list of [base, upper]) {
          const i = list.findIndex((m) => m.id === action.id);
          if (i >= 0) list[i] = { ...list[i], width: action.value };
        }
      });

    case 'hinge':
      return withWallOf(kitchen, action.id, (base, upper) => {
        for (const list of [base, upper]) {
          const i = list.findIndex((m) => m.id === action.id);
          if (i >= 0) list[i] = { ...list[i], hingeSide: action.value };
        }
      });

    case 'move': {
      const row = rowOfModule(kitchen, action.id);
      if (!row) return kitchen;
      return withWallOf(kitchen, action.id, (base, upper) => {
        const list = row === 'base' ? base : upper;
        const i = list.findIndex((m) => m.id === action.id);
        const j = i + action.dir;
        if (i < 0 || j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
      });
    }

    case 'reorder': {
      const row = rowOfModule(kitchen, action.id);
      if (!row) return kitchen;
      return withWallOf(kitchen, action.id, (base, upper) => {
        const list = row === 'base' ? base : upper;
        const from = list.findIndex((m) => m.id === action.id);
        const to = Math.min(list.length - 1, Math.max(0, action.toIndex));
        if (from < 0 || from === to) return;
        const [moved] = list.splice(from, 1);
        list.splice(to, 0, moved);
      });
    }

    case 'moveToRow': {
      const row = rowOfModule(kitchen, action.id);
      if (!row) return kitchen;
      return withWallOf(kitchen, action.id, (base, upper) => {
        const from = row === 'base' ? base : upper;
        const to = row === 'base' ? upper : base;
        const i = from.findIndex((m) => m.id === action.id);
        if (i < 0) return;
        const converted = toOtherRow(from[i]);
        if (!converted) return;
        from.splice(i, 1);
        to.splice(Math.min(to.length, Math.max(0, action.toIndex)), 0, converted);
      });
    }

    case 'addWall': {
      const used = kitchen.walls.map((w, i) => wallSide(w, i));
      const free = freeSides(used);
      const side = action.side && free.includes(action.side) ? action.side : free[0];
      if (!side) return kitchen; // и четирите страни са заети
      const room = kitchenRoom(kitchen);
      return {
        ...kitchen,
        room,
        walls: [
          ...kitchen.walls,
          {
            id: wallId(),
            side,
            length: clampWallLength(sideLength(room, side)),
            base: [],
            upper: [],
          },
        ],
      };
    }

    case 'removeWall': {
      // Последната стена не се маха — кухнята трябва да стои някъде.
      if (kitchen.walls.length <= 1) return kitchen;
      const walls = kitchen.walls.filter((w) => w.id !== action.wallId);
      return walls.length === kitchen.walls.length ? kitchen : { ...kitchen, walls };
    }

    case 'addOpening': {
      const index = kitchen.walls.findIndex((w) => w.id === action.wallId);
      if (index < 0) return kitchen;
      const wall = kitchen.walls[index];
      const spec = OPENING_DEFAULT[action.kind];
      const used = wall.openings ?? [];
      // Новият отвор застава след последния, за да не се застъпват.
      const x = used.length ? Math.max(...used.map((o) => o.x + o.width)) + 100 : 0;
      const walls = [...kitchen.walls];
      walls[index] = {
        ...wall,
        openings: [
          ...used,
          {
            id: openingId(action.kind),
            kind: action.kind,
            x: Math.max(0, Math.min(x, Math.max(0, wall.length - spec.width))),
            ...spec,
          },
        ],
      };
      return { ...kitchen, walls };
    }

    case 'opening': {
      const index = kitchen.walls.findIndex((w) => w.openings?.some((o) => o.id === action.id));
      if (index < 0) return kitchen;
      const wall = kitchen.walls[index];
      const walls = [...kitchen.walls];
      walls[index] = {
        ...wall,
        openings: (wall.openings ?? []).map((o) =>
          o.id === action.id ? clampOpening({ ...o, ...action.value }, wall.length) : o,
        ),
      };
      return { ...kitchen, walls };
    }

    case 'removeOpening': {
      const index = kitchen.walls.findIndex((w) => w.openings?.some((o) => o.id === action.id));
      if (index < 0) return kitchen;
      const wall = kitchen.walls[index];
      const walls = [...kitchen.walls];
      walls[index] = {
        ...wall,
        openings: (wall.openings ?? []).filter((o) => o.id !== action.id),
      };
      return { ...kitchen, walls };
    }

    case 'room': {
      const current = kitchenRoom(kitchen);
      return {
        ...kitchen,
        room: {
          width: clampRoom(action.value.width ?? current.width),
          depth: clampRoom(action.value.depth ?? current.depth),
        },
      };
    }

    case 'materials':
      return { ...kitchen, materials: { ...kitchen.materials, ...action.value } };

    case 'load':
      return migrate(action.value);

    case 'reset':
      return emptyKitchen(kitchen.walls[0].length);

    default:
      return kitchen;
  }
}

/**
 * Конфигурация отвън (стар запис в браузъра или линк) се докарва до
 * днешния вид: всяка стена с идентификатор и страна, записана стая.
 */
export function migrate(kitchen: Kitchen): Kitchen {
  const walls = kitchen.walls.map((wall, i) => ({
    ...wall,
    id: wall.id ?? `wall-${i + 1}`,
    side: wallSide(wall, i),
  }));
  return {
    ...kitchen,
    room: kitchen.room ?? kitchenRoom({ ...kitchen, walls }),
    walls,
    rulesVersion: kitchen.rulesVersion || RULES_VERSION,
  };
}

/* --- Запазване локално, докато няма база --------------------------- */

const STORAGE_KEY = 'korpus:configurator:v1';

export function saveLocal(kitchen: Kitchen): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kitchen));
  } catch {
    // частен режим / пълна квота — конфигурацията просто не се пази
  }
}

export function loadLocal(): Kitchen | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Kitchen;
    if (!parsed?.walls?.length) return null;
    return migrate(parsed);
  } catch {
    return null;
  }
}

/** Примерната кухня от спецификацията — удобна начална точка. */
export function sampleKitchen(): Kitchen {
  // Идентификаторите са фиксирани, за да няма разминаване при hydration.
  let n = 0;
  const m = (kind: ModuleKind, width: number): KitchenModule => ({
    id: `sample-${kind}-${++n}`,
    kind,
    width,
    hingeSide: 'right',
  });
  return {
    room: { width: 4200, depth: 3200 },
    walls: [
      {
        id: 'sample-wall-1',
        side: WALL_SIDES[0],
        length: 3600,
        base: [
          m('column', 600),
          m('drawers', 600),
          m('oven', 600),
          m('door', 400),
          m('sink', 800),
          m('dw', 600),
        ],
        upper: [m('upper', 600), m('hood', 600), m('upper', 400), m('upper', 800), m('upper', 600)],
      },
    ],
    materials: { ...emptyKitchen().materials },
    rulesVersion: RULES_VERSION,
  };
}
