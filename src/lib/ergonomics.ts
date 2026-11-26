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
import type { Ezik } from '@/i18n/ezik';
import { kod, prevedi } from '@/i18n/rechnik';
import { tekstove } from '@/i18n/tekst';

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

const m2 = (mm: number, ezik: Ezik = 'bg') => {
  const s = (mm / 1000).toFixed(2);
  return ezik === 'bg' ? s.replace('.', ',') : s;
};

/**
 * Бележките на трите езика. Числата и номерата на шкафовете се подават
 * отвън — тук е само как се казват.
 */
const TEKST = tekstove({
  bg: {
    hladilnik: (kod: string, gap: number) =>
      `Хладилникът (${kod}) е точно до ъгъла с шкафовете на съседната стена — вратата му ще удря дръжките им. Оставете поне ${gap} мм бленда до него.`,
    furnaHladilnik: (kod: string) =>
      `Фурната (${kod}) е точно до хладилника — топлината ѝ го натоварва. По-добре шкаф или чекмеджета помежду.`,
    sadomiyalna:
      'Съдомиялната не е до мивката. До нея маркучите са по-къси, а чиниите се зареждат направо от мивката.',
    aspirator: (kod: string) =>
      `Аспираторът (${kod}) не е над фурната и котлона — там, където се готви, няма да тегли.`,
    triagalnikDalag: (sum: string, max: string) =>
      `Мивката, котлонът и хладилникът са общо на ${sum} м един от друг — над ${max} м се ходи излишно, докато се готви.`,
    triagalnikTesen: (min: string) =>
      `Две от трите места за работа — мивка, котлон, хладилник — са на по-малко от ${min} м. Остава малко плот между тях за рязане и оставяне.`,
    triagalnikStrana: (max: string) =>
      `Една от страните на работния триъгълник е над ${max} м — това разстояние ще се ходи много пъти на ден.`,
    sliapAgal:
      'Ъгълът между стените остава празен — сляп ъгъл. Ъглов шкаф с въртящ се механизъм ще го ползва, щом дойде каталогът на доставчика.',
    chekmedzheAgal: (ime: string) =>
      `${ime} е точно до ъгъла — челото ще удря дръжките на съседния ред. Нужна е бленда поне 50 мм.`,
    prohod: (free: number, one: number, two: number) =>
      `Между двата реда остават ${free} мм — за минаване трябват поне ${one} мм, за двама души ${two}.`,
    vrata: (gap: number) =>
      `Вратата на стаята е на ${gap} мм от ъгъла, а там стоят шкафове — крилото ще ги удари. Преместете вратата или направете да се отваря навън.`,
    tavanAntresol: (mm: number) =>
      `Над антресола до тавана остават ${mm} мм — може по-висок антресол, след потвърждение от мебелиста.`,
    tavan: (mm: number) => `Над високите шкафове до тавана остават ${mm} мм — място за антресол.`,
  },
  en: {
    hladilnik: (kod: string, gap: number) =>
      `The fridge (${kod}) is right at the corner with the cabinets on the next wall — its door will hit their handles. Leave a filler panel of at least ${gap} mm next to it.`,
    furnaHladilnik: (kod: string) =>
      `The oven (${kod}) is right next to the fridge — its heat puts strain on it. A cabinet or drawers in between would be better.`,
    sadomiyalna:
      'The dishwasher is not next to the sink. Beside it the hoses are shorter and dishes can be loaded straight from the sink.',
    aspirator: (kod: string) =>
      `The extractor hood (${kod}) is not above the oven and hob — it won’t draw where the cooking happens.`,
    triagalnikDalag: (sum: string, max: string) =>
      `The sink, hob and fridge are ${sum} m apart in total — beyond ${max} m you walk more than you need to while cooking.`,
    triagalnikTesen: (min: string) =>
      `Two of the three work spots — sink, hob, fridge — are less than ${min} m apart. That leaves little worktop between them for chopping and setting things down.`,
    triagalnikStrana: (max: string) =>
      `One side of the work triangle is longer than ${max} m — a distance you will walk many times a day.`,
    sliapAgal:
      'The corner between the walls is left empty — a blind corner. A corner cabinet with a swing-out mechanism will use it once the supplier’s catalogue arrives.',
    chekmedzheAgal: (ime: string) =>
      `${ime} is right at the corner — its front will hit the handles of the next row. A filler panel of at least 50 mm is needed.`,
    prohod: (free: number, one: number, two: number) =>
      `There are ${free} mm between the two rows — you need at least ${one} mm to pass, ${two} mm for two people.`,
    vrata: (gap: number) =>
      `The room door is ${gap} mm from the corner, where there are cabinets — the door will hit them. Move the door or make it open outwards.`,
    tavanAntresol: (mm: number) =>
      `There are ${mm} mm left between the top boxes and the ceiling — taller top boxes are possible once our cabinet maker confirms.`,
    tavan: (mm: number) => `There are ${mm} mm left between the tall cabinets and the ceiling — room for top boxes.`,
  },
  zh: {
    hladilnik: (kod: string, gap: number) =>
      `冰箱（${kod}）紧挨着与相邻墙柜子形成的转角——冰箱门会碰到它们的拉手。请在旁边留出至少 ${gap} mm 的封板。`,
    furnaHladilnik: (kod: string) =>
      `烤箱（${kod}）紧挨着冰箱——热量会加重冰箱负担。中间最好隔一个柜子或抽屉。`,
    sadomiyalna: '洗碗机不在水槽旁边。放在水槽旁，水管更短，碗盘也能直接从水槽放进去。',
    aspirator: (kod: string) => `油烟机（${kod}）不在烤箱和灶台上方——做饭的地方抽不到油烟。`,
    triagalnikDalag: (sum: string, max: string) =>
      `水槽、灶台和冰箱之间总距离为 ${sum} m——超过 ${max} m，做饭时就要多走冤枉路。`,
    triagalnikTesen: (min: string) =>
      `水槽、灶台、冰箱这三个工作点中，有两个相距不到 ${min} m。它们之间留给切菜和摆放的台面太少。`,
    triagalnikStrana: (max: string) => `工作三角的一条边超过 ${max} m——这段距离每天要走很多次。`,
    sliapAgal: '两面墙之间的转角是空的——形成转角盲区。供应商目录到货后，可用带旋转五金的转角柜来利用它。',
    chekmedzheAgal: (ime: string) => `${ime}紧挨着转角——面板会碰到相邻一排的拉手。需要至少 50 mm 的封板。`,
    prohod: (free: number, one: number, two: number) =>
      `两排柜子之间只有 ${free} mm——一人通行至少需要 ${one} mm，两人需要 ${two} mm。`,
    vrata: (gap: number) =>
      `房门距墙角 ${gap} mm，而那里有柜子——门扇会撞到它们。请移动房门或改为向外开。`,
    tavanAntresol: (mm: number) => `顶柜上方距天花板还有 ${mm} mm——经家具师傅确认后，顶柜可以做得更高。`,
    tavan: (mm: number) => `高柜上方距天花板还有 ${mm} mm——可以加顶柜。`,
  },
});

interface Spot {
  m: PlacedModule;
  side: WallSide;
  /** Средата на модула на пода. */
  at: { x: number; z: number };
}

export function ergonomics(kitchen: Kitchen, result: KitchenResult, ezik: Ezik = 'bg'): Note[] {
  const t = TEKST[ezik];
  const k = (code: string | null | undefined) => kod(code ?? '', ezik);
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
          text: t.hladilnik(k(f.m.code), FRIDGE_GAP),
        });
      }
    }

    for (const oven of find('oven')) {
      if (find('column').some((c) => sameRowNeighbours(oven, c))) {
        notes.push({
          id: `furna-hladilnik-${oven.m.id}`,
          level: 'warn',
          text: t.furnaHladilnik(k(oven.m.code)),
        });
      }
    }

    const sinks = find('sink');
    for (const dw of find('dw')) {
      if (sinks.length && !sinks.some((s) => sameRowNeighbours(s, dw))) {
        notes.push({
          id: `sadomiyalna-${dw.m.id}`,
          level: 'info',
          text: t.sadomiyalna,
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
          text: t.aspirator(k(hood.m.code)),
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
          text: t.triagalnikDalag(m2(sum, ezik), m2(TRIANGLE_MAX, ezik)),
        });
      } else if (legs.some((l) => l < LEG_MIN)) {
        notes.push({
          id: 'triagalnik-tesen',
          level: 'info',
          text: t.triagalnikTesen(m2(LEG_MIN, ezik)),
        });
      } else if (legs.some((l) => l > LEG_MAX)) {
        notes.push({
          id: 'triagalnik-strana',
          level: 'info',
          text: t.triagalnikStrana(m2(LEG_MAX, ezik)),
        });
      }
    }
  }

  /* --- Ъглите ------------------------------------------------------------- */

  if (corners.length) {
    notes.push({
      id: 'sliap-agal',
      level: 'info',
      text: t.sliapAgal,
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
        text: t.chekmedzheAgal(s.m.code ? k(s.m.code) : prevedi(s.m.spec.label, ezik)),
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
        text: t.prohod(Math.round(free), WALKWAY_ONE, WALKWAY_TWO),
      });
    }
  }

  /* --- Вратата на стаята --------------------------------------------- */

  const door = kitchenDoor(kitchen);
  if (door.swing === 'in') {
    const len = sideLength(room, door.side);
    const k0 = ['top', 'right', 'bottom', 'left'].indexOf(door.side);
    const prev = (['top', 'right', 'bottom', 'left'] as const)[(k0 + 3) % 4];
    const next = (['top', 'right', 'bottom', 'left'] as const)[(k0 + 1) % 4];
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
        text: t.vrata(Math.round(gap)),
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
        ? t.tavanAntresol(Math.round(ceiling - top))
        : t.tavan(Math.round(ceiling - top)),
    });
  }

  return notes;
}
