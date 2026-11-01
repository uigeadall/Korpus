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
  type FurnitureSystem,
  type Interval,
  type PlacedModule as GenericPlaced,
  type RowStatus,
  type SystemModule,
  type SystemModuleInstance,
  clampLength,
  freeIntervals,
  geometryOf,
  moduleCounterpart,
  nearestWidth as nearestWidthIn,
  placeWall as placeWallIn,
  rowStatus,
  wallStatus as wallStatusIn,
} from './furniture/system';

export {
  MATERIAL_LABEL,
  hingeCount,
  mergeParts,
  mm,
  numberParts,
  rowStatus,
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

export const RULES_VERSION = '1.0.0';

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

  /** Стена: допустим диапазон и стъпка */
  WALL_MIN: 1200,
  WALL_MAX: 7000,
  WALL_STEP: 10,
} as const;

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

export type ModuleKind =
  | 'column'
  | 'door'
  | 'drawers'
  | 'sink'
  | 'oven'
  | 'dw'
  | 'lgap'
  | 'upper'
  | 'hood'
  | 'ugap';

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
  },
  door: {
    kind: 'door',
    row: 'base',
    label: 'Долен с врата',
    code: 'Д',
    widths: [300, 400, 450, 500, 600, 800, 900],
    hasCarcass: true,
  },
  drawers: {
    kind: 'drawers',
    row: 'base',
    label: 'Долен с 3 чекмеджета',
    code: 'Д',
    widths: [400, 450, 500, 600, 800, 900],
    hasCarcass: true,
  },
  sink: {
    kind: 'sink',
    row: 'base',
    label: 'Шкаф за мивка',
    code: 'Д',
    widths: [600, 800, 900],
    hasCarcass: true,
  },
  oven: {
    kind: 'oven',
    row: 'base',
    label: 'Шкаф за фурна',
    code: 'Д',
    widths: [600],
    hasCarcass: true,
  },
  dw: {
    kind: 'dw',
    row: 'base',
    label: 'Панел за вградена съдомиялна',
    code: 'Д',
    widths: [450, 600],
    hasCarcass: false,
  },
  lgap: {
    kind: 'lgap',
    row: 'base',
    label: 'Свободна ниша',
    code: null,
    widths: [300, 450, 600, 900],
    hasCarcass: false,
  },
  upper: {
    kind: 'upper',
    row: 'upper',
    label: 'Горен шкаф',
    code: 'Г',
    widths: [300, 400, 450, 500, 600, 800, 900],
    hasCarcass: true,
  },
  hood: {
    kind: 'hood',
    row: 'upper',
    label: 'Горен над аспиратор',
    code: 'Г',
    widths: [600, 900],
    hasCarcass: true,
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
  facade: { type: 'mdf-painted', color: 'RAL 9010' },
  worktop: 'laminate38',
  opening: 'handles',
  drawers: 'metal-box',
};

/* --- Конфигурация ------------------------------------------------- */

export type KitchenModule = SystemModuleInstance<ModuleKind>;

export interface Wall {
  /** Дължина на стената */
  length: number;
  base: KitchenModule[];
  upper: KitchenModule[];
}

export interface Kitchen {
  walls: Wall[];
  materials: Materials;
  rulesVersion: string;
}

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
    walls: [{ length, base: [], upper: [] }],
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
export function freeUpperIntervals(wall: Wall): Interval[] {
  return freeIntervals(KITCHEN, wall.base, wall.length);
}

/** Номерира и позиционира модулите на една стена. */
export function placeWall(
  wall: Wall,
  counters: Record<string, number> = {},
): { base: PlacedModule[]; upper: PlacedModule[] } {
  return placeWallIn(KITCHEN, wall.length, rowsOf(wall), counters);
}

export function wallStatus(wall: Wall): { base: RowStatus; upper: RowStatus } {
  return wallStatusIn(KITCHEN, wall.length, rowsOf(wall));
}

/** Вертикалната геометрия на модул — за чертежа. */
export function moduleGeometry(kind: ModuleKind): { y: number; height: number; depth: number } {
  return geometryOf(KITCHEN, kind);
}

/** Горният ръб на долния ред, без плота. */
export function worktopHeight(worktop: WorktopType): number {
  return DIM.LEG + DIM.BASE_H + WORKTOP_THICKNESS[worktop];
}

/* ------------------------------------------------------------------ */
/* 4. Корпуси                                                          */
/* ------------------------------------------------------------------ */

/** Детайли на корпуса за един кухненски модул. */
export function carcassParts(kind: ModuleKind, W: number): RawPart[] {
  if (kind === 'column') {
    // Дъното и таванът са между страниците; рафтът над нишата е фиксиран.
    const parts = betweenSidesBox(CARPENTRY, {
      width: W,
      height: DIM.COLUMN_H,
      depth: DIM.BASE_D,
      back: false,
    });
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
    if (kind === 'upper') {
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

    if (kind === 'door') {
      parts.push(shelf(CARPENTRY, { width: W, depth: DIM.BASE_D, inset: 30 }));
    }
    if (kind === 'oven') {
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
    }
    // Мивката и фурната са без гръб.
    if (kind === 'door' || kind === 'drawers') {
      parts.push(backPanel(CARPENTRY, DIM.BASE_H, W));
    }
    return parts;
  }

  // dw, lgap, ugap — без корпус.
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
    default:
      break;
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
  const raw = [...carcassParts(m.kind, m.width), ...facadeParts(m, materials)];
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

      if (m.kind === 'drawers') drawerSets += 3;

      // Крака: 4 на долен корпус, 6 при W ≥ 800. Съдомиялната и нишите са без крака.
      if (spec.row === 'base' && spec.hasCarcass) legs += m.width >= 800 ? 6 : 4;

      // Окачвачи: 2 на горен шкаф.
      if (spec.row === 'upper' && spec.hasCarcass) hangers += 2;

      // Цокъл: дължината на долния ред без нишите.
      if (spec.row === 'base' && m.kind !== 'lgap') plinth += m.width;

      // Плот: долният ред без колоните и нишите.
      if (spec.row === 'base' && m.kind !== 'lgap' && m.kind !== 'column') worktopLen += m.width;

      // Алуминиев профил.
      if (spec.row === 'base' && m.kind !== 'column' && m.kind !== 'lgap') profileL += m.width;
      if (m.kind === 'drawers') profileC += 2 * m.width;
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

  for (const wall of kitchen.walls) {
    const p = placeWall(wall, counters);
    placed.push(p);
    statuses.push(wallStatus(wall));

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
