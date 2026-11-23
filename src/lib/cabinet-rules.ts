/**
 * cabinet-rules.ts — правилата за **кухня**: размерите, модулите и
 * формулите, по които се смята корпусната мебел на една стена.
 *
 * Общото за всяка корпусна система е извадено отделно:
 *   - `furniture/system.ts` — какво е система: редове, модули, нареждане;
 *   - `furniture/carcass.ts` — кутия, рафт, врати, панти, чекмеджета;
 *   - `furniture/parts.ts`  — номериране, обединяване, плочи и кант.
 *
 * Тук остава само това, което е кухня: височини, каталог на модулите,
 * плот, цокъл, аспиратор. Гардеробът (план 7.2) ще е втори файл до този,
 * а не преписване на същото.
 *
 * Чист TypeScript без UI. Всяка запазена конфигурация пази `RULES_VERSION`,
 * с която е сметната, за да може стара конфигурация да се прочете коректно.
 *
 * Стойностите, маркирани с `// ПРОВЕРИ`, са предположение и трябва да бъдат
 * потвърдени от мебелиста (каталог на механизми, панти, уреди).
 *
 * Всички размери са в милиметри, освен ако името не казва друго.
 */

import {
  type CarpentryDims,
  type DoorLayout,
  type DrawerGeometry,
  type DrawerSystem,
  type HingeSide,
  backPanel,
  betweenSidesBox,
  doorLayout as doorLayoutIn,
  drawerBoxParts as drawerBoxPartsIn,
  evenFronts,
  hingeCount,
  onBottomBox,
  shelf,
} from './furniture/carcass';
import {
  type EdgeUsage,
  type MaterialUsage,
  type MergedPart,
  type Part as GenericPart,
  type PartMaterial,
  type RawPart,
  type SheetMaterial,
  type SheetSpec,
  MATERIAL_LABEL,
  edgeUsage,
  facadeArea,
  materialUsage,
  mergeParts,
  mm,
  numberParts,
} from './furniture/parts';
import {
  type PlanWall,
  type Room,
  type WallSide,
  ROOM,
  WALL_SIDES,
  WALL_SIDE_LABEL,
  clampRoom,
  cornerClashes,
  freeSides,
  planGeometry,
  sideLength,
} from './furniture/room';
import {
  type FurnitureSystem,
  type Interval,
  type PlacedModule as GenericPlaced,
  type RowStatus,
  type OpeningKind,
  type SystemModule,
  type SystemModuleInstance,
  type WallOpening,
  clampLength,
  freeIntervals,
  geometryOf,
  moduleCounterpart,
  nearestWidth as nearestWidthIn,
  placeWall as placeWallIn,
  rowStatus,
  wallStatus as wallStatusIn,
} from './furniture/system';
import {
  DOOR,
  WINDOW,
  type RoomDoor,
  type RoomWindow,
  clampDoor,
  clampWindow,
  defaultDoor,
  defaultWindow,
  wallOpeningsOn,
} from './openings';

export {
  DOOR,
  WINDOW,
  clampDoor,
  clampWindow,
  defaultDoor,
  defaultWindow,
  type RoomDoor,
  type RoomWindow,
  MATERIAL_LABEL,
  ROOM,
  WALL_SIDES,
  WALL_SIDE_LABEL,
  clampRoom,
  cornerClashes,
  freeSides,
  hingeCount,
  mergeParts,
  mm,
  numberParts,
  rowStatus,
  sideLength,
  type OpeningKind,
  type PlanWall,
  type WallOpening,
  type Room,
  type WallSide,
  type DoorLayout,
  type DrawerSystem,
  type EdgeUsage,
  type HingeSide,
  type MaterialUsage,
  type MergedPart,
  type PartMaterial,
  type RawPart,
  type RowStatus,
  type SheetMaterial,
};

import type { Furnishing } from './furnishings';

/**
 * Версия на правилата.
 *
 * Вдига се при всяка промяна, която може да смени числата в разкроя
 * или подредбата. Запазената конфигурация носи версията, с която е
 * направена, и ако тя се разминава с днешната, това се казва на
 * човека — старите формули не се пазят и не могат да се пуснат
 * наново, затова мълчаливото преизчисляване би било лъжа.
 *
 * 1.0.0 — кухня, спалня, всекидневна; стая с до четири стени.
 * 1.1.0 — баня, коридор и антре; врата и прозорци на стаята; те
 *         режат реда, който пресичат, и местят шкафове.
 */
export const RULES_VERSION = '1.1.0';

/** Сметната ли е тази конфигурация по днешните правила. */
export function rulesAreCurrent(kitchen: { rulesVersion?: string }): boolean {
  return !kitchen.rulesVersion || kitchen.rulesVersion === RULES_VERSION;
}

/**
 * Какво да се каже, ако конфигурацията идва от по-стари правила.
 * `null`, когато няма какво да се каже.
 */
export function rulesNote(kitchen: { rulesVersion?: string }): string | null {
  if (rulesAreCurrent(kitchen)) return null;
  return (
    `Този проект е правен по правила ${kitchen.rulesVersion}, а днешните са ` +
    `${RULES_VERSION}. Показаното е пресметнато наново — размери и обков може ` +
    `да се различават от първоначалните.`
  );
}

/* ------------------------------------------------------------------ */
/* 1. Константи                                                        */
/* ------------------------------------------------------------------ */

export const DIM = {
  /** Дебелина на корпусната ПДЧ */
  T: 18,
  /** Дебелина на ПДЧ за кутии на чекмеджета */
  T_BOX: 16,
  /** Дебелина на HDF гръб */
  BACK: 3,
  /** Крака / цокъл */
  LEG: 100,

  /** Долен корпус */
  BASE_H: 720,
  BASE_D: 560,

  /** Горен корпус — долен ръб на 1410 от пода */
  UPPER_BOTTOM: 1410,
  UPPER_H: 720,
  UPPER_D: 320,

  /** Колона: корпус 2030 на крака 100 → горен ръб 2130 = 1410 + 720 */
  COLUMN_H: 2030,
  /** Светла ниша за хладилник в колоната */ // ПРОВЕРИ
  COLUMN_NICHE: 1780,

  /** Шкаф над аспиратор, подравнен отгоре */
  HOOD_H: 360,

  /** Номинална дължина на водачите */
  NL: 500,

  /** Плоча ПДЧ */
  SHEET_L: 2800,
  SHEET_W: 2070,
  /** Фира при разкрой */
  SHEET_WASTE: 0.15,

  /** Фуга фасада → край на модула, от всяка страна */
  GAP_EDGE: 2,
  /** Фуга между две фасади */
  GAP_BETWEEN: 3,

  /** Дълбочина на плота */
  WORKTOP_D: 600,

  /** Кант по видимия преден ръб на корпуса */
  EDGE_CORPUS: 0.8,
  /** Кант на ПДЧ декор фасади, по 4-те страни */
  EDGE_DECOR: 2,

  /** Светла ниша за фурна */ // ПРОВЕРИ
  OVEN_NICHE: 595,
  /** Бленда под фурната */ // ПРОВЕРИ
  OVEN_FILLER_H: 116,

  /* --- Спалня: гардероб ------------------------------------------
   * Всички стойности тук са работни и чакат каталога на мебелиста.
   */
  /** Корпус на гардероба върху крака 100 → горен ръб 2200 */ // ПРОВЕРИ
  WARDROBE_H: 2100,
  WARDROBE_D: 600,
  /** Антресол над гардероба: 2200 → 2600 */ // ПРОВЕРИ
  ATTIC_BOTTOM: 2200,
  ATTIC_H: 400,
  /** Височина на лоста над пода */ // ПРОВЕРИ
  ROD_HEIGHT: 1750,

  /* --- Всекидневна: ТВ композиция --------------------------------- */
  /** Нисък корпус на цокъл 60 */ // ПРОВЕРИ
  TV_LEG: 60,
  TV_H: 450,
  TV_D: 450,
  /** Висока библиотека, същия цокъл */ // ПРОВЕРИ
  BOOKCASE_H: 2100,
  BOOKCASE_D: 350,
  /** Стенен ред над ТВ композицията */ // ПРОВЕРИ
  WALL_UNIT_BOTTOM: 1250,
  WALL_UNIT_H: 350,
  WALL_UNIT_D: 300,

  /* --- Баня -------------------------------------------------------
   * Шкафът с мивка виси, за да се мие подът под него — така се прави
   * в жилища от последните двайсет години.
   */ // ПРОВЕРИ
  VANITY_BOTTOM: 350,
  VANITY_H: 550,
  VANITY_D: 460,
  /** Колона до тавана, плитка, за да не стеснява банята. */ // ПРОВЕРИ
  BATH_TALL_H: 1800,
  BATH_TALL_BOTTOM: 350,
  BATH_TALL_D: 350,
  /** Огледален шкаф над мивката. */ // ПРОВЕРИ
  BATH_UPPER_BOTTOM: 1300,
  BATH_UPPER_H: 700,
  BATH_UPPER_D: 170,
  /** Светла ниша за пералня. */ // ПРОВЕРИ
  WASHER_NICHE: 650,
  WASHER_H: 900,

  /* --- Коридор и антре --------------------------------------------
   * Плитки шкафове: в коридор всеки сантиметър навътре се усеща.
   */ // ПРОВЕРИ
  HALL_H: 2100,
  HALL_D: 350,
  /** Шкаф за обувки — нисък, с падащи чела. */ // ПРОВЕРИ
  SHOE_H: 1100,
  SHOE_D: 280,
  /** Антресол над шкафовете в коридора. */ // ПРОВЕРИ
  HALL_UPPER_BOTTOM: 2200,
  HALL_UPPER_H: 400,
  /** Пейка за събуване. */ // ПРОВЕРИ
  BENCH_H: 450,
  BENCH_D: 350,

  /** Стена: допустим диапазон и стъпка */
  WALL_MIN: 1200,
  WALL_MAX: 7000,
  WALL_STEP: 10,
} as const;

/**
 * Колко рафта стои в един модул.
 *
 * Един източник: по него се режат детайлите и по него обемният изглед
 * ги рисува вътре, когато вратата се отвори. Тест държи двете заедно.
 */ // ПРОВЕРИ за спалнята и всекидневната
export const SHELVES: Record<ModuleKind, number> = {
  column: 1,
  door: 1,
  drawers: 0,
  sink: 0,
  oven: 1,
  dw: 0,
  lgap: 0,
  upper: 1,
  hood: 0,
  ugap: 0,
  wardrobe: 1,
  'wardrobe-shelves': 4,
  'wardrobe-drawers': 0,
  'wardrobe-open': 5,
  attic: 0,
  wgap: 0,
  tv: 0,
  lowboard: 1,
  bookcase: 5,
  wallbox: 1,
  wallshelf: 1,
  vgap: 0,
  vanity: 1,
  'bath-tall': 4,
  'bath-drawers': 0,
  washer: 0,
  'bath-mirror': 2,
  'bath-shelf': 2,
  bgap: 0,
  'hall-wardrobe': 1,
  shoe: 3,
  'hall-open': 1,
  bench: 0,
  'hall-attic': 0,
  hgap: 0,
};

/**
 * Може ли в този модул да влезе рафт. В шкаф с чекмеджета и в панел на
 * уред няма къде — правилото стои тук, а не в интерфейса, за да не
 * може и стара конфигурация да поиска невъзможното.
 */
export function acceptsShelves(kind: ModuleKind): boolean {
  const style = MODULES[kind].facade?.style;
  if (!MODULES[kind].hasCarcass) return false;
  return style === 'doors' || style === 'split' || style === 'open' || style === 'panel';
}

/**
 * Има ли какво да се отвори при този модул. Отворена секция, рафт и
 * ниша нямат лице и клик по тях не бива да обещава нищо.
 */
export function canOpen(kind: ModuleKind): boolean {
  const style = MODULES[kind].facade?.style;
  return style === 'doors' || style === 'drawers' || style === 'split' || style === 'panel';
}

/** Колко рафта стоят в модула — неговият собствен брой или този на вида. */
export function shelfCount(m: { kind: ModuleKind; shelves?: number }): number {
  if (!acceptsShelves(m.kind)) return SHELVES[m.kind];
  return Math.max(0, Math.min(10, m.shelves ?? SHELVES[m.kind]));
}

/** Височини на челата на чекмеджетата, отгоре надолу */
export const DRAWER_FRONT_H = [140, 285, 285] as const;
/** Гръб на кутията при метален борд, отгоре надолу */ // ПРОВЕРИ
export const DRAWER_BACK_H = [84, 167, 167] as const;
/** Височина на кутията при сферични водачи, отгоре надолу */ // ПРОВЕРИ
export const DRAWER_BOX_H = [90, 200, 200] as const;

/** Дебелините и кантовете, с които се реже кухнята. */
const CARPENTRY: CarpentryDims = {
  T: DIM.T,
  BACK: DIM.BACK,
  EDGE_CORPUS: DIM.EDGE_CORPUS,
};

const DRAWERS: DrawerGeometry = {
  nominalLength: DIM.NL,
  backHeights: DRAWER_BACK_H,
  boxHeights: DRAWER_BOX_H,
};

const SHEET: SheetSpec = {
  length: DIM.SHEET_L,
  width: DIM.SHEET_W,
  waste: DIM.SHEET_WASTE,
};

const DOOR_GAPS = {
  edge: DIM.GAP_EDGE,
  between: DIM.GAP_BETWEEN,
  /** До 600 мм модулът е с една врата, над това — с две. */
  maxSingle: 600,
};

/* ------------------------------------------------------------------ */
/* 2. Кухнята като система                                             */
/* ------------------------------------------------------------------ */

/**
 * Всички видове модули на трите стаи. Видовете са уникални през
 * системите, затова геометрията, лицата и детайлите се намират само по
 * вида — без да се носи системата навсякъде.
 */
export type ModuleKind =
  // Кухня
  | 'column'
  | 'door'
  | 'drawers'
  | 'sink'
  | 'oven'
  | 'dw'
  | 'lgap'
  | 'upper'
  | 'hood'
  | 'ugap'
  // Спалня — гардероб
  | 'wardrobe'
  | 'wardrobe-shelves'
  | 'wardrobe-drawers'
  | 'wardrobe-open'
  | 'attic'
  | 'wgap'
  // Всекидневна — ТВ композиция и библиотека
  | 'tv'
  | 'lowboard'
  | 'bookcase'
  | 'wallbox'
  | 'wallshelf'
  | 'vgap'
  // Баня
  | 'vanity'
  | 'bath-tall'
  | 'bath-drawers'
  | 'washer'
  | 'bath-mirror'
  | 'bath-shelf'
  | 'bgap'
  // Коридор и антре
  | 'hall-wardrobe'
  | 'shoe'
  | 'hall-open'
  | 'bench'
  | 'hall-attic'
  | 'hgap';

export type RowId = 'base' | 'upper';

export type ModuleSpec = SystemModule<ModuleKind, RowId>;

export const MODULES: Record<ModuleKind, ModuleSpec> = {
  column: {
    kind: 'column',
    row: 'base',
    label: 'Колона за хладилник',
    code: 'К',
    widths: [600],
    hasCarcass: true,
    fullHeight: true,
    geometry: { y: DIM.LEG, height: DIM.COLUMN_H, depth: DIM.BASE_D },
    // Малката врата е над нишата за хладилника.
    facade: { style: 'split', heights: [209, 1814] },
  },
  door: {
    kind: 'door',
    row: 'base',
    label: 'Долен с врата',
    code: 'Д',
    widths: [300, 400, 450, 500, 600, 800, 900],
    hasCarcass: true,
    facade: { style: 'doors' },
  },
  drawers: {
    kind: 'drawers',
    row: 'base',
    label: 'Долен с 3 чекмеджета',
    code: 'Д',
    widths: [400, 450, 500, 600, 800, 900],
    hasCarcass: true,
    facade: { style: 'drawers', fronts: DRAWER_FRONT_H },
  },
  sink: {
    kind: 'sink',
    row: 'base',
    label: 'Шкаф за мивка',
    code: 'Д',
    widths: [600, 800, 900],
    hasCarcass: true,
    facade: { style: 'doors' },
  },
  oven: {
    kind: 'oven',
    row: 'base',
    label: 'Шкаф за фурна',
    code: 'Д',
    widths: [600],
    hasCarcass: true,
    facade: { style: 'appliance', fillerBelow: DIM.OVEN_FILLER_H },
  },
  dw: {
    kind: 'dw',
    row: 'base',
    label: 'Панел за вградена съдомиялна',
    code: 'Д',
    widths: [450, 600],
    hasCarcass: false,
    facade: { style: 'panel', appliance: true },
  },
  lgap: {
    kind: 'lgap',
    row: 'base',
    label: 'Свободна ниша',
    code: null,
    widths: [300, 450, 600, 900],
    hasCarcass: false,
    gap: true,
  },
  upper: {
    kind: 'upper',
    row: 'upper',
    label: 'Горен шкаф',
    code: 'Г',
    widths: [300, 400, 450, 500, 600, 800, 900],
    hasCarcass: true,
    facade: { style: 'doors' },
  },
  hood: {
    kind: 'hood',
    row: 'upper',
    label: 'Горен над аспиратор',
    code: 'Г',
    widths: [600, 900],
    hasCarcass: true,
    facade: { style: 'panel' },
    geometry: {
      y: DIM.UPPER_BOTTOM + DIM.UPPER_H - DIM.HOOD_H,
      height: DIM.HOOD_H,
      depth: DIM.UPPER_D,
    },
  },
  ugap: {
    kind: 'ugap',
    row: 'upper',
    label: 'Празно (прозорец)',
    code: null,
    widths: [300, 400, 600, 800, 1000, 1200],
    hasCarcass: false,
    gap: true,
  },

  /* --- Спалня ------------------------------------------------------
   * Ширините и височините са работни, докато мебелистът не даде своите.
   */ // ПРОВЕРИ
  wardrobe: {
    kind: 'wardrobe',
    row: 'base',
    label: 'Гардероб с лост',
    code: 'Г',
    widths: [400, 450, 500, 600, 800, 900],
    hasCarcass: true,
    geometry: { y: DIM.LEG, height: DIM.WARDROBE_H, depth: DIM.WARDROBE_D },
    facade: { style: 'doors' },
  },
  'wardrobe-shelves': {
    kind: 'wardrobe-shelves',
    row: 'base',
    label: 'Гардероб с рафтове',
    code: 'Г',
    widths: [400, 450, 500, 600, 800, 900],
    hasCarcass: true,
    geometry: { y: DIM.LEG, height: DIM.WARDROBE_H, depth: DIM.WARDROBE_D },
    facade: { style: 'doors' },
  },
  'wardrobe-drawers': {
    kind: 'wardrobe-drawers',
    row: 'base',
    label: 'Скрин с чекмеджета',
    code: 'С',
    widths: [450, 500, 600, 800, 900],
    hasCarcass: true,
    geometry: { y: DIM.LEG, height: DIM.WARDROBE_H, depth: DIM.WARDROBE_D },
    facade: { style: 'drawers', count: 5 },
  },
  'wardrobe-open': {
    kind: 'wardrobe-open',
    row: 'base',
    label: 'Отворена секция',
    code: 'О',
    widths: [400, 500, 600, 800],
    hasCarcass: true,
    geometry: { y: DIM.LEG, height: DIM.WARDROBE_H, depth: DIM.WARDROBE_D },
    facade: { style: 'open', shelves: 5 },
  },
  attic: {
    kind: 'attic',
    row: 'upper',
    label: 'Антресол',
    code: 'А',
    widths: [400, 450, 500, 600, 800, 900],
    hasCarcass: true,
    geometry: { y: DIM.ATTIC_BOTTOM, height: DIM.ATTIC_H, depth: DIM.WARDROBE_D },
    facade: { style: 'doors' },
  },
  wgap: {
    kind: 'wgap',
    row: 'base',
    label: 'Свободно място',
    code: null,
    widths: [300, 450, 600, 900],
    hasCarcass: false,
    gap: true,
    geometry: { y: DIM.LEG, height: DIM.WARDROBE_H, depth: DIM.WARDROBE_D },
  },

  /* --- Всекидневна -------------------------------------------------- */ // ПРОВЕРИ
  tv: {
    kind: 'tv',
    row: 'base',
    label: 'ТВ шкаф с чекмеджета',
    code: 'Т',
    widths: [600, 800, 900, 1000, 1200],
    hasCarcass: true,
    geometry: { y: DIM.TV_LEG, height: DIM.TV_H, depth: DIM.TV_D },
    facade: { style: 'drawers', count: 2 },
  },
  lowboard: {
    kind: 'lowboard',
    row: 'base',
    label: 'Нисък шкаф с врата',
    code: 'Н',
    widths: [400, 500, 600, 800, 900],
    hasCarcass: true,
    geometry: { y: DIM.TV_LEG, height: DIM.TV_H, depth: DIM.TV_D },
    facade: { style: 'doors' },
  },
  bookcase: {
    kind: 'bookcase',
    row: 'base',
    label: 'Библиотека',
    code: 'Б',
    widths: [400, 500, 600, 800],
    hasCarcass: true,
    fullHeight: true,
    geometry: { y: DIM.TV_LEG, height: DIM.BOOKCASE_H, depth: DIM.BOOKCASE_D },
    facade: { style: 'open', shelves: 5 },
  },
  wallbox: {
    kind: 'wallbox',
    row: 'upper',
    label: 'Стенен шкаф',
    code: 'В',
    widths: [400, 500, 600, 800],
    hasCarcass: true,
    geometry: { y: DIM.WALL_UNIT_BOTTOM, height: DIM.WALL_UNIT_H, depth: DIM.WALL_UNIT_D },
    facade: { style: 'doors' },
  },
  wallshelf: {
    kind: 'wallshelf',
    row: 'upper',
    label: 'Стенен рафт',
    code: 'Р',
    widths: [600, 800, 900, 1200],
    hasCarcass: true,
    geometry: { y: DIM.WALL_UNIT_BOTTOM, height: DIM.WALL_UNIT_H, depth: DIM.WALL_UNIT_D },
    facade: { style: 'open', shelves: 1 },
  },
  vgap: {
    kind: 'vgap',
    row: 'base',
    label: 'Свободно място',
    code: null,
    widths: [300, 450, 600, 900],
    hasCarcass: false,
    gap: true,
    geometry: { y: DIM.TV_LEG, height: DIM.TV_H, depth: DIM.TV_D },
  },

  /* --- Баня ---------------------------------------------------------
   * Висящи шкафове: подът под тях се мие, а банята изглежда по-голяма.
   */ // ПРОВЕРИ
  vanity: {
    kind: 'vanity',
    row: 'base',
    label: 'Шкаф с мивка',
    code: 'М',
    widths: [450, 500, 600, 700, 800, 900, 1000],
    hasCarcass: true,
    geometry: { y: DIM.VANITY_BOTTOM, height: DIM.VANITY_H, depth: DIM.VANITY_D },
    facade: { style: 'drawers', count: 2 },
  },
  'bath-drawers': {
    kind: 'bath-drawers',
    row: 'base',
    label: 'Шкаф с чекмеджета',
    code: 'Ч',
    widths: [300, 400, 450, 500, 600],
    hasCarcass: true,
    geometry: { y: DIM.VANITY_BOTTOM, height: DIM.VANITY_H, depth: DIM.VANITY_D },
    facade: { style: 'drawers', count: 2 },
  },
  'bath-tall': {
    kind: 'bath-tall',
    row: 'base',
    label: 'Колона за баня',
    code: 'К',
    widths: [300, 350, 400, 450],
    hasCarcass: true,
    fullHeight: true,
    geometry: { y: DIM.BATH_TALL_BOTTOM, height: DIM.BATH_TALL_H, depth: DIM.BATH_TALL_D },
    facade: { style: 'doors' },
  },
  washer: {
    kind: 'washer',
    row: 'base',
    label: 'Ниша за пералня',
    code: null,
    widths: [DIM.WASHER_NICHE, 700],
    hasCarcass: false,
    geometry: { y: 0, height: DIM.WASHER_H, depth: DIM.VANITY_D },
  },
  bgap: {
    kind: 'bgap',
    row: 'base',
    label: 'Свободно място',
    code: null,
    widths: [200, 300, 450, 600],
    hasCarcass: false,
    gap: true,
    geometry: { y: DIM.VANITY_BOTTOM, height: DIM.VANITY_H, depth: DIM.VANITY_D },
  },
  'bath-mirror': {
    kind: 'bath-mirror',
    row: 'upper',
    label: 'Огледален шкаф',
    code: 'О',
    widths: [450, 500, 600, 700, 800, 900],
    hasCarcass: true,
    geometry: { y: DIM.BATH_UPPER_BOTTOM, height: DIM.BATH_UPPER_H, depth: DIM.BATH_UPPER_D },
    facade: { style: 'doors' },
  },
  'bath-shelf': {
    kind: 'bath-shelf',
    row: 'upper',
    label: 'Отворен рафт',
    code: 'Р',
    widths: [300, 400, 500, 600],
    hasCarcass: true,
    geometry: { y: DIM.BATH_UPPER_BOTTOM, height: DIM.BATH_UPPER_H, depth: DIM.BATH_UPPER_D },
    facade: { style: 'open', shelves: 2 },
  },

  /* --- Коридор и антре ----------------------------------------------
   * Плитко: в коридор всеки сантиметър навътре се усеща с рамото.
   */ // ПРОВЕРИ
  'hall-wardrobe': {
    kind: 'hall-wardrobe',
    row: 'base',
    label: 'Шкаф за връхни дрехи',
    code: 'Г',
    widths: [400, 450, 500, 600, 800],
    hasCarcass: true,
    geometry: { y: DIM.LEG, height: DIM.HALL_H, depth: DIM.HALL_D },
    facade: { style: 'doors' },
  },
  shoe: {
    kind: 'shoe',
    row: 'base',
    label: 'Шкаф за обувки',
    code: 'О',
    widths: [400, 500, 600, 800, 900],
    hasCarcass: true,
    geometry: { y: DIM.LEG, height: DIM.SHOE_H, depth: DIM.SHOE_D },
    facade: { style: 'drawers', count: 3 },
  },
  'hall-open': {
    kind: 'hall-open',
    row: 'base',
    label: 'Закачалка с рафт',
    code: 'З',
    widths: [400, 500, 600, 800, 900],
    hasCarcass: true,
    geometry: { y: DIM.LEG, height: DIM.HALL_H, depth: DIM.HALL_D },
    facade: { style: 'open', shelves: 1 },
  },
  bench: {
    kind: 'bench',
    row: 'base',
    label: 'Пейка за събуване',
    code: 'П',
    widths: [600, 800, 900, 1000],
    hasCarcass: true,
    geometry: { y: DIM.LEG, height: DIM.BENCH_H, depth: DIM.BENCH_D },
    facade: { style: 'open', shelves: 1 },
  },
  hgap: {
    kind: 'hgap',
    row: 'base',
    label: 'Свободно място',
    code: null,
    widths: [200, 300, 450, 600, 900],
    hasCarcass: false,
    gap: true,
    geometry: { y: DIM.LEG, height: DIM.HALL_H, depth: DIM.HALL_D },
  },
  'hall-attic': {
    kind: 'hall-attic',
    row: 'upper',
    label: 'Антресол',
    code: 'А',
    widths: [400, 450, 500, 600, 800],
    hasCarcass: true,
    geometry: { y: DIM.HALL_UPPER_BOTTOM, height: DIM.HALL_UPPER_H, depth: DIM.HALL_D },
    facade: { style: 'doors' },
  },
};

/**
 * В какво се превръща модулът, ако се премести в другия ред.
 * Липсващите остават в своя ред: мивката, фурната и съдомиялнята са
 * вързани за ВиК, уреда и плота, аспираторът — за комина, а колоната
 * заема и двата реда.
 */
export const ROW_COUNTERPART: Partial<Record<ModuleKind, ModuleKind>> = {
  door: 'upper',
  drawers: 'upper',
  lgap: 'ugap',
  upper: 'door',
  ugap: 'lgap',
};

/** Кухнята: два реда на една стена, долният носи плота и цокъла. */
export const KITCHEN: FurnitureSystem<ModuleKind, RowId> = {
  id: 'kitchen',
  label: 'Кухня',
  rowOrder: ['base', 'upper'],
  rows: {
    base: { label: 'Долен ред', bottom: DIM.LEG, height: DIM.BASE_H, depth: DIM.BASE_D },
    upper: {
      label: 'Горен ред',
      bottom: DIM.UPPER_BOTTOM,
      height: DIM.UPPER_H,
      depth: DIM.UPPER_D,
    },
  },
  modules: MODULES,
  counterpart: ROW_COUNTERPART,
  wall: { min: DIM.WALL_MIN, max: DIM.WALL_MAX, step: DIM.WALL_STEP },
};

/** Спалнята: гардероб по стената, антресол над него. */
export const WARDROBE: FurnitureSystem<ModuleKind, RowId> = {
  id: 'wardrobe',
  label: 'Гардероб',
  rowOrder: ['base', 'upper'],
  rows: {
    base: { label: 'Гардероб', bottom: DIM.LEG, height: DIM.WARDROBE_H, depth: DIM.WARDROBE_D },
    upper: {
      label: 'Антресол',
      bottom: DIM.ATTIC_BOTTOM,
      height: DIM.ATTIC_H,
      depth: DIM.WARDROBE_D,
    },
  },
  modules: MODULES,
  // Гардеробът и антресолът са с различна височина и не си разменят места.
  counterpart: {},
  wall: { min: DIM.WALL_MIN, max: DIM.WALL_MAX, step: DIM.WALL_STEP },
};

/** Всекидневната: ниска ТВ композиция, библиотека и стенен ред. */
export const LIVING: FurnitureSystem<ModuleKind, RowId> = {
  id: 'living',
  label: 'Всекидневна',
  rowOrder: ['base', 'upper'],
  rows: {
    base: { label: 'Долен ред', bottom: DIM.TV_LEG, height: DIM.TV_H, depth: DIM.TV_D },
    upper: {
      label: 'Стенен ред',
      bottom: DIM.WALL_UNIT_BOTTOM,
      height: DIM.WALL_UNIT_H,
      depth: DIM.WALL_UNIT_D,
    },
  },
  modules: MODULES,
  counterpart: { lowboard: 'wallbox', wallbox: 'lowboard' },
  wall: { min: DIM.WALL_MIN, max: DIM.WALL_MAX, step: DIM.WALL_STEP },
};

/** Банята: висящи шкафове долу, огледален шкаф горе. */
export const BATH: FurnitureSystem<ModuleKind, RowId> = {
  id: 'bath',
  label: 'Баня',
  rowOrder: ['base', 'upper'],
  rows: {
    base: {
      label: 'Долен ред',
      bottom: DIM.VANITY_BOTTOM,
      height: DIM.VANITY_H,
      depth: DIM.VANITY_D,
    },
    upper: {
      label: 'Над мивката',
      bottom: DIM.BATH_UPPER_BOTTOM,
      height: DIM.BATH_UPPER_H,
      depth: DIM.BATH_UPPER_D,
    },
  },
  modules: MODULES,
  counterpart: {},
  wall: { min: DIM.WALL_MIN, max: DIM.WALL_MAX, step: DIM.WALL_STEP },
};

/** Коридорът и антрето: плитки шкафове и антресол над тях. */
export const HALL: FurnitureSystem<ModuleKind, RowId> = {
  id: 'hall',
  label: 'Коридор',
  rowOrder: ['base', 'upper'],
  rows: {
    base: { label: 'Шкафове', bottom: DIM.LEG, height: DIM.HALL_H, depth: DIM.HALL_D },
    upper: {
      label: 'Антресол',
      bottom: DIM.HALL_UPPER_BOTTOM,
      height: DIM.HALL_UPPER_H,
      depth: DIM.HALL_D,
    },
  },
  modules: MODULES,
  counterpart: {},
  wall: { min: DIM.WALL_MIN, max: DIM.WALL_MAX, step: DIM.WALL_STEP },
};

/** Коя стая обзавеждаме. Конфигурацията носи това, не самата система. */
export type RoomKind = 'kitchen' | 'bedroom' | 'living' | 'bath' | 'corridor' | 'hall';

/** Всички видове стаи, в реда за показване. */
export const ROOM_KINDS: readonly RoomKind[] = [
  'kitchen',
  'bedroom',
  'living',
  'bath',
  'corridor',
  'hall',
];

export const ROOM_KIND_LABEL: Record<RoomKind, string> = {
  kitchen: 'Кухня',
  bedroom: 'Спалня',
  living: 'Всекидневна',
  bath: 'Баня',
  corridor: 'Коридор',
  hall: 'Антре',
};

/*
 * Коридорът и антрето се обзавеждат с едно и също: шкаф за връхни
 * дрехи, шкаф за обувки, закачалка, антресол. Разликата е в името,
 * което човекът им дава, не в мебелта — затова делят една система.
 */
const SYSTEMS: Record<RoomKind, FurnitureSystem<ModuleKind, RowId>> = {
  kitchen: KITCHEN,
  bedroom: WARDROBE,
  living: LIVING,
  bath: BATH,
  corridor: HALL,
  hall: HALL,
};

export function systemFor(room: RoomKind = 'kitchen'): FurnitureSystem<ModuleKind, RowId> {
  return SYSTEMS[room] ?? KITCHEN;
}

/**
 * Празнина ли е този модул — чист въздух между шкафовете.
 *
 * Чете се от белега в каталога, не се извежда. Първият опит беше
 * „няма корпус и няма чело" и хващаше нишата за пералня: тя също няма
 * нито едното, но е място за уред, не въздух.
 */
export function isGap(kind: ModuleKind): boolean {
  return MODULES[kind].gap === true;
}

/** Кои модули се предлагат в тази стая, в реда за показване. */
const ROOM_MODULES: Record<RoomKind, Record<RowId, ModuleKind[]>> = {
  kitchen: {
    base: ['column', 'door', 'drawers', 'sink', 'oven', 'dw', 'lgap'],
    upper: ['upper', 'hood', 'ugap'],
  },
  bedroom: {
    base: ['wardrobe', 'wardrobe-shelves', 'wardrobe-drawers', 'wardrobe-open', 'wgap'],
    upper: ['attic'],
  },
  living: {
    base: ['tv', 'lowboard', 'bookcase', 'vgap'],
    upper: ['wallbox', 'wallshelf'],
  },
  bath: {
    base: ['vanity', 'bath-drawers', 'bath-tall', 'washer', 'bgap'],
    upper: ['bath-mirror', 'bath-shelf'],
  },
  corridor: {
    base: ['hall-wardrobe', 'shoe', 'hall-open', 'bench', 'hgap'],
    upper: ['hall-attic'],
  },
  hall: {
    base: ['hall-wardrobe', 'shoe', 'hall-open', 'bench', 'hgap'],
    upper: ['hall-attic'],
  },
};

export function modulesFor(room: RoomKind, row: RowId): ModuleKind[] {
  return ROOM_MODULES[room][row];
}

/**
 * С какво се запълва празно място в този ред.
 *
 * Не всеки ред има с какво: над гардероба стои само антресол и празно
 * място там не е изделие, а просто въздух. Тогава се връща `null` и
 * който пита, трябва да се откаже, вместо да измисля.
 */
export function gapKindFor(room: RoomKind, row: RowId): ModuleKind | null {
  return modulesFor(room, row).find(isGap) ?? null;
}

/* --- Материали ---------------------------------------------------- */

export type FacadeType = 'mdf-painted' | 'mdf-milled' | 'pdch-decor';
export type WorktopType = 'laminate38' | 'quartz20' | 'sintered12' | 'granite30';
export type OpeningType = 'handles' | 'push' | 'alu-profile';

export const WORKTOP_THICKNESS: Record<WorktopType, number> = {
  laminate38: 38,
  quartz20: 20,
  sintered12: 12,
  granite30: 30,
};

export const WORKTOP_LABEL: Record<WorktopType, string> = {
  laminate38: 'Ламиниран 38 мм',
  quartz20: 'Кварц 20 мм',
  sintered12: 'Синтерован 12 мм',
  granite30: 'Гранит 30 мм',
};

export const FACADE_LABEL: Record<FacadeType, string> = {
  'mdf-painted': 'МДФ боядисан',
  'mdf-milled': 'МДФ фрезован',
  'pdch-decor': 'ПДЧ декор',
};

export const OPENING_LABEL: Record<OpeningType, string> = {
  handles: 'Дръжки',
  push: 'Push-to-open',
  'alu-profile': 'Алуминиев профил',
};

export const DRAWER_SYSTEM_LABEL: Record<DrawerSystem, string> = {
  'metal-box': 'метален борд',
  'ball-bearing': 'сферични водачи',
};

export interface Materials {
  /** Цвят / декор на корпуса */
  carcassColor: string;
  facade: { type: FacadeType; color: string };
  worktop: WorktopType;
  opening: OpeningType;
  drawers: DrawerSystem;
}

export const DEFAULT_MATERIALS: Materials = {
  carcassColor: 'Бял',
  facade: { type: 'mdf-painted', color: 'RAL 9010 чисто бяло' },
  worktop: 'laminate38',
  opening: 'handles',
  drawers: 'metal-box',
};

/* --- Конфигурация ------------------------------------------------- */

export type KitchenModule = SystemModuleInstance<ModuleKind>;

export interface Wall {
  /**
   * Коя страна на стаята е. По-старите конфигурации нямат страна —
   * четат се като една стена отгоре (виж `wallSide`).
   */
  side?: WallSide;
  /** Собствен идентификатор. Липсва в конфигурациите отпреди стаите. */
  id?: string;
  /** Дължината на участъка, по който се нарежда. */
  length: number;
  base: KitchenModule[];
  upper: KitchenModule[];
  /** Врати и прозорци в стената. Мебелта ги заобикаля. */
  openings?: WallOpening[];
}

/** Стандартни отвори, докато не се измери на място. */ // ПРОВЕРИ
export const OPENING_DEFAULT: Record<OpeningKind, { width: number; bottom: number; height: number }> =
  {
    door: { width: 900, bottom: 0, height: 2000 },
    window: { width: 1200, bottom: 900, height: 1400 },
  };

export const OPENING_KIND_LABEL: Record<OpeningKind, string> = {
  door: 'Врата',
  window: 'Прозорец',
};

export const OPENING_LIMITS = {
  minWidth: 300,
  minHeight: 300,
  /** Над тавана няма смисъл — чертежът свършва там. */
  maxHeight: 2320,
} as const;

/** Вкарва отвора в стената: размерите са в граници, а той е вътре в нея. */
export function clampOpening(o: WallOpening, wallLength: number): WallOpening {
  const width = Math.max(OPENING_LIMITS.minWidth, Math.min(o.width, wallLength));
  const height = Math.max(OPENING_LIMITS.minHeight, Math.min(o.height, OPENING_LIMITS.maxHeight));
  const bottom = Math.max(0, Math.min(o.bottom, OPENING_LIMITS.maxHeight - height));
  return {
    ...o,
    width,
    height,
    bottom,
    x: Math.max(0, Math.min(o.x, wallLength - width)),
  };
}

export interface Kitchen {
  /**
   * Коя стая обзавеждаме. Липсва в конфигурациите отпреди спалнята и
   * всекидневната — тогава е кухня.
   */
  roomKind?: RoomKind;
  /**
   * Стаята, в която стои мебелта. Липсва в конфигурациите отпреди
   * плана — тогава се чете като стая по мярката на стените.
   */
  room?: Room;
  walls: Wall[];
  /**
   * Къде се влиза в стаята. Липсва в конфигурациите отпреди вратата —
   * тогава стаята се чете като затворена и мебелта не е ограничавана
   * от нищо. Новите проекти винаги я носят.
   */
  door?: RoomDoor;
  /**
   * Прозорците в стаята. Липсват в конфигурациите отпреди тях — тогава
   * стаята се чете без прозорци.
   */
  windows?: RoomWindow[];
  materials: Materials;
  /**
   * Готовите изделия в стаята — маси, столове, диван, легло. Стоят
   * само в картината: не се режат, не се номерират и не влизат нито в
   * разбивката, нито в заявката за цеха.
   */
  furnishings?: Furnishing[];
  rulesVersion: string;
}

/** Страната на стената, със стойност по подразбиране за старите конфигурации. */
export function wallSide(wall: Wall, index = 0): WallSide {
  return wall.side ?? WALL_SIDES[index % WALL_SIDES.length];
}

/** Разтяга стаята, докато стените се съберат в нея. */
function growToFit(room: Room, walls: Wall[]): Room {
  let width = room.width;
  let depth = room.depth;
  walls.forEach((wall, i) => {
    const side = wallSide(wall, i);
    if (side === 'top' || side === 'bottom') width = Math.max(width, wall.length);
    else depth = Math.max(depth, wall.length);
  });
  return { width: clampRoom(width), depth: clampRoom(depth) };
}

/**
 * Стая, в която подадените стени се събират. Ползва се за
 * конфигурации отпреди плана — те нямат записана стая.
 */
export function roomForWalls(walls: Wall[]): Room {
  return growToFit(ROOM_DEFAULT, walls);
}

/**
 * Стаята на конфигурацията, записана или сглобена по стените.
 *
 * Записаната също се разтяга: стая не може да е по-малка от стената,
 * която носи. Иначе шест метра кухня в двуметрова стая минава през
 * зида — в плана, в обемния изглед и в чертежа наведнъж.
 */
export function kitchenRoom(kitchen: Kitchen): Room {
  return kitchen.room ? growToFit(kitchen.room, kitchen.walls) : roomForWalls(kitchen.walls);
}

/**
 * Вратата на стаята, вкарана в размерите ѝ.
 *
 * Всяка стая има врата — няма стая, в която не се влиза. Проект отпреди
 * вратата не носи такава и получава подразбиращата се: срещу мебелта,
 * до ъгъла. Човекът я мести оттам нататък.
 */
export function kitchenDoor(kitchen: Kitchen): RoomDoor {
  const room = kitchenRoom(kitchen);
  if (kitchen.door) return clampDoor(room, kitchen.door);

  /*
   * Подразбиращата се врата избягва всяка стена, по която вече стои
   * мебел. Иначе стар проект с две пълни стени получава отвор насред
   * едната и шкафовете ѝ се разместват, без да е пипан.
   */
  const busy = kitchen.walls
    .filter((wall) => wall.base.length > 0 || wall.upper.length > 0)
    .map((wall, i) => wallSide(wall, i));

  return clampDoor(room, defaultDoor(room, wallSide(kitchen.walls[0]), busy));
}

/**
 * Прозорците на стаята, вкарани в размерите ѝ.
 *
 * Стара конфигурация може да носи прозорци по стария начин — закачени
 * за стената с мебелта. Те се четат тук и стават прозорци на стаята,
 * за да има едно място, на което се поставят.
 */
export function kitchenWindows(kitchen: Kitchen): RoomWindow[] {
  const room = kitchenRoom(kitchen);
  if (kitchen.windows) return kitchen.windows.map((w) => clampWindow(room, w));

  return kitchen.walls.flatMap((wall, i) =>
    (wall.openings ?? [])
      .filter((o) => o.kind === 'window')
      .map((o) =>
        clampWindow(room, {
          id: o.id,
          side: wallSide(wall, i),
          x: o.x,
          width: o.width,
          sill: o.bottom,
          height: o.height,
        }),
      ),
  );
}

/**
 * Какво има в тази стена: вратата, ако е на нея, плюс прозорците по нея.
 *
 * Стари конфигурации носят отворите закачени за самата стена, а не за
 * стаята. Те се добавят такива, каквито са — иначе мебел, нареждана да
 * ги заобикаля, изведнъж минава през тях.
 */
export function kitchenWallOpenings(kitchen: Kitchen, side: WallSide): WallOpening[] {
  const ofRoom = wallOpeningsOn(kitchenDoor(kitchen), kitchenWindows(kitchen), side);
  const known = new Set(ofRoom.map((o) => o.id));
  const legacy = kitchen.walls
    .filter((wall, i) => wallSide(wall, i) === side)
    .flatMap((wall) => wall.openings ?? [])
    .filter((o) => !known.has(o.id));
  return [...ofRoom, ...legacy].sort((a, b) => a.x - b.x);
}

/** Стая по подразбиране: средно голяма кухня-трапезария. */ // ПРОВЕРИ
export const ROOM_DEFAULT: Room = { width: 4200, depth: 3200 };

/** Редовете на стената във вида, който системата разбира. */
function rowsOf(wall: Wall): Record<RowId, KitchenModule[]> {
  return { base: wall.base, upper: wall.upper };
}

/** Най-близката допустима ширина за даден модул. */
export function nearestWidth(kind: ModuleKind, width: number): number {
  return nearestWidthIn(KITCHEN, kind, width);
}

/** Модулът, преместен в другия ред, или null, ако не може. */
export function toOtherRow(m: KitchenModule): KitchenModule | null {
  return moduleCounterpart(KITCHEN, m);
}

/** Дължина на стената в допустимия диапазон, закръглена на стъпката. */
export function clampWallLength(value: number): number {
  return clampLength(KITCHEN, value);
}

export function emptyKitchen(length = 3600): Kitchen {
  return {
    room: { ...ROOM_DEFAULT },
    walls: [{ id: 'wall-1', side: 'top', length, base: [], upper: [] }],
    materials: { ...DEFAULT_MATERIALS },
    rulesVersion: RULES_VERSION,
  };
}

/**
 * Празна стая с дадени размери — такава, каквато се отваря от чертежа
 * на жилището.
 *
 * Няма нито един модул: човекът ги вкарва сам от палитрата. Мебелта
 * върви по дългата стена, защото там се събира най-много, а вратата
 * идва по подразбиране — няма стая, в която не се влиза.
 */
export function emptyRoom(kind: RoomKind, width: number, depth: number): Kitchen {
  const room = { width: clampRoom(width), depth: clampRoom(depth) };

  /*
   * Мебелта върви по дългата стена. В стая, по-дълбока отколкото
   * широка, това е страничната — не горната. Сложи ли се дължината на
   * горната, стената излиза по-дълга от страната си и правилата
   * надуват стаята, за да я поберат.
   */
  const side: WallSide = room.depth > room.width ? 'left' : 'top';

  return {
    roomKind: kind,
    room,
    door: defaultDoor(room, side),
    windows: [],
    walls: [
      {
        id: 'room-wall-1',
        side,
        length: clampWallLength(sideLength(room, side)),
        base: [],
        upper: [],
      },
    ],
    furnishings: [],
    materials: { ...DEFAULT_MATERIALS },
    rulesVersion: RULES_VERSION,
  };
}

/* --- Резултат ----------------------------------------------------- */

export type Part = GenericPart<ModuleKind>;
export type PlacedModule = GenericPlaced<ModuleKind, RowId>;

export interface HardwareLine {
  name: string;
  qty: number;
  unit: 'бр.' | 'мм' | 'компл.';
  note?: string;
}

export interface Summary {
  cabinets: number;
  parts: number;
  /** Брой детайли с отчетено количество */
  partPieces: number;
  materials: MaterialUsage[];
  edges: EdgeUsage[];
  /** Площ фасади (лице). Ако се боядисва и гърбът — удвой. */ // ПРОВЕРИ
  paintAreaM2: number;
  worktopLength: number;
  worktopDepth: number;
  worktopHeight: number;
  plinthLength: number;
}

export interface CabinetResult {
  code: string;
  kind: ModuleKind;
  label: string;
  width: number;
  /** На коя стена на стаята стои шкафът. */
  wall: WallSide;
  parts: Part[];
}

export interface KitchenResult {
  rulesVersion: string;
  placed: { base: PlacedModule[]; upper: PlacedModule[] }[];
  rowStatus: { base: RowStatus; upper: RowStatus }[];
  cabinets: CabinetResult[];
  parts: Part[];
  byMaterial: MergedPart[];
  hardware: HardwareLine[];
  summary: Summary;
}

/* ------------------------------------------------------------------ */
/* 3. Разположение на модулите                                         */
/* ------------------------------------------------------------------ */

/**
 * Свободните интервали в горния ред — между колоните.
 * Колоната заема цялата височина, затова горните шкафове се нареждат
 * само в празнините между (и около) колоните.
 */
export function freeUpperIntervals(wall: Wall, room: RoomKind = 'kitchen'): Interval[] {
  return freeIntervals(systemFor(room), wall.base, wall.length, wall.openings, 'upper');
}

/** Свободните участъци в долния ред — между вратите и прозорците до пода. */
export function freeBaseIntervals(wall: Wall, room: RoomKind = 'kitchen'): Interval[] {
  return freeIntervals(systemFor(room), wall.base, wall.length, wall.openings, 'base');
}

/**
 * Номерира и позиционира модулите на една стена.
 *
 * `openings` се подава отвън, защото вратата и прозорците вече са на
 * стаята, а стената сама по себе си не ги знае. Без тях се ползват
 * нейните собствени — така стари конфигурации се четат, както преди.
 */
export function placeWall(
  wall: Wall,
  counters: Record<string, number> = {},
  room: RoomKind = 'kitchen',
  openings: WallOpening[] | undefined = wall.openings,
): { base: PlacedModule[]; upper: PlacedModule[] } {
  return placeWallIn(systemFor(room), wall.length, rowsOf(wall), counters, openings);
}

export function wallStatus(
  wall: Wall,
  room: RoomKind = 'kitchen',
  openings: WallOpening[] | undefined = wall.openings,
): { base: RowStatus; upper: RowStatus } {
  return wallStatusIn(systemFor(room), wall.length, rowsOf(wall), openings);
}

/** Вертикалната геометрия на модул — за чертежа. */
/**
 * С каква ширина влиза нов модул от каталога.
 *
 * 600 е шкафът, с който се мери всичко в кухнята; няма ли го в списъка,
 * взема се средната ширина, за да не тръгва нито от най-тясното, нито
 * от най-широкото. Стои тук, а не при редактора: това е правило на
 * каталога и го ползват и чертежът, и обемът.
 */
export function defaultWidth(kind: ModuleKind): number {
  const widths = MODULES[kind].widths;
  return widths.includes(600) ? 600 : widths[Math.floor(widths.length / 2)];
}

export function moduleGeometry(kind: ModuleKind): { y: number; height: number; depth: number } {
  // Новите системи носят своя геометрия на самия модул, затова тя има
  // предимство; кухненските без своя следват редовете на кухнята.
  return MODULES[kind].geometry ?? geometryOf(KITCHEN, kind);
}

/** Планът отгоре: стените на стаята и правоъгълниците на модулите по тях. */
export function kitchenPlan(
  kitchen: Kitchen,
  result: KitchenResult,
): PlanWall<ModuleKind, RowId>[] {
  return planGeometry(
    systemFor(kitchen.roomKind),
    kitchenRoom(kitchen),
    kitchen.walls.map((wall, i) => ({
      side: wallSide(wall, i),
      length: wall.length,
      placed: result.placed[i],
      openings: kitchenWallOpenings(kitchen, wallSide(wall, i)),
    })),
  );
}

/** Горният ръб на долния ред, без плота. */
export function worktopHeight(worktop: WorktopType): number {
  return DIM.LEG + DIM.BASE_H + WORKTOP_THICKNESS[worktop];
}

/* ------------------------------------------------------------------ */
/* 4. Корпуси                                                          */
/* ------------------------------------------------------------------ */

/** Детайли на корпуса за един кухненски модул. */
export function carcassParts(kind: ModuleKind, W: number, shelves?: number): RawPart[] {
  const count = shelfCount({ kind, shelves });
  if (kind === 'column') {
    // Дъното и таванът са между страниците; рафтът над нишата е фиксиран.
    const parts = betweenSidesBox(CARPENTRY, {
      width: W,
      height: DIM.COLUMN_H,
      depth: DIM.BASE_D,
      back: false,
    });
    // Първият рафт на колоната е фиксираният над нишата.
    if (count >= 1) {
      parts.push(
        shelf(CARPENTRY, {
          name: 'Рафт над нишата',
          width: W,
          depth: DIM.BASE_D,
          inset: 20,
          fixed: true,
          note: `фиксиран, ниша ${DIM.COLUMN_NICHE}`,
        }),
      );
    }
    for (let i = 1; i < count; i++) {
      parts.push(shelf(CARPENTRY, { width: W, depth: DIM.BASE_D, inset: 30 }));
    }
    parts.push(backPanel(CARPENTRY, DIM.COLUMN_H, W));
    return parts;
  }

  if (kind === 'upper' || kind === 'hood') {
    const h = kind === 'hood' ? DIM.HOOD_H : DIM.UPPER_H;
    const parts = betweenSidesBox(CARPENTRY, {
      width: W,
      height: h,
      depth: DIM.UPPER_D,
      back: false,
      bottomNote: kind === 'hood' ? 'изрез по каталога на аспиратора' : undefined,
    });
    for (let i = 0; i < count; i++) {
      parts.push(shelf(CARPENTRY, { width: W, depth: DIM.UPPER_D, inset: 20 }));
    }
    parts.push(backPanel(CARPENTRY, h, W));
    return parts;
  }

  // Долен корпус: страниците стъпват върху дъното, отгоре има два трегера.
  if (kind === 'door' || kind === 'drawers' || kind === 'sink' || kind === 'oven') {
    const parts = onBottomBox(CARPENTRY, {
      width: W,
      height: DIM.BASE_H,
      depth: DIM.BASE_D,
      railWidth: DIM.LEG,
      back: false,
    });

    /*
     * Рафтовете са толкова, колкото казва модулът. При фурната първият
     * е фиксираният под нея; всеки следващ е обикновен. Така броят в
     * обемния изглед и броят в разкроя не могат да се разминат.
     */
    let plain = count;
    if (kind === 'oven' && count >= 1) {
      parts.push(
        shelf(CARPENTRY, {
          name: 'Фиксиран рафт под фурната',
          width: W,
          depth: DIM.BASE_D,
          inset: 20,
          fixed: true,
          note: `ниша за фурна ${DIM.OVEN_NICHE}`,
        }),
      );
      plain -= 1;
    }
    for (let i = 0; i < plain; i++) {
      parts.push(shelf(CARPENTRY, { width: W, depth: DIM.BASE_D, inset: 30 }));
    }
    // Мивката и фурната са без гръб.
    if (kind === 'door' || kind === 'drawers') {
      parts.push(backPanel(CARPENTRY, DIM.BASE_H, W));
    }
    return parts;
  }

  /* --- Спалня и всекидневна ----------------------------------------
   * Корпусите са обикновени кутии; различават се по това какво стои
   * вътре. Лостът и водачите не са плоскости и влизат в обкова.
   */ // ПРОВЕРИ
  const spec = MODULES[kind];
  if (spec.hasCarcass && kind !== 'lgap' && kind !== 'ugap') {
    const g = moduleGeometry(kind);
    if (!(kind in SHELVES)) return [];

    const onLegs = kind === 'tv' || kind === 'lowboard';
    const parts = onLegs
      ? onBottomBox(CARPENTRY, {
          width: W,
          height: g.height,
          depth: g.depth,
          railWidth: DIM.TV_LEG,
          back: false,
        })
      : betweenSidesBox(CARPENTRY, { width: W, height: g.height, depth: g.depth, back: false });

    for (let i = 0; i < count; i++) {
      parts.push(shelf(CARPENTRY, { width: W, depth: g.depth, inset: 20 }));
    }
    // Отворените секции и стенните рафтове стоят без гръб.
    if (spec.facade?.style !== 'open') parts.push(backPanel(CARPENTRY, g.height, W));
    return parts;
  }

  // dw, lgap, ugap, wgap, vgap — без корпус.
  return [];
}

/* ------------------------------------------------------------------ */
/* 5. Фасади                                                           */
/* ------------------------------------------------------------------ */

/**
 * Фуга 2 мм към края на модула от всяка страна, 3 мм между фасадите.
 * При W ≤ 600 една врата, при W > 600 две.
 */
export function doorLayout(W: number, hingeSide: HingeSide = 'right'): DoorLayout {
  return doorLayoutIn(W, hingeSide, DOOR_GAPS);
}

function facadeEdging(type: FacadeType): {
  edgeL: 0 | 1 | 2;
  edgeW: 0 | 1 | 2;
  edgeThickness: number;
} {
  // Боядисаният МДФ е без кант. ПДЧ декор е с кант 2 мм по 4-те страни.
  if (type === 'pdch-decor') return { edgeL: 2, edgeW: 2, edgeThickness: DIM.EDGE_DECOR };
  return { edgeL: 0, edgeW: 0, edgeThickness: 0 };
}

function facadeNote(type: FacadeType, color: string, extra?: string): string {
  const base =
    type === 'pdch-decor'
      ? `декор: ${color}`
      : type === 'mdf-milled'
        ? `боя: ${color}; фрезоване рамка`
        : `боя: ${color}`;
  return extra ? `${extra}; ${base}` : base;
}

const SIDE_LABEL: Record<HingeSide, string> = { left: 'панти вляво', right: 'панти вдясно' };

/** Детайли на фасадите за един модул. */
export function facadeParts(m: KitchenModule, materials: Materials): RawPart[] {
  const { kind, width: W } = m;
  const f = materials.facade;
  const edg = facadeEdging(f.type);
  const out: RawPart[] = [];

  const door = (length: number, layout: DoorLayout, name = 'Врата') => {
    const hinges = hingeCount(length);
    layout.sides.forEach((side) => {
      out.push({
        name,
        material: 'facade',
        length,
        width: layout.width,
        qty: 1,
        ...edg,
        note: facadeNote(f.type, f.color, `${SIDE_LABEL[side]}, ${hinges} панти`),
      });
    });
  };

  switch (kind) {
    case 'door':
    case 'sink': {
      door(716, doorLayout(W, m.hingeSide));
      break;
    }
    case 'oven': {
      out.push({
        name: 'Бленда',
        material: 'facade',
        length: DIM.OVEN_FILLER_H,
        width: mm(W - 2 * DIM.GAP_EDGE),
        qty: 1,
        ...edg,
        note: facadeNote(f.type, f.color, 'под фурната, без дръжка'),
      });
      break;
    }
    case 'drawers': {
      DRAWER_FRONT_H.forEach((h) => {
        out.push({
          name: 'Чело',
          material: 'facade',
          length: h,
          width: mm(W - 2 * DIM.GAP_EDGE),
          qty: 1,
          ...edg,
          note: facadeNote(f.type, f.color),
        });
      });
      break;
    }
    case 'dw': {
      out.push({
        name: 'Панел съдомиялна',
        material: 'facade',
        length: 716,
        width: mm(W - 2 * DIM.GAP_EDGE),
        qty: 1,
        ...edg,
        note: facadeNote(f.type, f.color),
      });
      break;
    }
    case 'column': {
      const layout = doorLayout(W, m.hingeSide);
      door(1814, layout, 'Врата долна');
      door(209, layout, 'Врата горна');
      break;
    }
    case 'upper': {
      door(716, doorLayout(W, m.hingeSide));
      break;
    }
    case 'hood': {
      out.push({
        name: 'Клапа',
        material: 'facade',
        length: 356,
        width: mm(W - 2 * DIM.GAP_EDGE),
        qty: 1,
        ...edg,
        note: facadeNote(f.type, f.color, 'подемен механизъм'),
      });
      break;
    }
    default: {
      /*
       * Спалня и всекидневна: лицата се четат от същото описание, с
       * което се рисуват, за да не се разминат чертежът и разкроят.
       */
      const spec = MODULES[kind].facade;
      const g = moduleGeometry(kind);
      const inner = mm(W - 2 * DIM.GAP_EDGE);
      const innerHeight = g.height - 2 * DIM.GAP_EDGE;

      if (spec?.style === 'doors') {
        door(innerHeight, doorLayout(W, m.hingeSide));
      } else if (spec?.style === 'drawers') {
        const fronts =
          spec.fronts ?? evenFronts(innerHeight, spec.count ?? 3, DIM.GAP_BETWEEN);
        for (const h of fronts) {
          out.push({
            name: 'Чело',
            material: 'facade',
            length: h,
            width: inner,
            qty: 1,
            ...edg,
            note: facadeNote(f.type, f.color),
          });
        }
      }
      // open → няма лице
      break;
    }
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* 6. Чекмеджета                                                       */
/* ------------------------------------------------------------------ */

/**
 * Кутии на чекмеджетата по каталога на механизма.
 * Всички стойности в `DRAWERS` са `// ПРОВЕРИ`.
 */
export function drawerBoxParts(W: number, system: DrawerSystem): RawPart[] {
  return drawerBoxPartsIn(CARPENTRY, W, system, DRAWERS);
}

/* ------------------------------------------------------------------ */
/* 7. Всички детайли на един модул                                     */
/* ------------------------------------------------------------------ */

export function modulePartsRaw(m: KitchenModule, materials: Materials): RawPart[] {
  const raw = [...carcassParts(m.kind, m.width, m.shelves), ...facadeParts(m, materials)];
  if (m.kind === 'drawers') raw.push(...drawerBoxParts(m.width, materials.drawers));
  return raw;
}

/* ------------------------------------------------------------------ */
/* 8. Обков                                                            */
/* ------------------------------------------------------------------ */

export function hardware(kitchen: Kitchen): HardwareLine[] {
  const { materials } = kitchen;
  let hinges = 0;
  let drawerSets = 0;
  let lifts = 0;
  let legs = 0;
  let hangers = 0;
  let handles = 0;
  let push = 0;
  let plinth = 0;
  let worktopLen = 0;
  let profileL = 0;
  let profileC = 0;
  let rods = 0;

  // Плотът и цокълът са кухненски понятия — гардеробът няма такива.
  const isKitchen = (kitchen.roomKind ?? 'kitchen') === 'kitchen';

  for (const wall of kitchen.walls) {
    for (const m of [...wall.base, ...wall.upper]) {
      const spec = MODULES[m.kind];

      // Фасади → панти, дръжки, push-to-open
      for (const f of facadeParts(m, materials)) {
        const isFiller = f.name === 'Бленда';
        const isFlap = f.name === 'Клапа';
        if (f.name.startsWith('Врата')) hinges += hingeCount(f.length) * (f.qty ?? 1);
        if (isFlap) lifts += 1;
        // Дръжки: 1 на фасада, без блендата.
        if (!isFiller) handles += f.qty ?? 1;
        if (!isFiller) push += f.qty ?? 1;
      }

      /*
       * Броят чекмеджета идва от същото описание, по което се рисуват
       * челата: кухненският шкаф дава три, скринът пет, ТВ шкафът две.
       */
      const fac = spec.facade;
      if (fac?.style === 'drawers') drawerSets += fac.fronts?.length ?? fac.count ?? 0;

      // Лост за закачане в гардероба. // ПРОВЕРИ
      if (m.kind === 'wardrobe') rods += 1;

      // Крака: 4 на долен корпус, 6 при W ≥ 800. Съдомиялната и нишите са без крака.
      if (spec.row === 'base' && spec.hasCarcass) legs += m.width >= 800 ? 6 : 4;

      // Окачвачи: 2 на горен шкаф.
      if (spec.row === 'upper' && spec.hasCarcass) hangers += 2;

      // Цокъл: дължината на долния ред без нишите.
      if (isKitchen && spec.row === 'base' && m.kind !== 'lgap') plinth += m.width;

      // Плот: долният ред без колоните и нишите.
      if (isKitchen && spec.row === 'base' && m.kind !== 'lgap' && m.kind !== 'column') {
        worktopLen += m.width;
      }

      // Алуминиев профил.
      if (spec.row === 'base' && m.kind !== 'column' && !m.kind.endsWith('gap')) {
        profileL += m.width;
      }
      if (fac?.style === 'drawers') profileC += 2 * m.width;
    }
  }

  const out: HardwareLine[] = [
    { name: 'Панти с плавно затваряне', qty: hinges, unit: 'бр.' },
    {
      name: 'Механизъм за чекмедже',
      qty: drawerSets,
      unit: 'компл.',
      note: DRAWER_SYSTEM_LABEL[materials.drawers],
    },
    { name: 'Подемен механизъм', qty: lifts, unit: 'бр.' },
    { name: 'Крака', qty: legs, unit: 'бр.' },
    { name: 'Окачвачи', qty: hangers, unit: 'бр.' },
    { name: 'Лост за гардероб', qty: rods, unit: 'бр.', note: `на ${DIM.ROD_HEIGHT} от пода` },
    { name: 'Цокъл', qty: plinth, unit: 'мм' },
    {
      name: 'Плот',
      qty: worktopLen,
      unit: 'мм',
      note: `${WORKTOP_LABEL[materials.worktop]}, дълбочина ${DIM.WORKTOP_D}`,
    },
  ];

  if (materials.opening === 'handles') out.push({ name: 'Дръжки', qty: handles, unit: 'бр.' });
  if (materials.opening === 'push') out.push({ name: 'Push-to-open', qty: push, unit: 'бр.' });
  if (materials.opening === 'alu-profile') {
    out.push({ name: 'Алуминиев L-профил', qty: profileL, unit: 'мм' });
    out.push({ name: 'Алуминиев C-профил', qty: profileC, unit: 'мм' });
  }

  return out.filter((l) => l.qty > 0);
}

/* ------------------------------------------------------------------ */
/* 9. Обобщение                                                        */
/* ------------------------------------------------------------------ */

function edgeLabel(thickness: number): string {
  return thickness === DIM.EDGE_CORPUS
    ? `Кант ${thickness} мм (корпус)`
    : `Кант ${thickness} мм (фасади)`;
}

export function summarize(kitchen: Kitchen, cabinets: CabinetResult[], parts: Part[]): Summary {
  const hw = hardware(kitchen);
  const plinthLength = hw.find((l) => l.name === 'Цокъл')?.qty ?? 0;
  const worktopLength = hw.find((l) => l.name === 'Плот')?.qty ?? 0;

  return {
    cabinets: cabinets.length,
    parts: parts.length,
    partPieces: parts.reduce((s, p) => s + p.qty, 0),
    materials: materialUsage(parts, SHEET),
    edges: edgeUsage(parts, edgeLabel),
    paintAreaM2: facadeArea(parts),
    worktopLength,
    worktopDepth: DIM.WORKTOP_D,
    worktopHeight: worktopHeight(kitchen.materials.worktop),
    plinthLength,
  };
}

/* ------------------------------------------------------------------ */
/* 10. Входна точка                                                    */
/* ------------------------------------------------------------------ */

export function computeKitchen(kitchen: Kitchen): KitchenResult {
  const counters: Record<string, number> = {};
  const placed: { base: PlacedModule[]; upper: PlacedModule[] }[] = [];
  const statuses: { base: RowStatus; upper: RowStatus }[] = [];
  const cabinets: CabinetResult[] = [];
  const parts: Part[] = [];

  for (const [index, wall] of kitchen.walls.entries()) {
    // Вратата и прозорците са на стаята; стената ги получава, за да
    // не се нареди шкаф върху отвор.
    const openings = kitchenWallOpenings(kitchen, wallSide(wall, index));
    const p = placeWall(wall, counters, kitchen.roomKind, openings);
    placed.push(p);
    statuses.push(wallStatus(wall, kitchen.roomKind, openings));

    for (const m of [...p.base, ...p.upper]) {
      if (!m.code) continue; // ниши и празни места нямат номер и детайли
      const raw = modulePartsRaw(m, kitchen.materials);
      if (!raw.length) continue;
      const numbered = numberParts(m.code, m.kind, raw);
      cabinets.push({
        code: m.code,
        kind: m.kind,
        label: m.spec.label,
        width: m.width,
        wall: wallSide(wall, index),
        parts: numbered,
      });
      parts.push(...numbered);
    }
  }

  return {
    rulesVersion: RULES_VERSION,
    placed,
    rowStatus: statuses,
    cabinets,
    parts,
    byMaterial: mergeParts(parts),
    hardware: hardware(kitchen),
    summary: summarize(kitchen, cabinets, parts),
  };
}
