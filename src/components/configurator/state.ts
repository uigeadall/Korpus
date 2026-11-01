/**
 * Състоянието на конфигуратора — редуктор без React, за да е тестваем.
 */

import {
  clampWallLength,
  type HingeSide,
  type Kitchen,
  type KitchenModule,
  MODULES,
  type Materials,
  type ModuleKind,
  type RowId,
  RULES_VERSION,
  emptyKitchen,
} from '@/lib/cabinet-rules';

export type Action =
  | { type: 'wallLength'; value: number }
  | { type: 'add'; row: RowId; kind: ModuleKind }
  | { type: 'remove'; id: string }
  | { type: 'width'; id: string; value: number }
  | { type: 'hinge'; id: string; value: HingeSide }
  | { type: 'move'; id: string; dir: -1 | 1 }
  | { type: 'reorder'; id: string; toIndex: number }
  | { type: 'materials'; value: Partial<Materials> }
  | { type: 'load'; value: Kitchen }
  | { type: 'reset' };

let counter = 0;
export function moduleId(kind: ModuleKind): string {
  counter += 1;
  return `${kind}-${Date.now().toString(36)}-${counter}`;
}

export { clampWallLength as clampWall } from '@/lib/cabinet-rules';

/** Ширина по подразбиране: средната от каталога, за да не е винаги най-малката. */
export function defaultWidth(kind: ModuleKind): number {
  const widths = MODULES[kind].widths;
  return widths.includes(600) ? 600 : widths[Math.floor(widths.length / 2)];
}

function rowOf(kind: ModuleKind): RowId {
  return MODULES[kind].row;
}

function withWall(kitchen: Kitchen, fn: (base: KitchenModule[], upper: KitchenModule[]) => void): Kitchen {
  const wall = kitchen.walls[0];
  const base = [...wall.base];
  const upper = [...wall.upper];
  fn(base, upper);
  return { ...kitchen, walls: [{ ...wall, base, upper }, ...kitchen.walls.slice(1)] };
}

function findRow(kitchen: Kitchen, id: string): RowId | null {
  const wall = kitchen.walls[0];
  if (wall.base.some((m) => m.id === id)) return 'base';
  if (wall.upper.some((m) => m.id === id)) return 'upper';
  return null;
}

export function reducer(kitchen: Kitchen, action: Action): Kitchen {
  switch (action.type) {
    case 'wallLength': {
      const wall = kitchen.walls[0];
      return {
        ...kitchen,
        walls: [{ ...wall, length: clampWallLength(action.value) }, ...kitchen.walls.slice(1)],
      };
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
      return withWall(kitchen, (base, upper) => {
        (rowOf(kind) === 'base' ? base : upper).push(m);
      });
    }

    case 'remove':
      return withWall(kitchen, (base, upper) => {
        for (const list of [base, upper]) {
          const i = list.findIndex((m) => m.id === action.id);
          if (i >= 0) list.splice(i, 1);
        }
      });

    case 'width':
      return withWall(kitchen, (base, upper) => {
        for (const list of [base, upper]) {
          const i = list.findIndex((m) => m.id === action.id);
          if (i >= 0) list[i] = { ...list[i], width: action.value };
        }
      });

    case 'hinge':
      return withWall(kitchen, (base, upper) => {
        for (const list of [base, upper]) {
          const i = list.findIndex((m) => m.id === action.id);
          if (i >= 0) list[i] = { ...list[i], hingeSide: action.value };
        }
      });

    case 'move': {
      const row = findRow(kitchen, action.id);
      if (!row) return kitchen;
      return withWall(kitchen, (base, upper) => {
        const list = row === 'base' ? base : upper;
        const i = list.findIndex((m) => m.id === action.id);
        const j = i + action.dir;
        if (i < 0 || j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
      });
    }

    case 'reorder': {
      const row = findRow(kitchen, action.id);
      if (!row) return kitchen;
      return withWall(kitchen, (base, upper) => {
        const list = row === 'base' ? base : upper;
        const from = list.findIndex((m) => m.id === action.id);
        const to = Math.min(list.length - 1, Math.max(0, action.toIndex));
        if (from < 0 || from === to) return;
        const [moved] = list.splice(from, 1);
        list.splice(to, 0, moved);
      });
    }

    case 'materials':
      return { ...kitchen, materials: { ...kitchen.materials, ...action.value } };

    case 'load':
      return { ...action.value, rulesVersion: action.value.rulesVersion || RULES_VERSION };

    case 'reset':
      return emptyKitchen(kitchen.walls[0].length);

    default:
      return kitchen;
  }
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
    return parsed;
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
    walls: [
      {
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
