/**
 * Състоянието на жилището — редуктор без React, за да е тестваем.
 *
 * Жилището е списък от стаи. Всичко, което го мени, минава оттук:
 * добавяне, влачене, преоразмеряване, преименуване, махане. Ходенето
 * със стрелките не го мени — то само сменя коя стая гледаш — затова
 * не е действие.
 */

import {
  FLAT,
  type Flat,
  type FlatRoom,
  type FlatRoomKind,
  addRoom,
  clampFlatRoom,
  defaultFlat,
  nameFor,
  snapRoom,
} from '@/lib/flat';

export type FlatAction =
  | { type: 'add'; kind: FlatRoomKind }
  | { type: 'move'; id: string; x: number; y: number }
  | { type: 'size'; id: string; width: number; depth: number }
  | { type: 'rename'; id: string; name: string }
  | { type: 'kind'; id: string; kind: FlatRoomKind }
  | { type: 'remove'; id: string }
  /** Стаята се върна готова от „Направи проект". */
  | { type: 'finish'; id: string; project: string }
  /*
   * Няколко наведнъж. Отделни действия, а не цикъл от единичните:
   * едно дръпване трябва да е една стъпка назад.
   */
  | { type: 'moveMany'; ids: string[]; x: number; y: number }
  | { type: 'removeMany'; ids: string[] }
  | { type: 'duplicate'; id: string }
  | { type: 'unfinish'; id: string }
  | { type: 'load'; value: Flat }
  | { type: 'reset' };

let counter = 0;
export function roomId(): string {
  counter += 1;
  return `room-${Date.now().toString(36)}-${counter}`;
}

const same = (a: FlatRoom, b: FlatRoom): boolean =>
  a.x === b.x &&
  a.y === b.y &&
  a.width === b.width &&
  a.depth === b.depth &&
  a.kind === b.kind &&
  a.name === b.name &&
  a.project === b.project;

/**
 * Прилага промяна върху една стая.
 *
 * Върне ли същото — непозната стая или влачене, което я оставя там,
 * където си е била — жилището се връща непокътнато. Иначе историята
 * се пълни със стъпки назад, които не връщат нищо.
 */
const withRoom = (flat: Flat, id: string, fn: (room: FlatRoom) => FlatRoom): Flat => {
  const index = flat.rooms.findIndex((r) => r.id === id);
  if (index < 0) return flat;
  const next = fn(flat.rooms[index]);
  if (same(next, flat.rooms[index])) return flat;
  const rooms = [...flat.rooms];
  rooms[index] = next;
  return { rooms };
};

export function flatReducer(flat: Flat, action: FlatAction): Flat {
  switch (action.type) {
    case 'add':
      return addRoom(flat, action.kind, roomId());

    /*
     * Влаченето лепи за съседите. Без това между две стаи остава
     * процеп от няколко сантиметра, който никой не е искал.
     */
    case 'move':
      return withRoom(flat, action.id, (room) =>
        snapRoom(flat, clampFlatRoom({ ...room, x: action.x, y: action.y })),
      );

    case 'size':
      return withRoom(flat, action.id, (room) =>
        clampFlatRoom({ ...room, width: action.width, depth: action.depth }),
      );

    case 'rename':
      return withRoom(flat, action.id, (room) => ({
        ...room,
        name: action.name.slice(0, 40),
      }));

    /*
     * Смяната на вида мени и името, ако то още е подразбиращото се —
     * „Кухня", преименувана на „Кухня на мама", не бива да стане „Баня".
     */
    /*
     * Смяната на вида обезсилва проекта: мебелта за баня не е мебел
     * за спалня и не бива да виси зад стая, която вече е друга.
     */
    case 'kind':
      return withRoom(flat, action.id, (room) => {
        const { project, ...rest } = room;
        void project;
        return {
          ...rest,
          kind: action.kind,
          name:
            room.name === nameFor({ rooms: [] }, room.kind)
              ? nameFor(flat, action.kind)
              : room.name,
        };
      });

    /*
     * Проектът идва готов от потока и се пази като запис, а не като
     * мебел: жилището не знае какво е шкаф и не бива да научава.
     */
    case 'finish':
      return withRoom(flat, action.id, (room) => ({ ...room, project: action.project }));

    case 'unfinish':
      return withRoom(flat, action.id, (room) => {
        const { project, ...rest } = room;
        void project;
        return rest;
      });

    /*
     * Групово местене. Водещата стая получава цел — къде да отиде —
     * а не отместване от миналия кадър: при отместване лепенето
     * изяжда всяка малка стъпка и стаята никога не се отделя от
     * съседа си. Другите я следват с толкова, с колкото е мръднала.
     */
    case 'moveMany': {
      if (!action.ids.length) return flat;
      const [lead, ...rest] = action.ids;
      const head = flat.rooms.find((r) => r.id === lead);
      if (!head) return flat;

      const moved = flatReducer(flat, { type: 'move', id: lead, x: action.x, y: action.y });
      const after = moved.rooms.find((r) => r.id === lead)!;
      const dx = after.x - head.x;
      const dy = after.y - head.y;
      if (!dx && !dy) return flat;

      return {
        rooms: moved.rooms.map((r) =>
          rest.includes(r.id) ? clampFlatRoom({ ...r, x: r.x + dx, y: r.y + dy }) : r,
        ),
      };
    }

    case 'removeMany': {
      const rooms = flat.rooms.filter((r) => !action.ids.includes(r.id));
      return rooms.length === flat.rooms.length ? flat : { rooms };
    }

    /** Копие на стаята, долепено отдясно. */
    case 'duplicate': {
      if (flat.rooms.length >= FLAT.MAX_ROOMS) return flat;
      const room = flat.rooms.find((r) => r.id === action.id);
      if (!room) return flat;
      const copy = clampFlatRoom({
        ...room,
        id: roomId(),
        name: nameFor(flat, room.kind),
        x: room.x + room.width,
        // Копието е празно: мебелта на оригинала е негова.
        project: undefined,
      });
      return { rooms: [...flat.rooms, copy] };
    }

    case 'remove': {
      const rooms = flat.rooms.filter((r) => r.id !== action.id);
      return rooms.length === flat.rooms.length ? flat : { rooms };
    }

    case 'load':
      return { rooms: action.value.rooms.map(clampFlatRoom) };

    case 'reset':
      return defaultFlat();
  }
}

/* --- История ------------------------------------------------------- */

export interface FlatHistory {
  past: Flat[];
  present: Flat;
  future: Flat[];
  lastKey: string | null;
}

export type FlatHistoryAction = FlatAction | { type: 'undo' } | { type: 'redo' };

export const FLAT_HISTORY_LIMIT = 60;

export const initFlatHistory = (flat: Flat): FlatHistory => ({
  past: [],
  present: flat,
  future: [],
  lastKey: null,
});

export const canUndoFlat = (h: FlatHistory) => h.past.length > 0;
export const canRedoFlat = (h: FlatHistory) => h.future.length > 0;

/**
 * Влаченето праща десетки действия в секунда. Поредните с един и същ
 * ключ се сливат в една стъпка, иначе едно дръпване изяжда историята.
 */
function mergeKey(action: FlatAction): string | null {
  switch (action.type) {
    case 'move':
      return `move:${action.id}`;
    case 'moveMany':
      return `move:${action.ids.join(',')}`;
    case 'size':
      return `size:${action.id}`;
    case 'rename':
      return `rename:${action.id}`;
    default:
      return null;
  }
}

export function flatHistoryReducer(state: FlatHistory, action: FlatHistoryAction): FlatHistory {
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

  const present = flatReducer(state.present, action);
  if (present === state.present) return state;

  const key = mergeKey(action);
  const merge = key !== null && key === state.lastKey;
  const past = merge ? state.past : [...state.past, state.present].slice(-FLAT_HISTORY_LIMIT);
  return { past, present, future: [], lastKey: key };
}

/* --- Запис в браузъра ---------------------------------------------- */

const KEY = 'korpus:jilishte:v1';
/** Къде си стоял. Пази се отделно: не е част от чертежа. */
const HERE_KEY = 'korpus:jilishte:tuk';

export function saveFlat(flat: Flat): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(flat));
  } catch {
    // частен режим — чертежът пак работи, просто не се помни
  }
}

/** Коя стая е била отворена последно. */
export function saveHere(id: string): void {
  try {
    localStorage.setItem(HERE_KEY, id);
  } catch {
    // частен режим — просто ще започнем от първата стая
  }
}

export function loadHere(): string | null {
  try {
    return localStorage.getItem(HERE_KEY);
  } catch {
    return null;
  }
}

export function loadFlat(): Flat | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Flat;
    if (!Array.isArray(parsed?.rooms)) return null;
    return { rooms: parsed.rooms.slice(0, FLAT.MAX_ROOMS).map(clampFlatRoom) };
  } catch {
    return null;
  }
}
