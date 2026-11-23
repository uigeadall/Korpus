/**
 * Състоянието на конфигуратора — редуктор без React, за да е тестваем.
 *
 * Кухнята е в стая с няколко стени. Действията, които пипат модул, го
 * намират по негов идентификатор — той е уникален през всички стени.
 * Само добавянето и дължината трябва да им се каже коя стена.
 */

import { defaultWidth, gapKindFor } from '@/lib/cabinet-rules';
import {
  type HingeSide,
  type Kitchen,
  type KitchenModule,
  MODULES,
  type Materials,
  type ModuleKind,
  type Room,
  type RoomDoor,
  type RoomWindow,
  WINDOW,
  clampWindow,
  defaultWindow,
  kitchenWindows,
  type RowId,
  RULES_VERSION,
  type Wall,
  type WallSide,
  WALL_SIDES,
  clampDoor,
  clampRoom,
  kitchenDoor,
  clampWallLength,
  emptyKitchen,
  freeSides,
  kitchenRoom,
  nearestWidth,
  sideLength,
  toOtherRow,
  wallSide,
  wallStatus,
} from '@/lib/cabinet-rules';
import { fillWidths } from '@/lib/furniture/system';
import { slideRow } from '@/lib/slide';

export type Action =
  | { type: 'wallLength'; wallId: string; value: number }
  /**
   * `afterId` вмъква веднага след посочения модул, `atIndex` — на точно
   * това място в реда (оттам идва влаченото от палитрата). Без нито
   * едното новият застава най-отзад.
   */
  | { type: 'add'; wallId: string; row: RowId; kind: ModuleKind; afterId?: string; atIndex?: number }
  | { type: 'duplicate'; id: string }
  | { type: 'fill'; wallId: string; row: RowId }
  | { type: 'remove'; id: string }
  | { type: 'width'; id: string; value: number }
  | { type: 'nudgeWidth'; id: string; dir: -1 | 1 }
  | { type: 'shelves'; id: string; value: number }
  /*
   * Действия върху няколко модула наведнъж. Отделни са, а не цикъл от
   * единичните, защото едно дръпване трябва да е една стъпка назад —
   * иначе ⌘Z маха избраните един по един.
   */
  | { type: 'removeMany'; ids: string[] }
  | { type: 'widthMany'; ids: string[]; value: number }
  | { type: 'duplicateMany'; ids: string[] }
  | { type: 'hinge'; id: string; value: HingeSide }
  | { type: 'move'; id: string; dir: -1 | 1 }
  | { type: 'reorder'; id: string; toIndex: number }
  /**
   * Плъзгане по стената: шкафът застава на място, а празното пред него
   * се запълва с ниши. Различно от `reorder`, което само разменя места
   * в плътна редица и затова не може да мести шкаф, който е сам.
   */
  | { type: 'slide'; id: string; toIndex: number; gap: number }
  | { type: 'moveToRow'; id: string; toIndex: number }
  | { type: 'addWall'; side?: WallSide }
  | { type: 'removeWall'; wallId: string }
  | { type: 'room'; value: Partial<Room> }
  | { type: 'door'; value: Partial<RoomDoor> }
  | { type: 'addWindow' }
  | { type: 'window'; id: string; value: Partial<RoomWindow> }
  | { type: 'removeWindow'; id: string }
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

export function windowId(): string {
  counter += 1;
  return `win-${Date.now().toString(36)}-${counter}`;
}

export { clampWallLength as clampWall } from '@/lib/cabinet-rules';

/** Ширина по подразбиране: средната от каталога, за да не е винаги най-малката. */
export { defaultWidth } from '@/lib/cabinet-rules';


function rowOf(kind: ModuleKind): RowId {
  return MODULES[kind].row;
}

/** Нов модул от каталога, с панти там, където има смисъл. */
function newModule(kind: ModuleKind, width: number): KitchenModule {
  const spec = MODULES[kind];
  return {
    id: moduleId(kind),
    kind,
    width,
    hingeSide: spec.hasCarcass || kind === 'dw' ? 'right' : undefined,
  };
}

/**
 * Вмъква веднага след посочения модул. Ако го няма в този ред (нищо не е
 * избрано или избраното е в другия ред), новият застава най-отзад.
 */
function insertAfter(list: KitchenModule[], m: KitchenModule, afterId?: string): void {
  const i = afterId ? list.findIndex((x) => x.id === afterId) : -1;
  if (i < 0) list.push(m);
  else list.splice(i + 1, 0, m);
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

/** Къде стои модулът в своя ред — за подреждане на групови действия. */
function indexOfModule(kitchen: Kitchen, id: string): number {
  const wall = wallOfModule(kitchen, id);
  if (!wall) return -1;
  const base = wall.base.findIndex((m) => m.id === id);
  return base >= 0 ? base : wall.upper.findIndex((m) => m.id === id);
}

/** Най-близката допустима ширина за този модул, какъвто и да е видът му. */
function nearestWidthFor(kitchen: Kitchen, id: string, width: number): number {
  const wall = wallOfModule(kitchen, id);
  const m = wall && [...wall.base, ...wall.upper].find((x) => x.id === id);
  return m ? nearestWidth(m.kind, width) : width;
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
      const m = newModule(kind, defaultWidth(kind));
      return withWall(kitchen, action.wallId, (base, upper) => {
        const list = rowOf(kind) === 'base' ? base : upper;
        if (action.atIndex !== undefined) {
          list.splice(Math.max(0, Math.min(list.length, action.atIndex)), 0, m);
          return;
        }
        insertAfter(list, m, action.afterId);
      });
    }

    case 'duplicate': {
      const row = rowOfModule(kitchen, action.id);
      if (!row) return kitchen;
      return withWallOf(kitchen, action.id, (base, upper) => {
        const list = row === 'base' ? base : upper;
        const i = list.findIndex((m) => m.id === action.id);
        if (i < 0) return;
        list.splice(i + 1, 0, { ...list[i], id: moduleId(list[i].kind) });
      });
    }

    /**
     * Застила свободното в реда с възможно най-малко шкафове — най-широкият
     * от каталога, който се побира, после пак, докато има място.
     */
    case 'fill': {
      const wall = kitchen.walls.find((w) => w.id === action.wallId);
      if (!wall) return kitchen;
      const status = wallStatus(wall)[action.row];
      if (status.state !== 'left') return kitchen;

      const kind: ModuleKind = action.row === 'base' ? 'door' : 'upper';
      const added = fillWidths(status.diff, MODULES[kind].widths).map((w) => newModule(kind, w));
      if (!added.length) return kitchen;

      return withWall(kitchen, action.wallId, (base, upper) => {
        (action.row === 'base' ? base : upper).push(...added);
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

    /*
     * Многото наведнъж. Всяко действие минава през своя единичен
     * случай, но резултатът е една стъпка в историята.
     */
    case 'removeMany':
      return action.ids.reduce((k, id) => reducer(k, { type: 'remove', id }), kitchen);

    case 'widthMany':
      return action.ids.reduce(
        (k, id) => reducer(k, { type: 'width', id, value: nearestWidthFor(k, id, action.value) }),
        kitchen,
      );

    /*
     * Копията се правят отзад напред: вмъкването мести това, което е
     * след него, и при обратен ред вторият избран вече не е на своето
     * място.
     */
    case 'duplicateMany':
      return [...action.ids]
        .map((id) => ({ id, at: indexOfModule(kitchen, id) }))
        .sort((a, b) => b.at - a.at)
        .reduce((k, { id }) => reducer(k, { type: 'duplicate', id }), kitchen);

    /** Колко рафта вътре — клиентът ги влачи в обемния изглед. */
    case 'shelves':
      return withWallOf(kitchen, action.id, (base, upper) => {
        for (const list of [base, upper]) {
          const i = list.findIndex((m) => m.id === action.id);
          if (i >= 0) list[i] = { ...list[i], shelves: Math.max(0, Math.min(10, action.value)) };
        }
      });

    /** Следващата ширина от каталога — за −/+ върху самия чертеж. */
    case 'nudgeWidth':
      return withWallOf(kitchen, action.id, (base, upper) => {
        for (const list of [base, upper]) {
          const i = list.findIndex((m) => m.id === action.id);
          if (i < 0) continue;
          const widths = MODULES[list[i].kind].widths;
          const at = widths.indexOf(list[i].width);
          const next = widths[Math.min(widths.length - 1, Math.max(0, at + action.dir))];
          if (next !== undefined) list[i] = { ...list[i], width: next };
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
    case 'slide': {
      const row = rowOfModule(kitchen, action.id);
      if (!row) return kitchen;
      const gapKind = gapKindFor(kitchen.roomKind ?? 'kitchen', row);
      return withWallOf(kitchen, action.id, (base, upper) => {
        const list = row === 'base' ? base : upper;
        const next = slideRow(list, action.id, action.toIndex, action.gap, gapKind, newModule);
        if (next) list.splice(0, list.length, ...next);
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

    /*
     * Вратата. Стаята ѝ се дава отвън, за да се вкара в зида още тук —
     * иначе човек я избутва извън стената и после я вижда да виси.
     */
    case 'door': {
      const room = kitchenRoom(kitchen);
      return { ...kitchen, door: clampDoor(room, { ...kitchenDoor(kitchen), ...action.value }) };
    }

    /*
     * Прозорците. Нов отива на стена, която още няма такъв; повече от
     * шепа в една стая е грешка, не желание, затова има таван.
     */
    case 'addWindow': {
      const room = kitchenRoom(kitchen);
      const windows = kitchenWindows(kitchen);
      if (windows.length >= WINDOW.MAX_COUNT) return kitchen;
      // Вратата също заема стена — нов прозорец не отива върху нея.
      return {
        ...kitchen,
        windows: [...windows, defaultWindow(room, [kitchenDoor(kitchen), ...windows], windowId())],
      };
    }

    case 'window': {
      const room = kitchenRoom(kitchen);
      return {
        ...kitchen,
        windows: kitchenWindows(kitchen).map((w) =>
          w.id === action.id ? clampWindow(room, { ...w, ...action.value }) : w,
        ),
      };
    }

    case 'removeWindow':
      return { ...kitchen, windows: kitchenWindows(kitchen).filter((w) => w.id !== action.id) };

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

/* --- Връщане назад -------------------------------------------------
 *
 * Конфигураторът е инструмент: всичко, което се троши с един клик,
 * трябва да се връща с един клик. Историята стои около редуктора, за
 * да не знае самият той за нея.
 */

export const HISTORY_LIMIT = 50;

export interface History {
  past: Kitchen[];
  present: Kitchen;
  future: Kitchen[];
  /** Ключът на последното сливаемо действие — виж `mergeKey`. */
  lastKey: string | null;
}

export type HistoryAction = Action | { type: 'undo' } | { type: 'redo' };

export function initHistory(kitchen: Kitchen): History {
  return { past: [], present: kitchen, future: [], lastKey: null };
}

export const canUndo = (h: History): boolean => h.past.length > 0;
export const canRedo = (h: History): boolean => h.future.length > 0;

/**
 * Влаченето и плъзгачите пращат десетки действия в секунда. Поредните с
 * един и същ ключ се сливат в една стъпка, иначе едно дръпване на
 * стената изяжда цялата история.
 */
function mergeKey(action: Action): string | null {
  switch (action.type) {
    case 'wallLength':
      return `wallLength:${action.wallId}`;
    case 'width':
    case 'nudgeWidth':
      return `width:${action.id}`;
    case 'widthMany':
      return `width:${action.ids.join(',')}`;
    case 'shelves':
      return `shelves:${action.id}`;
    case 'reorder':
      return `reorder:${action.id}`;
    case 'slide':
      return `slide:${action.id}`;
    case 'room':
      return 'room';
    case 'door':
      return 'door';
    case 'window':
      return `window:${action.id}`;
    default:
      return null;
  }
}

export function historyReducer(state: History, action: HistoryAction): History {
  if (action.type === 'undo') {
    const previous = state.past.at(-1);
    if (!previous) return state;
    return {
      past: state.past.slice(0, -1),
      present: previous,
      future: [state.present, ...state.future],
      lastKey: null,
    };
  }

  if (action.type === 'redo') {
    const [next, ...rest] = state.future;
    if (!next) return state;
    return {
      past: [...state.past, state.present],
      present: next,
      future: rest,
      lastKey: null,
    };
  }

  // Конфигурация отвън (върната от браузъра, „започни от примера") е нов
  // лист — историята на предишната няма към какво да се върне.
  if (action.type === 'load') return initHistory(reducer(state.present, action));

  const present = reducer(state.present, action);
  // Действие, което не е променило нищо, не заслужава стъпка назад.
  if (present === state.present) return state;

  const key = mergeKey(action);
  if (key && key === state.lastKey) {
    return { past: state.past, present, future: [], lastKey: key };
  }
  return {
    past: [...state.past, state.present].slice(-HISTORY_LIMIT),
    present,
    future: [],
    lastKey: key,
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
