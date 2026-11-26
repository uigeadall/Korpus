/**
 * Проектът, казан с думи — за модела и за човека.
 *
 * Картинката носи геометрията; думите носят какво е направено от какво.
 * Заедно казват на модела да нарисува ТАЗИ кухня, а не някаква:
 * размерите и формите идват от картите (`render.ts`), материалите и
 * светлината — оттук.
 *
 * Две описания, нарочно:
 *
 *   `promptEn` — за модела. На английски, защото моделите за картини са
 *     учени на него и на български дават по-лош резултат. Това не е
 *     мнение за езика, а за това с какво са хранени.
 *   `summaryBg` — за човека. Същото, казано на български, за да се вижда
 *     какво ще бъде поръчано, преди да се похарчи повикване.
 *
 * Речникът е таблица, не измисляне в движение: нов материал се добавя на
 * едно място и тестът пази да няма вид без превод.
 */

import {
  MODULES,
  ROOM_KIND_LABEL,
  type Kitchen,
  type ModuleKind,
  type RoomKind,
  type WorktopType,
  computeKitchen,
  isGapKind,
  kitchenDoor,
  kitchenRoom,
  kitchenWindows,
} from './cabinet-rules';
import { type FinishCategory, finishById } from '@/config/wall-finishes';
import type { WallSide } from './furniture/room';
import { FURNISHINGS, type FurnishingKind } from './furnishings';

/** Свободностоящата мебел на модела: едно и много. */
const FURNISHING_EN: Record<FurnishingKind, [string, string]> = {
  'dining-table': ['a dining table', 'dining tables'],
  chair: ['a chair', 'chairs'],
  sofa: ['a sofa', 'sofas'],
  armchair: ['an armchair', 'armchairs'],
  'coffee-table': ['a coffee table', 'coffee tables'],
  bed: ['a bed', 'beds'],
  nightstand: ['a nightstand', 'nightstands'],
};

const COUNT_EN = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];
const countEn = (n: number) => COUNT_EN[n] ?? String(n);

/**
 * Всеки модул по име, едно и много.
 *
 * „7 модула с кремави фронтове" не казва нищо на модела и той си
 * избира: в една всекидневна от библиотека и стенни рафтове направи
 * кухня с мивка. Назован по вид, модулът остава това, което е.
 * Празните места не се казват — те са въздух, не мебел.
 */
const MODULE_EN: Record<ModuleKind, [string, string]> = {
  column: ['a tall fridge column', 'tall fridge columns'],
  door: ['a base cabinet with a door', 'base cabinets with doors'],
  drawers: ['a base unit with three drawers', 'base units with three drawers'],
  sink: ['a sink base cabinet', 'sink base cabinets'],
  oven: ['a built-in oven cabinet', 'built-in oven cabinets'],
  dw: ['an integrated dishwasher', 'integrated dishwashers'],
  lgap: ['', ''],
  upper: ['a wall cabinet', 'wall cabinets'],
  hood: ['a wall cabinet above the cooker hood', 'wall cabinets above the cooker hood'],
  ugap: ['', ''],
  wardrobe: ['a wardrobe with a hanging rail', 'wardrobes with hanging rails'],
  'wardrobe-shelves': ['a wardrobe with shelves', 'wardrobes with shelves'],
  'wardrobe-drawers': ['a chest of drawers', 'chests of drawers'],
  'wardrobe-open': ['an open wardrobe section', 'open wardrobe sections'],
  attic: ['a top cabinet above the wardrobe', 'top cabinets above the wardrobe'],
  wgap: ['', ''],
  tv: ['a TV unit with drawers', 'TV units with drawers'],
  lowboard: ['a low sideboard with a door', 'low sideboards with doors'],
  bookcase: ['an open bookcase', 'open bookcases'],
  wallbox: ['a wall-mounted cabinet', 'wall-mounted cabinets'],
  wallshelf: ['a floating wall shelf', 'floating wall shelves'],
  vgap: ['', ''],
  vanity: ['a vanity unit with a washbasin', 'vanity units with washbasins'],
  'bath-drawers': ['a bathroom drawer unit', 'bathroom drawer units'],
  'bath-tall': ['a tall bathroom cabinet', 'tall bathroom cabinets'],
  washer: ['a washing machine niche', 'washing machine niches'],
  bgap: ['', ''],
  'bath-mirror': ['a mirror cabinet', 'mirror cabinets'],
  'bath-shelf': ['an open bathroom shelf', 'open bathroom shelves'],
  'hall-wardrobe': ['a coat cupboard', 'coat cupboards'],
  shoe: ['a shoe cabinet', 'shoe cabinets'],
  'hall-open': ['an open coat rack with a shelf', 'open coat racks with shelves'],
  bench: ['a shoe bench', 'shoe benches'],
  hgap: ['', ''],
  'hall-attic': ['a top cabinet', 'top cabinets'],
};

/** „one open bookcase, two floating wall shelves" — по реда, в който се срещат. */
function countedList<K extends string>(kinds: K[], names: Record<K, [string, string]>): string {
  const counts = new Map<K, number>();
  for (const k of kinds) counts.set(k, (counts.get(k) ?? 0) + 1);
  return [...counts]
    .map(([k, n]) => (n === 1 ? names[k][0] : `${countEn(n)} ${names[k][1]}`))
    .join(', ');
}

/** Как се казва всяка стая на модела. */
const ROOM_EN: Record<RoomKind, string> = {
  kitchen: 'kitchen',
  bedroom: 'bedroom',
  living: 'living room',
  bath: 'bathroom',
  corridor: 'hallway',
  hall: 'entryway',
};

const WORKTOP_EN: Record<WorktopType, string> = {
  laminate38: 'laminate worktop',
  quartz20: 'quartz stone worktop',
  sintered12: 'sintered stone worktop',
  granite30: 'granite worktop',
};

/**
 * Покритието на стените, казано на модела.
 *
 * По вид, не по име: имената в каталога са български и често са цвят
 * („Топло бяло", „Грейж"), а цветът и без това го носи картинката.
 * Видът е това, което моделът не може да отгатне от нея — мазилка и
 * тухла изглеждат различно под една и съща светлина.
 */
const FINISH_EN: Record<FinishCategory, string> = {
  boya: 'smooth painted walls',
  mazilka: 'textured plaster walls',
  beton: 'bare concrete walls',
  tuhla: 'exposed brick wall',
  kamak: 'natural stone wall',
  plochki: 'tiled walls',
  mozaika: 'mosaic tile wall',
  mramor: 'marble wall',
  darvo: 'wood panelled wall',
  laminat: 'laminate panelled wall',
  tapet: 'wallpapered walls',
  paneli: 'decorative wall panels',
};

/** Накъде гледа стената — за да знае моделът откъде идва светлината. */
const SIDE_EN: Record<WallSide, string> = {
  top: 'the far wall',
  bottom: 'the near wall',
  left: 'the left wall',
  right: 'the right wall',
};

const SIDE_BG: Record<WallSide, string> = {
  top: 'насрещната стена',
  bottom: 'стената зад гърба',
  left: 'лявата стена',
  right: 'дясната стена',
};

/**
 * Цветът, казан като цвят, а не като номер.
 *
 * „RAL 9001 кремаво" не значи нищо на модела; „warm cream" — значи.
 * Вади се от името в каталога, където българската дума вече стои.
 */
function colorWords(name: string): { bg: string; en: string } {
  const bg = name.replace(/^RAL\s*\d+\s*/i, '').trim() || name;
  const EN: Record<string, string> = {
    'чисто бяло': 'pure white',
    кремаво: 'warm cream',
    'светло сиво': 'light grey',
    антрацит: 'anthracite grey',
    тръстика: 'reed green',
    'сиво синьо': 'slate blue',
    бял: 'white',
    'светъл дъб': 'light oak',
    'светло сив': 'light grey',
  };
  return { bg, en: EN[bg.toLowerCase()] ?? bg };
}

export interface Opisanie {
  /** Описанието за модела. */
  promptEn: string;
  /** Същото за човека. */
  summaryBg: string;
  /** Отделните твърдения — за да може интерфейсът да ги покаже поотделно. */
  parts: { bg: string; en: string }[];
}

/**
 * Какво има в стаята, казано с думи.
 *
 * Нарочно НЕ описва разположението: него го носят картите. Думи като
 * „шкаф вляво" само спорят с геометрията и моделът почва да избира.
 */
export function describeProject(kitchen: Kitchen): Opisanie {
  const roomKind = kitchen.roomKind ?? 'kitchen';
  const room = kitchenRoom(kitchen);
  const { placed } = computeKitchen(kitchen);

  const parts: { bg: string; en: string }[] = [];

  /* Стаята и мерките ѝ. */
  const w = (room.width / 1000).toFixed(1).replace('.', ',');
  const d = (room.depth / 1000).toFixed(1).replace('.', ',');
  parts.push({
    bg: `${ROOM_KIND_LABEL[roomKind]} ${w} на ${d} метра`,
    en: `a ${ROOM_EN[roomKind]}, ${(room.width / 1000).toFixed(1)} by ${(room.depth / 1000).toFixed(1)} metres`,
  });

  /* Какво стои по стените. */
  const solids = placed.flatMap((rows) =>
    [...rows.base, ...rows.upper].filter((m) => !isGapKind(m.kind)),
  );
  if (solids.length) {
    const run = Math.round(solids.reduce((s, m) => s + m.width, 0) / 100) / 10;
    parts.push({
      bg: `${solids.length} модула, ${String(run).replace('.', ',')} метра мебел`,
      en: `${run} metres of built-in furniture, exactly: ${countedList(
        solids.map((m) => m.kind),
        MODULE_EN,
      )}`,
    });
  } else {
    parts.push({ bg: 'без мебел — голи стени', en: 'an empty room, bare walls' });
  }

  /* От какво е направена. */
  const facade = colorWords(kitchen.materials.facade.color);
  const carcass = colorWords(kitchen.materials.carcassColor);
  parts.push({
    bg: `фасади ${facade.bg}, корпус ${carcass.bg}`,
    en: `${facade.en} cabinet fronts, ${carcass.en} carcasses`,
  });

  const hasWorktop = solids.some((m) => MODULES[m.kind].row === 'base');
  if (hasWorktop && (roomKind === 'kitchen' || roomKind === 'bath')) {
    parts.push({
      bg: `плот: ${WORKTOPS_BG[kitchen.materials.worktop]}`,
      en: WORKTOP_EN[kitchen.materials.worktop],
    });
  }

  const finish = finishById(kitchen.wallFinish?.all);
  parts.push({
    bg: `стени: ${finish.name.toLowerCase()}`,
    en: FINISH_EN[finish.category],
  });

  /* Откъде идва светлината. Прозорецът решава цялото настроение. */
  const windows = kitchenWindows(kitchen);
  if (windows.length) {
    const sides = [...new Set(windows.map((win) => win.side))];
    parts.push({
      bg: `дневна светлина от ${sides.map((s) => SIDE_BG[s]).join(' и ')}`,
      en: `daylight from a window in ${sides.map((s) => SIDE_EN[s]).join(' and ')}`,
    });
  } else {
    parts.push({ bg: 'без прозорец — мека обща светлина', en: 'soft even indoor lighting' });
  }

  /*
   * Колко врати и прозорци — с число, и „no windows", когато няма.
   * Без него моделът добавя прозорец, за да има откъде да влезе
   * светлината, и втора врата в празната стена.
   */
  const door = kitchenDoor(kitchen);
  const panes =
    windows.length === 0
      ? 'no windows'
      : `${countEn(windows.length)} window${windows.length === 1 ? '' : 's'} and no other windows`;
  parts.push({
    bg: `врата на ${SIDE_BG[door.side]}`,
    en: `exactly one door, in ${SIDE_EN[door.side]}, ${panes}`,
  });

  /*
   * Свободностоящата мебел — диван, маса, столове. Тя е в кадъра и
   * трябва да остане; неназована, моделът я мести или я сменя.
   */
  const furnishings = (kitchen.furnishings ?? []).map((f) => f.kind);
  if (furnishings.length) {
    const counts = new Map<FurnishingKind, number>();
    for (const k of furnishings) counts.set(k, (counts.get(k) ?? 0) + 1);
    parts.push({
      bg: `обзавеждане: ${[...counts]
        .map(([k, n]) => `${n > 1 ? `${n} × ` : ''}${FURNISHINGS[k].label.toLowerCase()}`)
        .join(', ')}`,
      en: `freestanding furniture, exactly: ${countedList(furnishings, FURNISHING_EN)}`,
    });
  }

  /*
   * Накрая — какво да е това като картина. Без него моделът избира сам
   * и връща ту снимка, ту рисунка, и шестте стаи изглеждат от шест
   * различни апартамента.
   *
   * Без „eye-level view" и „natural daylight": кадърът е отгоре, а стая
   * без прозорец няма откъде да има дневна светлина — и двете караха
   * модела да преначертае стаята. Без „uncluttered": дребната украса е
   * позволена (виж `instruction`).
   */
  const style =
    'photorealistic, high-end interior design photography, realistic materials, ' +
    'soft realistic shadows, no people, no text';

  return {
    promptEn: `${parts.map((p) => p.en).join(', ')}. ${style}.`,
    summaryBg: parts.map((p) => p.bg).join(' · '),
    parts,
  };
}

/** Имената на плотовете на български, по реда на каталога. */
const WORKTOPS_BG: Record<WorktopType, string> = {
  laminate38: 'ламиниран',
  quartz20: 'кварц',
  sintered12: 'синтерован камък',
  granite30: 'гранит',
};
