/**
 * Жилището — няколко стаи, наредени една до друга.
 *
 * Досега приложението знаеше една стая. Истинският проект обаче е за
 * цяло жилище: кухня, хол, спалня, коридор, баня. Клиентът иска да го
 * начертае както си го знае и да върви от стая в стая.
 *
 * Стаята тук е просто правоъгълник с място в жилището. Какво има в
 * нея — шкафове, врати, прозорци — остава на `cabinet-rules`; жилището
 * знае само къде стои всяка стая, коя до коя е и откъде се минава.
 *
 * Координати: начало горе вляво, `x` надясно, `y` надолу — както се
 * гледа план. Всичко е в милиметри.
 */

import type { RoomKind } from './cabinet-rules';
import type { Ezik } from '@/i18n/ezik';
import { prevedi } from '@/i18n/rechnik';

/**
 * Видовете стаи. Първите три се обзавеждат с корпусна мебел; другите
 * влизат в плана, защото без тях жилището не е жилище, но още нямаме
 * правила за мебел в тях.
 */
export type FlatRoomKind = RoomKind | 'other';

export const FLAT_ROOM_LABEL: Record<FlatRoomKind, string> = {
  kitchen: 'Кухня',
  bedroom: 'Спалня',
  living: 'Всекидневна',
  corridor: 'Коридор',
  bath: 'Баня',
  hall: 'Антре',
  other: 'Стая',
};

/**
 * Кои стаи знаем да обзавеждаме със своите правила. Остава само
 * „Стая" — тя нарочно е без вид и без правила, за да има къде да
 * влезе помещение, което не прилича на нито едно от другите.
 */
export const FURNISHED_KINDS: readonly FlatRoomKind[] = [
  'kitchen',
  'bedroom',
  'living',
  'bath',
  'corridor',
  'hall',
];

export function isFurnished(kind: FlatRoomKind): kind is RoomKind {
  return FURNISHED_KINDS.includes(kind);
}

export interface FlatRoom {
  id: string;
  kind: FlatRoomKind;
  /** Как клиентът я нарича. По подразбиране името на вида. */
  name: string;
  /** Горен ляв ъгъл в координати на жилището. */
  x: number;
  y: number;
  width: number;
  depth: number;
  /**
   * Готовият проект на стаята, както се носи в линк.
   *
   * Самата мебел не се пази тук — жилището не знае какво е шкаф.
   * Пази се записът, с който проектът се отваря отново, и той върши
   * две работи наведнъж: отбелязва стаята за готова и позволява да
   * се върнеш в нея и да я промениш.
   */
  project?: string;
}

/**
 * Как се казва стаята на екран.
 *
 * Полето може да е празно — човек изтрива името, за да напише ново, и
 * между двете натискания стаята не бива да остава без надпис. Тогава
 * се показва видът ѝ.
 */
export function roomName(room: FlatRoom, ezik: Ezik = 'bg'): string {
  return imeNaEzik(room.name.trim(), ezik) || prevedi(FLAT_ROOM_LABEL[room.kind], ezik);
}

/**
 * Име на стая на езика на страницата. Подразбиращите се имена („Кухня",
 * „Спалня 2") се пазят на български — те са ключ — и се превеждат на
 * показване. Име, което човек е написал сам, остава както е.
 */
export function imeNaEzik(name: string, ezik: Ezik): string {
  if (ezik === 'bg') return name;
  const m = /^(.+?)( \d+)?$/.exec(name);
  if (m && (Object.values(FLAT_ROOM_LABEL) as string[]).includes(m[1])) {
    return prevedi(m[1], ezik) + (m[2] ?? '');
  }
  return name;
}

/** Готова ли е стаята — има ли проект зад нея. */
export function isDone(room: FlatRoom): boolean {
  return Boolean(room.project);
}

/** Колко стаи са готови от тези, които изобщо се обзавеждат. */
export function progressOf(flat: Flat): { done: number; total: number } {
  const furnished = flat.rooms.filter((r) => isFurnished(r.kind));
  return { done: furnished.filter(isDone).length, total: furnished.length };
}

export interface Flat {
  rooms: FlatRoom[];
}

export const FLAT = {
  MIN_SIDE: 900,
  MAX_SIDE: 12000,
  STEP: 50,
  /** Докъде стая се лепва за съседна, вместо да остава процеп. */
  SNAP: 250,
  MAX_ROOMS: 12,
  /** Дебелина на вътрешния зид — стаите делят по половин зид. */
  WALL: 120,
} as const;

/** Размери по подразбиране за всеки вид. */ // ПРОВЕРИ по истински жилища
export const DEFAULT_SIZE: Record<FlatRoomKind, { width: number; depth: number }> = {
  kitchen: { width: 3600, depth: 3000 },
  living: { width: 4800, depth: 4000 },
  bedroom: { width: 3600, depth: 3600 },
  corridor: { width: 3600, depth: 1300 },
  bath: { width: 2200, depth: 1800 },
  hall: { width: 2000, depth: 1600 },
  other: { width: 3000, depth: 3000 },
};

const step = (value: number) => Math.round(value / FLAT.STEP) * FLAT.STEP;
const side = (value: number) => Math.min(FLAT.MAX_SIDE, Math.max(FLAT.MIN_SIDE, step(value)));

/** Стаята, вкарана в допустимите мерки и закръглена на стъпката. */
export function clampFlatRoom(room: FlatRoom): FlatRoom {
  return {
    ...room,
    x: step(room.x),
    y: step(room.y),
    width: side(room.width),
    depth: side(room.depth),
  };
}

export const right = (r: FlatRoom) => r.x + r.width;
export const bottom = (r: FlatRoom) => r.y + r.depth;

/** Площта на стаята в квадратни метри. */
export function areaOf(room: FlatRoom): number {
  return (room.width * room.depth) / 1_000_000;
}

export function totalArea(flat: Flat): number {
  return flat.rooms.reduce((sum, r) => sum + areaOf(r), 0);
}

/** Застъпват ли се две стаи. Допирането не е застъпване. */
export function roomsOverlap(a: FlatRoom, b: FlatRoom): boolean {
  return a.x < right(b) && b.x < right(a) && a.y < bottom(b) && b.y < bottom(a);
}

/**
 * Двойките стаи, които се застъпват. Не се решава само — казва се,
 * защото жилище с две стаи на едно място не се строи.
 */
export function overlappingRooms(flat: Flat): [FlatRoom, FlatRoom][] {
  const out: [FlatRoom, FlatRoom][] = [];
  for (let i = 0; i < flat.rooms.length; i++) {
    for (let j = i + 1; j < flat.rooms.length; j++) {
      if (roomsOverlap(flat.rooms[i], flat.rooms[j])) out.push([flat.rooms[i], flat.rooms[j]]);
    }
  }
  return out;
}

/** Най-малкият правоъгълник, в който се събира цялото жилище. */
export function boundsOf(flat: Flat): { x: number; y: number; width: number; depth: number } {
  if (!flat.rooms.length) return { x: 0, y: 0, width: 0, depth: 0 };
  const x = Math.min(...flat.rooms.map((r) => r.x));
  const y = Math.min(...flat.rooms.map((r) => r.y));
  return {
    x,
    y,
    width: Math.max(...flat.rooms.map(right)) - x,
    depth: Math.max(...flat.rooms.map(bottom)) - y,
  };
}

/** Коя стая е под тази точка. Последната отгоре печели. */
export function roomAt(flat: Flat, point: { x: number; y: number }): FlatRoom | null {
  for (let i = flat.rooms.length - 1; i >= 0; i--) {
    const r = flat.rooms[i];
    if (point.x >= r.x && point.x <= right(r) && point.y >= r.y && point.y <= bottom(r)) return r;
  }
  return null;
}

/**
 * Лепи стаята за съседите ѝ.
 *
 * Без това между две стаи остава процеп от шейсет милиметра, който
 * никой не е искал и който после се вижда в обема като пукнатина.
 * Лепенето е само по ръбовете, които вече са наблизо.
 */
export function snapRoom(flat: Flat, room: FlatRoom): FlatRoom {
  const others = flat.rooms.filter((r) => r.id !== room.id);
  let { x, y } = room;

  const pull = (value: number, candidates: number[]): number => {
    let best = value;
    let bestGap: number = FLAT.SNAP;
    for (const c of candidates) {
      const gap = Math.abs(c - value);
      if (gap > 0 && gap <= bestGap) {
        best = c;
        bestGap = gap;
      }
    }
    return best;
  };

  for (const other of others) {
    // Хоризонтално: лявата ми страна към нечия дясна и обратно.
    x = pull(x, [right(other), other.x, other.x - room.width, right(other) - room.width]);
    y = pull(y, [bottom(other), other.y, other.y - room.depth, bottom(other) - room.depth]);
  }

  return clampFlatRoom({ ...room, x, y });
}

/** Обща стена между две стаи: по коя ос, къде и докъде. */
export interface SharedWall {
  axis: 'x' | 'y';
  /** Общата координата: `x` за вертикална стена, `y` за хоризонтална. */
  at: number;
  from: number;
  to: number;
}

/**
 * Делят ли двете стаи стена и къде.
 *
 * Делят, когато се допират по права и допирът е достатъчно дълъг, за
 * да мине човек — иначе е ъгъл, не стена.
 */
export function sharedWall(a: FlatRoom, b: FlatRoom, least = FLAT.MIN_SIDE): SharedWall | null {
  // Вертикална стена: дясната на едната е лявата на другата.
  for (const [p, q] of [
    [a, b],
    [b, a],
  ] as const) {
    if (right(p) === q.x) {
      const from = Math.max(p.y, q.y);
      const to = Math.min(bottom(p), bottom(q));
      if (to - from >= least) return { axis: 'x', at: q.x, from, to };
    }
  }

  // Хоризонтална стена: долната на едната е горната на другата.
  for (const [p, q] of [
    [a, b],
    [b, a],
  ] as const) {
    if (bottom(p) === q.y) {
      const from = Math.max(p.x, q.x);
      const to = Math.min(right(p), right(q));
      if (to - from >= least) return { axis: 'y', at: q.y, from, to };
    }
  }

  return null;
}

/** Стаите, с които тази дели стена. */
export function neighboursOf(
  flat: Flat,
  id: string,
): { room: FlatRoom; wall: SharedWall }[] {
  const me = flat.rooms.find((r) => r.id === id);
  if (!me) return [];
  return flat.rooms
    .filter((r) => r.id !== id)
    .map((room) => ({ room, wall: sharedWall(me, room) }))
    .filter((n): n is { room: FlatRoom; wall: SharedWall } => n.wall !== null);
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export const DIRECTION_LABEL: Record<Direction, string> = {
  up: 'нагоре',
  down: 'надолу',
  left: 'наляво',
  right: 'надясно',
};

const centreOf = (r: FlatRoom) => ({ x: r.x + r.width / 2, y: r.y + r.depth / 2 });

/**
 * Накъде води стрелката.
 *
 * Първо се гледа през стените: ако в тази посока има стая, с която
 * делим стена, отиваме в нея — това е вратата, през която човек
 * наистина би минал. Няма ли такава, се взема най-близката стая в
 * същата посока, за да не заседне стрелката в ъгъла на жилището.
 */
export function stepFrom(flat: Flat, id: string, dir: Direction): FlatRoom | null {
  const me = flat.rooms.find((r) => r.id === id);
  if (!me) return null;

  const towards = (r: FlatRoom): boolean => {
    switch (dir) {
      case 'left':
        return right(r) <= me.x;
      case 'right':
        return r.x >= right(me);
      case 'up':
        return bottom(r) <= me.y;
      case 'down':
        return r.y >= bottom(me);
    }
  };

  /** Колко се припокриват по напречната ос — иначе не е „натам". */
  const across = (r: FlatRoom): number =>
    dir === 'left' || dir === 'right'
      ? Math.min(bottom(me), bottom(r)) - Math.max(me.y, r.y)
      : Math.min(right(me), right(r)) - Math.max(me.x, r.x);

  const away = (r: FlatRoom): number => {
    const c = centreOf(r);
    const m = centreOf(me);
    return Math.hypot(c.x - m.x, c.y - m.y);
  };

  const candidates = flat.rooms.filter((r) => r.id !== id && towards(r));

  // Съседите през обща стена имат предимство.
  const adjacent = candidates.filter((r) => sharedWall(me, r) !== null);
  const pool = adjacent.length ? adjacent : candidates.filter((r) => across(r) > 0);
  if (!pool.length) return null;

  return pool.reduce((best, r) => (away(r) < away(best) ? r : best));
}

/** Ново име: видът, а при повторение — с номер. */
export function nameFor(flat: Flat, kind: FlatRoomKind): string {
  const label = FLAT_ROOM_LABEL[kind];
  const same = flat.rooms.filter((r) => r.kind === kind).length;
  return same === 0 ? label : `${label} ${same + 1}`;
}

/**
 * Нова стая, сложена до вече начертаните.
 *
 * Застава вдясно от най-дясната, залепена за нея — оттам човек я
 * влачи където трябва. Празно жилище започва от началото.
 */
export function addRoom(flat: Flat, kind: FlatRoomKind, id: string): Flat {
  if (flat.rooms.length >= FLAT.MAX_ROOMS) return flat;
  const size = DEFAULT_SIZE[kind];
  const bounds = boundsOf(flat);
  const room = clampFlatRoom({
    id,
    kind,
    name: nameFor(flat, kind),
    x: flat.rooms.length ? bounds.x + bounds.width : 0,
    y: flat.rooms.length ? bounds.y : 0,
    width: size.width,
    depth: size.depth,
  });
  return { rooms: [...flat.rooms, room] };
}

/**
 * Готов проект, пренесен в жилището.
 *
 * Заменя стаята от същия вид: тя остава на мястото си и с името си, но
 * взема мерките на проекта и цялата му мебел. Първо чакащата; ако всички
 * от вида са обзаведени — първата от тях. Само жилище без такава стая
 * получава нова. Връща жилището и стаята, в която е влязъл проектът.
 *
 * Досега проектът търсеше чакаща стая, в която да се побере. Готовата
 * кухня от 4,20 не влизаше в начертаната от 3,60 и ставаше нова стая
 * някъде встрани — а начертаната си стоеше празна и изглеждаше, че
 * „Добави в жилището" не прави нищо.
 *
 * `fit` пренася записа в мерките на стаята. Те са на проекта, но стъпката
 * на чертежа е по-едра и може да ги закръгли.
 */
export function placeProject(
  flat: Flat,
  kind: FlatRoomKind,
  size: { width: number; depth: number },
  project: string,
  id: string,
  fit: (room: FlatRoom) => string | null = () => project,
): { flat: Flat; id: string | null } {
  const withProject = (room: FlatRoom): FlatRoom => {
    const sized = clampFlatRoom({ ...room, width: size.width, depth: size.depth });
    return { ...sized, project: fit(sized) ?? project };
  };

  const same = flat.rooms.filter((r) => r.kind === kind);
  const target = same.find((r) => !r.project) ?? same[0];
  if (target) {
    return {
      flat: { rooms: flat.rooms.map((r) => (r.id === target.id ? withProject(r) : r)) },
      id: target.id,
    };
  }

  const added = addRoom(flat, kind, id);
  if (added === flat) return { flat, id: null };
  return {
    flat: { rooms: added.rooms.map((r) => (r.id === id ? withProject(r) : r)) },
    id,
  };
}

/** Жилище по подразбиране: двустаен апартамент с коридор. */ // ПРОВЕРИ
export function defaultFlat(): Flat {
  const rooms: FlatRoom[] = [
    { id: 'f-hall', kind: 'hall', name: 'Антре', x: 0, y: 0, width: 2000, depth: 1600 },
    { id: 'f-corridor', kind: 'corridor', name: 'Коридор', x: 0, y: 1600, width: 2000, depth: 3400 },
    { id: 'f-kitchen', kind: 'kitchen', name: 'Кухня', x: 2000, y: 0, width: 3600, depth: 3000 },
    { id: 'f-living', kind: 'living', name: 'Всекидневна', x: 2000, y: 3000, width: 3600, depth: 2000 },
    { id: 'f-bath', kind: 'bath', name: 'Баня', x: -2200, y: 1600, width: 2200, depth: 1800 },
    { id: 'f-bedroom', kind: 'bedroom', name: 'Спалня', x: -3600, y: 3400, width: 3600, depth: 3600 },
  ];
  return { rooms: rooms.map(clampFlatRoom) };
}

/**
 * Къде минава вратата между две съседни стаи.
 *
 * По средата на общата стена и широка колкото обикновена врата. В
 * къса стена се свива, за да остане зид от двете ѝ страни — врата,
 * опряна в ъгъла, няма на какво да се закачи.
 */
export const DOORWAY_WIDTH = 800;

/** Зид, който остава от всяка страна на вратата. */
const JAMB = 100;

export function doorwayBetween(a: FlatRoom, b: FlatRoom): SharedWall | null {
  const wall = sharedWall(a, b);
  if (!wall) return null;
  const length = wall.to - wall.from;
  const width = Math.min(DOORWAY_WIDTH, Math.max(0, length - 2 * JAMB));
  const mid = (wall.from + wall.to) / 2;
  return { ...wall, from: mid - width / 2, to: mid + width / 2 };
}

/** Всички врати между стаите — всяка двойка по веднъж. */
export function doorwaysOf(flat: Flat): { a: FlatRoom; b: FlatRoom; gap: SharedWall }[] {
  const out: { a: FlatRoom; b: FlatRoom; gap: SharedWall }[] = [];
  for (let i = 0; i < flat.rooms.length; i++) {
    for (let j = i + 1; j < flat.rooms.length; j++) {
      const gap = doorwayBetween(flat.rooms[i], flat.rooms[j]);
      if (gap) out.push({ a: flat.rooms[i], b: flat.rooms[j], gap });
    }
  }
  return out;
}
