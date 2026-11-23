/**
 * Отворите в стаята — вратата и прозорците.
 *
 * Досега стаята беше затворена кутия: четири цели зида и мебел по
 * единия. В истинска стая обаче първото, което решава къде може да
 * стои мебел, е къде се влиза и откъде идва светлината. Вратата изяжда
 * парче стена и още толкова под пред себе си, докато крилото се върти;
 * прозорецът изяжда горния ред шкафове, но не и долния.
 *
 * Затова и двете са на стаята, не на стената с мебелите: стоят на коя
 * да е от четирите страни и човекът ги мести. Оттук излизат нещата,
 * които другите слоеве само рисуват: отворът (къде свършва зидът),
 * обхватът на крилото (кой под не е свободен) и свободните участъци
 * от стената (докъде стига мебелта).
 *
 * Разликата между врата и прозорец е една: вратата стъпва на пода и
 * има крило, прозорецът виси на парапет. Всичко останало се смята от
 * една и съща геометрия долу.
 *
 * Мерките са в милиметри, местното `x` се брои от левия край на
 * стената, както я гледаш, застанал в стаята с лице към нея — същото
 * `x`, с което се нареждат модулите.
 */

import {
  type Rect,
  type Room,
  WALL_SIDES,
  type WallSide,
  facingOf,
  pointAlong,
  sideLength,
} from './furniture/room';

/** От коя страна са пантите, гледано отвътре на стаята. */
export type DoorHinge = 'left' | 'right';

/** Накъде се върти крилото. */
export type DoorSwing = 'in' | 'out';

export interface RoomDoor {
  side: WallSide;
  /** Отстояние на левия ръб на отвора от началото на стената. */
  x: number;
  width: number;
  height: number;
  hinge: DoorHinge;
  swing: DoorSwing;
}

export const DOOR = {
  MIN_WIDTH: 600,
  MAX_WIDTH: 1800,
  MIN_HEIGHT: 1800,
  MAX_HEIGHT: 2500,
  STEP: 10,
  /** Ширини, които се поръчват наготово. */ // ПРОВЕРИ при доставчика
  WIDTHS: [700, 800, 900, 1000] as const,
  DEFAULT_WIDTH: 800,
  /** Крило 2000 плюс каса. */ // ПРОВЕРИ
  DEFAULT_HEIGHT: 2040,
  /** Колко чист под трябва пред отвора, за да се минава. */ // ПРОВЕРИ
  CLEARANCE: 600,
  /** Дебелина на крилото. */
  LEAF: 40,
  /** Касата, която се вижда около отвора. */
  CASING: 60,
  /** Докъде стои отворено крилото в картината, радиани. */
  OPEN_ANGLE: (100 * Math.PI) / 180,
} as const;

export const DOOR_HINGE_LABEL: Record<DoorHinge, string> = {
  left: 'Отляво',
  right: 'Отдясно',
};

export const DOOR_SWING_LABEL: Record<DoorSwing, string> = {
  in: 'Навътре',
  out: 'Навън',
};

const step = (value: number) => Math.round(value / DOOR.STEP) * DOOR.STEP;

/**
 * Вратата, вкарана обратно в стената си. Стаята се свива и расте, а
 * вратата трябва да остане в зида — иначе увисва в ъгъла или излиза
 * извън стаята.
 */
export function clampDoor(room: Room, door: RoomDoor): RoomDoor {
  const wall = sideLength(room, door.side);
  const width = Math.min(
    Math.max(DOOR.MIN_WIDTH, step(door.width)),
    Math.min(DOOR.MAX_WIDTH, wall),
  );
  return {
    ...door,
    width,
    height: Math.min(DOOR.MAX_HEIGHT, Math.max(DOOR.MIN_HEIGHT, step(door.height))),
    x: Math.min(Math.max(0, step(door.x)), wall - width),
  };
}

/**
 * Коя стена да поеме вратата, ако човекът още не е казал.
 *
 * Не стената с мебелта и не стената, иззад която се гледа стаята:
 * врата на нея е зад гърба на окото и човекът не вижда какво е
 * поставил. Остават двете странични и срещуположната — в този ред.
 */
const DOOR_WALL_ORDER: readonly WallSide[] = ['right', 'top', 'left', 'bottom'];

/**
 * Вратата по подразбиране: на съседна стена, в другия ѝ край.
 *
 * `busy` са стените, по които вече стои мебел. Вратата ги избягва —
 * иначе проект отпреди вратите изведнъж получава отвор насред реда
 * си и шкафовете му се разместват, без човекът да е пипал нищо.
 */
export function defaultDoor(
  room: Room,
  furnitureSide: WallSide = 'top',
  busy: readonly WallSide[] = [furnitureSide],
): RoomDoor {
  const taken = new Set<WallSide>([furnitureSide, ...busy]);
  const side =
    DOOR_WALL_ORDER.find((s) => !taken.has(s)) ??
    // Всички стени са заети: стаята пак трябва да има врата.
    DOOR_WALL_ORDER.find((s) => s !== furnitureSide) ??
    'bottom';
  const wall = sideLength(room, side);
  const width = Math.min(DOOR.DEFAULT_WIDTH, wall);

  /*
   * Обхождането на стените е по часовника, затова стената веднага след
   * мебелната дели с нея ъгъла при местното си нула. Вратата отива в
   * другия край, за да не се отваря право в шкафовете.
   */
  const after = WALL_SIDES[(WALL_SIDES.indexOf(furnitureSide) + 1) % WALL_SIDES.length] === side;
  // Между касата и ъгъла винаги остава малко зид.
  const gap = 300;

  return clampDoor(room, {
    side,
    x: after ? wall - width - gap : gap,
    width,
    height: DOOR.DEFAULT_HEIGHT,
    hinge: after ? 'right' : 'left',
    swing: 'in',
  });
}

/**
 * Отворът в координатите на плана: по коя ос върви, откъде докъде и на
 * коя стена седи. Планът и обемът четат едно и също оттук.
 */
export interface OpeningSpan {
  axis: 'x' | 'z';
  from: number;
  to: number;
  at: number;
}

/** Отсечката на кой да е отвор по стената му, в координати на плана. */
export function openingSpan(
  room: Room,
  side: WallSide,
  x: number,
  width: number,
): OpeningSpan {
  const a = pointAlong(room, side, x);
  const b = pointAlong(room, side, x + width);
  return side === 'top' || side === 'bottom'
    ? { axis: 'x', from: Math.min(a.x, b.x), to: Math.max(a.x, b.x), at: a.y }
    : { axis: 'z', from: Math.min(a.y, b.y), to: Math.max(a.y, b.y), at: a.x };
}

export function doorSpan(room: Room, door: RoomDoor): OpeningSpan {
  return openingSpan(room, door.side, door.x, door.width);
}

/** Точката на пантите в плана — около нея се върти крилото. */
export function doorHingePoint(room: Room, door: RoomDoor): { x: number; y: number } {
  return pointAlong(room, door.side, door.hinge === 'left' ? door.x : door.x + door.width);
}

/** Свободният ръб при затворено крило. */
export function doorFreePoint(room: Room, door: RoomDoor): { x: number; y: number } {
  return pointAlong(room, door.side, door.hinge === 'left' ? door.x + door.width : door.x);
}

const rectBetween = (a: { x: number; y: number }, b: { x: number; y: number }): Rect => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  width: Math.abs(a.x - b.x),
  height: Math.abs(a.y - b.y),
});

/**
 * Подът, който вратата държи зает: четвъртината, която крилото мете,
 * а при врата навън — само пътеката пред отвора. Квадратът около
 * дъгата е нарочно по-голям от самата дъга: в план така се чертае и
 * така мебелта не опира в крилото на косъм.
 */
export function doorKeepOut(room: Room, door: RoomDoor): Rect {
  const into = facingOf(door.side);
  const depth = door.swing === 'in' ? door.width : DOOR.CLEARANCE;
  const hinge = doorHingePoint(room, door);
  const free = doorFreePoint(room, door);
  const far = { x: free.x + into.dx * depth, y: free.y + into.dy * depth };
  return rectBetween(hinge, far);
}

/**
 * Коя стена сочи човекът и къде по нея.
 *
 * Най-прекият начин да се каже „вратата е тук" е да се посочи в плана.
 * Точката се свежда до най-близката стена и до местното `x` по нея —
 * същото `x`, с което се мери всичко останало.
 */
export function doorDrop(
  room: Room,
  point: { x: number; y: number },
): { side: WallSide; x: number } {
  const candidates: { side: WallSide; x: number; away: number }[] = [
    { side: 'top', x: point.x, away: Math.abs(point.y) },
    { side: 'bottom', x: room.width - point.x, away: Math.abs(point.y - room.depth) },
    { side: 'left', x: room.depth - point.y, away: Math.abs(point.x) },
    { side: 'right', x: point.y, away: Math.abs(point.x - room.width) },
  ];
  const best = candidates.reduce((a, b) => (b.away < a.away ? b : a));
  return { side: best.side, x: best.x };
}

/** Вратата, преместена там, където човекът е посочил — със средата си. */
export function placeDoorAt(
  room: Room,
  door: RoomDoor,
  point: { x: number; y: number },
): RoomDoor {
  const { side, x } = doorDrop(room, point);
  return clampDoor(room, { ...door, side, x: x - door.width / 2 });
}

/**
 * Знакът на вратата в план: пантите, затвореното крило, отвореното на
 * прав ъгъл и дъгата между тях — както се чертае в архитектурен план.
 *
 * Посоката на дъгата се смята, не се гадае: в екранните координати `y`
 * расте надолу, затова „по часовника" зависи от стената и от пантите.
 */
export interface DoorPlanSymbol {
  hinge: { x: number; y: number };
  closed: { x: number; y: number };
  open: { x: number; y: number };
  radius: number;
  /** Флагът `sweep` на SVG дъгата от `closed` до `open`. */
  sweep: 0 | 1;
}

export function doorPlan(room: Room, door: RoomDoor): DoorPlanSymbol {
  const d = clampDoor(room, door);
  const hinge = doorHingePoint(room, d);
  const closed = doorFreePoint(room, d);
  const into = facingOf(d.side);
  const reach = d.swing === 'in' ? 1 : -1;
  const open = {
    x: hinge.x + into.dx * d.width * reach,
    y: hinge.y + into.dy * d.width * reach,
  };
  const a = { x: closed.x - hinge.x, y: closed.y - hinge.y };
  const b = { x: open.x - hinge.x, y: open.y - hinge.y };
  return {
    hinge,
    closed,
    open,
    radius: d.width,
    sweep: a.x * b.y - a.y * b.x > 0 ? 1 : 0,
  };
}

/** Участъците от стената, по които още може да се нарежда мебел. */
export function doorFreeRuns(
  room: Room,
  door: RoomDoor | undefined,
  side: WallSide,
): { x: number; width: number }[] {
  const wall = sideLength(room, side);
  if (!door || door.side !== side) return wall > 0 ? [{ x: 0, width: wall }] : [];
  const d = clampDoor(room, door);
  return [
    { x: 0, width: d.x },
    { x: d.x + d.width, width: wall - d.x - d.width },
  ].filter((run) => run.width > 0);
}

/** Най-дългият участък, в който мебелта може да се побере наведнъж. */
export function longestFreeRun(
  room: Room,
  door: RoomDoor | undefined,
  side: WallSide,
): { x: number; width: number } {
  const runs = doorFreeRuns(room, door, side);
  return runs.reduce((best, run) => (run.width > best.width ? run : best), { x: 0, width: 0 });
}

/**
 * Вратата, представена като отвор в стена.
 *
 * Фронталният чертеж вече знае да рисува врати и прозорци; вратата на
 * стаята е същото нещо, видяно оттам. Връща `null`, когато тя не е на
 * тази стена.
 */
export function doorAsOpening(
  door: RoomDoor | undefined,
  side: WallSide,
): {
  id: string;
  kind: 'door';
  x: number;
  width: number;
  bottom: number;
  height: number;
} | null {
  if (!door || door.side !== side) return null;
  return {
    id: 'room-door',
    kind: 'door',
    x: door.x,
    width: door.width,
    bottom: 0,
    height: door.height,
  };
}

/**
 * Отворът като зает участък за правилата, които пълнят стената. Те вече
 * знаят да заобикалят прозорци — вратата е същото, само че до пода.
 */
export function doorBlocks(
  room: Room,
  door: RoomDoor | undefined,
  side: WallSide,
): { x: number; width: number }[] {
  if (!door || door.side !== side) return [];
  const d = clampDoor(room, door);
  return [{ x: d.x, width: d.width }];
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/**
 * Какво стои на пътя на вратата. Не се мести само — казва се, защото
 * решението е на човека: или мебелта, или вратата.
 */
export function doorClashes<T extends { rect: Rect }>(
  room: Room,
  door: RoomDoor | undefined,
  items: T[],
): T[] {
  if (!door) return [];
  const keepOut = doorKeepOut(room, clampDoor(room, door));
  return items.filter((item) => overlaps(item.rect, keepOut));
}

/* ------------------------------------------------------------------ */
/* Прозорците                                                          */
/* ------------------------------------------------------------------ */

/**
 * Прозорец в стената.
 *
 * Разликата от вратата: виси на парапет и затова не пречи на долния
 * ред шкафове, а на горния пречи. Прозорците са повече от един — в
 * стая с две външни стени е нормално да има два.
 */
export interface RoomWindow {
  id: string;
  side: WallSide;
  /** Отстояние на левия ръб от началото на стената. */
  x: number;
  width: number;
  /** Долен ръб над пода — парапетът. */
  sill: number;
  height: number;
}

export const WINDOW = {
  MIN_WIDTH: 400,
  MAX_WIDTH: 4000,
  MIN_HEIGHT: 400,
  MAX_HEIGHT: 2600,
  /** Най-ниският и най-високият парапет, които имат смисъл. */
  MIN_SILL: 0,
  MAX_SILL: 2000,
  STEP: 10,
  /** Обичаен прозорец в жилище. */ // ПРОВЕРИ
  DEFAULT_WIDTH: 1200,
  DEFAULT_HEIGHT: 1400,
  DEFAULT_SILL: 900,
  /** Дебелина на крилото и на рамката, които се виждат в обема. */
  FRAME: 60,
  GLASS: 20,
  /** Колко навътре стърчи первазът. */
  LEDGE: 40,
  /** Най-много прозорци в една стая — повече е грешка, не желание. */
  MAX_COUNT: 6,
} as const;

/** Прозорецът, вкаран в стената си и в допустимите мерки. */
export function clampWindow(room: Room, win: RoomWindow): RoomWindow {
  const wall = sideLength(room, win.side);
  const step = (value: number) => Math.round(value / WINDOW.STEP) * WINDOW.STEP;
  const width = Math.min(
    Math.max(WINDOW.MIN_WIDTH, step(win.width)),
    Math.min(WINDOW.MAX_WIDTH, wall),
  );
  const sill = Math.min(WINDOW.MAX_SILL, Math.max(WINDOW.MIN_SILL, step(win.sill)));
  return {
    ...win,
    width,
    sill,
    height: Math.min(WINDOW.MAX_HEIGHT, Math.max(WINDOW.MIN_HEIGHT, step(win.height))),
    x: Math.min(Math.max(0, step(win.x)), wall - width),
  };
}

/**
 * Нов прозорец на стената, която още няма такъв.
 *
 * Слага се в средата ѝ: оттам се вижда, че е нов, и се мести накъдето
 * трябва. Стената с вратата се прескача, ако има друга свободна.
 */
/*
 * Ред на предпочитание за нов прозорец. Долната стена е последна: тя е
 * тази, иззад която се гледа стаята, и прозорец на нея се вижда едва
 * от птичи поглед.
 */
const WINDOW_WALL_ORDER: readonly WallSide[] = ['top', 'left', 'right', 'bottom'];

export function defaultWindow(
  room: Room,
  taken: { side: WallSide }[] = [],
  id = `w${Date.now().toString(36)}`,
): RoomWindow {
  const used = new Set(taken.map((t) => t.side));
  const side = WINDOW_WALL_ORDER.find((s) => !used.has(s)) ?? 'top';
  const wall = sideLength(room, side);
  const width = Math.min(WINDOW.DEFAULT_WIDTH, wall);
  return clampWindow(room, {
    id,
    side,
    x: Math.max(0, (wall - width) / 2),
    width,
    sill: WINDOW.DEFAULT_SILL,
    height: WINDOW.DEFAULT_HEIGHT,
  });
}

export function windowSpan(room: Room, win: RoomWindow): OpeningSpan {
  return openingSpan(room, win.side, win.x, win.width);
}

/** Прозорецът, преместен със средата си там, където е посочено. */
export function placeWindowAt(
  room: Room,
  win: RoomWindow,
  point: { x: number; y: number },
): RoomWindow {
  const { side, x } = doorDrop(room, point);
  return clampWindow(room, { ...win, side, x: x - win.width / 2 });
}

/** Прозорецът като отвор в стена — за чертежа и за правилата. */
export function windowAsOpening(
  win: RoomWindow,
  side: WallSide,
): {
  id: string;
  kind: 'window';
  x: number;
  width: number;
  bottom: number;
  height: number;
} | null {
  if (win.side !== side) return null;
  return {
    id: win.id,
    kind: 'window',
    x: win.x,
    width: win.width,
    bottom: win.sill,
    height: win.height,
  };
}

/**
 * Всички отвори на една стена, както ги разбират правилата и чертежът:
 * вратата, ако е на нея, плюс прозорците по нея.
 */
export function wallOpeningsOn(
  door: RoomDoor | undefined,
  windows: readonly RoomWindow[] | undefined,
  side: WallSide,
): {
  id: string;
  kind: 'door' | 'window';
  x: number;
  width: number;
  bottom: number;
  height: number;
}[] {
  const list: ReturnType<typeof wallOpeningsOn> = [];
  const d = doorAsOpening(door, side);
  if (d) list.push(d);
  for (const win of windows ?? []) {
    const w = windowAsOpening(win, side);
    if (w) list.push(w);
  }
  return list.sort((a, b) => a.x - b.x);
}
