/**
 * Удобството на стаята — правила, които предупреждават, преди да се
 * поръча нещо неудобно.
 *
 * Не забраняват: мебелта е на клиента, а понякога друго не става. Казват
 * какво ще пречи в живота — врата, която удря, хладилник, който не се
 * отваря, ъгъл, в който чекмеджето не излиза — и как се оправя.
 *
 * Числата са общоприетите препоръки за кухни (работният триъгълник и
 * разстоянието между редовете са от американската асоциация за кухни и
 * бани, NKBA), а не мерки на цеха.
 */

import {
  DIM,
  type Kitchen,
  type KitchenResult,
  type ModuleKind,
  type PlacedModule,
  kitchenDoor,
  kitchenRoom,
  kitchenWallOpenings,
  moduleGeometry,
  wallSide,
} from './cabinet-rules';
import { type WallSide, ceilingOf, footprint, sideLength } from './furniture/room';

export interface Note {
  id: string;
  /** `warn` — ще пречи; `info` — може да е по-добре. */
  level: 'warn' | 'info';
  text: string;
}

/** Отстояние между хладилника и стената, за да се отвори вратата му. */
const FRIDGE_GAP = 50;
/** Работният триъгълник: всяка страна и сборът им, в мм. */
const LEG_MIN = 1200;
const LEG_MAX = 2700;
const TRIANGLE_MAX = 7900;
/** Проход между два реда шкафове: за един човек и за двама. */
const WALKWAY_ONE = 1000;
const WALKWAY_TWO = 1200;
/** Колко място над антресола или гардероба вече си струва да се ползва. */
const CEILING_SPARE = 150;

const m2 = (mm: number) => (mm / 1000).toFixed(2).replace('.', ',');

interface Spot {
  m: PlacedModule;
  side: WallSide;
  /** Средата на модула на пода. */
  at: { x: number; z: number };
}

export function ergonomics(kitchen: Kitchen, result: KitchenResult): Note[] {
  const notes: Note[] = [];
  const room = kitchenRoom(kitchen);
  const kind = kitchen.roomKind ?? 'kitchen';

  const spots: Spot[] = [];
  kitchen.walls.forEach((wall, i) => {
    const side = wallSide(wall, i);
    for (const m of [...(result.placed[i]?.base ?? []), ...(result.placed[i]?.upper ?? [])]) {
      const r = footprint(room, side, m.x, m.width, moduleGeometry(m.kind).depth);
      spots.push({ m, side, at: { x: r.x + r.width / 2, z: r.y + r.height / 2 } });
    }
  });
  const find = (k: ModuleKind) => spots.filter((s) => s.m.kind === k);
  const sameRowNeighbours = (a: Spot, b: Spot) =>
    a.side === b.side &&
    a.m.row === b.m.row &&
    (Math.abs(a.m.x + a.m.width - b.m.x) < 1 || Math.abs(b.m.x + b.m.width - a.m.x) < 1);
  const corners = kitchen.walls.flatMap((w, i) =>
    kitchenWallOpenings(kitchen, wallSide(w, i))
      .filter((o) => o.kind === 'corner' && o.bottom < DIM.LEG + DIM.BASE_H)
      .map((o) => ({ side: wallSide(w, i), from: o.x, to: o.x + o.width })),
  );

  /* --- Кухнята --------------------------------------------------------- */

  if (kind === 'kitchen') {
    // Вграденият хладилник в колона се отваря и до стената — колоната
    // му дава място. Пречат шкафовете на съседната стена в ъгъла.
    for (const f of find('column')) {
      const byCorner = corners.some(
        (c) => c.side === f.side && (Math.abs(c.to - f.m.x) < 1 || Math.abs(f.m.x + f.m.width - c.from) < 1),
      );
      if (byCorner) {
        notes.push({
          id: `hladilnik-${f.m.id}`,
          level: 'warn',
          text: `Хладилникът (${f.m.code}) е точно до ъгъла с шкафовете на съседната стена — вратата му ще удря дръжките им. Оставете поне ${FRIDGE_GAP} мм бленда до него.`,
        });
      }
    }

    for (const oven of find('oven')) {
      if (find('column').some((c) => sameRowNeighbours(oven, c))) {
        notes.push({
          id: `furna-hladilnik-${oven.m.id}`,
          level: 'warn',
          text: `Фурната (${oven.m.code}) е точно до хладилника — топлината ѝ го натоварва. По-добре шкаф или чекмеджета помежду.`,
        });
      }
    }

    const sinks = find('sink');
    for (const dw of find('dw')) {
      if (sinks.length && !sinks.some((s) => sameRowNeighbours(s, dw))) {
        notes.push({
          id: `sadomiyalna-${dw.m.id}`,
          level: 'info',
          text: 'Съдомиялната не е до мивката. До нея маркучите са по-къси, а чиниите се зареждат направо от мивката.',
        });
      }
    }

    const ovens = find('oven');
    for (const hood of find('hood')) {
      const over = ovens.some(
        (o) => o.side === hood.side && o.m.x < hood.m.x + hood.m.width && hood.m.x < o.m.x + o.m.width,
      );
      if (ovens.length && !over) {
        notes.push({
          id: `aspirator-${hood.m.id}`,
          level: 'warn',
          text: `Аспираторът (${hood.m.code}) не е над фурната и котлона — там, където се готви, няма да тегли.`,
        });
      }
    }

    // Работният триъгълник: мивка, котлон (фурната), хладилник.
    const [sink] = sinks;
    const [oven] = ovens;
    const [fridge] = find('column');
    if (sink && oven && fridge) {
      const leg = (a: Spot, b: Spot) => Math.hypot(a.at.x - b.at.x, a.at.z - b.at.z);
      const legs = [leg(sink, oven), leg(oven, fridge), leg(fridge, sink)];
      const sum = legs.reduce((s, l) => s + l, 0);
      if (sum > TRIANGLE_MAX) {
        notes.push({
          id: 'triagalnik-dalag',
          level: 'info',
          text: `Мивката, котлонът и хладилникът са общо на ${m2(sum)} м един от друг — над ${m2(TRIANGLE_MAX)} м се ходи излишно, докато се готви.`,
        });
      } else if (legs.some((l) => l < LEG_MIN)) {
        notes.push({
          id: 'triagalnik-tesen',
          level: 'info',
          text: `Две от трите места за работа — мивка, котлон, хладилник — са на по-малко от ${m2(LEG_MIN)} м. Остава малко плот между тях за рязане и оставяне.`,
        });
      } else if (legs.some((l) => l > LEG_MAX)) {
        notes.push({
          id: 'triagalnik-strana',
          level: 'info',
          text: `Една от страните на работния триъгълник е над ${m2(LEG_MAX)} м — това разстояние ще се ходи много пъти на ден.`,
        });
      }
    }
  }

  /* --- Ъглите ------------------------------------------------------------- */

  if (corners.length) {
    notes.push({
      id: 'sliap-agal',
      level: 'info',
      text: 'Ъгълът между стените остава празен — сляп ъгъл. Ъглов шкаф с въртящ се механизъм ще го ползва, щом дойде каталогът на доставчика.',
    });
  }
  const handled: ReadonlySet<ModuleKind> = new Set<ModuleKind>(['drawers', 'oven', 'dw', 'bath-drawers', 'wardrobe-drawers']);
  for (const s of spots) {
    if (!handled.has(s.m.kind) || s.m.row !== 'base') continue;
    const atCorner = corners.some(
      (c) => c.side === s.side && (Math.abs(c.to - s.m.x) < 1 || Math.abs(s.m.x + s.m.width - c.from) < 1),
    );
    if (atCorner) {
      notes.push({
        id: `cheknedzhe-agal-${s.m.id}`,
        level: 'warn',
        text: `${s.m.code ?? s.m.spec.label} е точно до ъгъла — челото ще удря дръжките на съседния ред. Нужна е бленда поне 50 мм.`,
      });
    }
  }

  /* --- Проход между редовете -------------------------------------------- */

  const hasBase = (side: WallSide) =>
    kitchen.walls.some((w, i) => wallSide(w, i) === side && w.base.length > 0);
  for (const [a, b, across] of [
    ['top', 'bottom', room.depth],
    ['left', 'right', room.width],
  ] as const) {
    if (!hasBase(a) || !hasBase(b)) continue;
    const free = across - 2 * DIM.BASE_D;
    if (free < WALKWAY_TWO) {
      notes.push({
        id: `prohod-${a}`,
        level: free < WALKWAY_ONE ? 'warn' : 'info',
        text: `Между двата реда остават ${Math.round(free)} мм — за минаване трябват поне ${WALKWAY_ONE} мм, за двама души ${WALKWAY_TWO}.`,
      });
    }
  }

  /* --- Вратата на стаята --------------------------------------------- */

  const door = kitchenDoor(kitchen);
  if (door.swing === 'in') {
    const len = sideLength(room, door.side);
    const k = ['top', 'right', 'bottom', 'left'].indexOf(door.side);
    const prev = (['top', 'right', 'bottom', 'left'] as const)[(k + 3) % 4];
    const next = (['top', 'right', 'bottom', 'left'] as const)[(k + 1) % 4];
    const reachesEnd = (side: WallSide) =>
      kitchen.walls.some(
        (w, i) =>
          wallSide(w, i) === side && w.base.length > 0 && w.length >= sideLength(room, side) - door.width,
      );
    const reachesStart = (side: WallSide) =>
      kitchen.walls.some((w, i) => wallSide(w, i) === side && w.base.length > 0);
    const nearStart = door.x < DIM.BASE_D + 50 && reachesEnd(prev);
    const nearEnd = len - (door.x + door.width) < DIM.BASE_D + 50 && reachesStart(next);
    if (nearStart || nearEnd) {
      const gap = nearStart ? door.x : len - (door.x + door.width);
      notes.push({
        id: 'vrata-shkafove',
        level: 'warn',
        text: `Вратата на стаята е на ${Math.round(gap)} мм от ъгъла, а там стоят шкафове — крилото ще ги удари. Преместете вратата или направете да се отваря навън.`,
      });
    }
  }

  /* --- Таванът ---------------------------------------------------------- */

  const ceiling = ceilingOf(room);
  const tops = spots.map((s) => moduleGeometry(s.m.kind)).map((g) => g.y + g.height);
  const top = tops.length ? Math.max(...tops) : 0;
  const hasAttic = spots.some((s) => s.m.kind === 'attic' || s.m.kind === 'hall-attic');
  const hasTall = spots.some((s) => moduleGeometry(s.m.kind).height >= 1800);
  // Мястото до тавана е въпрос за гардероби; над кухненската колона не се пита.
  const wardrobeRoom = kind === 'bedroom' || kind === 'hall' || kind === 'corridor';
  if (wardrobeRoom && hasTall && ceiling - top >= CEILING_SPARE) {
    notes.push({
      id: 'tavan',
      level: 'info',
      text: hasAttic
        ? `Над антресола до тавана остават ${Math.round(ceiling - top)} мм — може по-висок антресол, след потвърждение от мебелиста.`
        : `Над високите шкафове до тавана остават ${Math.round(ceiling - top)} мм — място за антресол.`,
    });
  }

  return notes;
}
