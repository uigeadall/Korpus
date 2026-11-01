/**
 * cabinet-rules.ts — всички размери, формули и правила за корпусна мебел.
 *
 * Чист TypeScript без UI. Всяка запазена конфигурация пази `RULES_VERSION`,
 * с която е сметната, за да може стара конфигурация да се прочете коректно.
 *
 * Стойностите, маркирани с `// ПРОВЕРИ`, са предположение и трябва да бъдат
 * потвърдени от мебелиста (каталог на механизми, панти, уреди).
 *
 * Всички размери са в милиметри, освен ако името не казва друго.
 */

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

/* ------------------------------------------------------------------ */
/* 2. Типове                                                           */
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
export type HingeSide = 'left' | 'right';

export interface ModuleSpec {
  kind: ModuleKind;
  row: RowId;
  label: string;
  /** Префикс при номерирането. null = не се номерира (ниши и празни места). */
  code: 'Д' | 'К' | 'Г' | null;
  widths: readonly number[];
  /** Има ли корпус (ПДЧ детайли). */
  hasCarcass: boolean;
  /** Заема и долния, и горния ред. */
  fullHeight?: boolean;
}

export const MODULES: Record<ModuleKind, ModuleSpec> = {
  column: {
    kind: 'column',
    row: 'base',
    label: 'Колона за хладилник',
    code: 'К',
    widths: [600],
    hasCarcass: true,
    fullHeight: true,
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

/* --- Материали ---------------------------------------------------- */

export type SheetMaterial = 'pdch18' | 'pdch16' | 'hdf3';
export type PartMaterial = SheetMaterial | 'facade';

export type FacadeType = 'mdf-painted' | 'mdf-milled' | 'pdch-decor';
export type WorktopType = 'laminate38' | 'quartz20' | 'sintered12' | 'granite30';
export type OpeningType = 'handles' | 'push' | 'alu-profile';
export type DrawerSystem = 'metal-box' | 'ball-bearing';

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

export const MATERIAL_LABEL: Record<PartMaterial, string> = {
  pdch18: 'ПДЧ 18',
  pdch16: 'ПДЧ 16',
  hdf3: 'HDF 3',
  facade: 'Фасада',
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

export interface KitchenModule {
  id: string;
  kind: ModuleKind;
  width: number;
  /** Страна на пантите при единична врата. */
  hingeSide?: HingeSide;
}

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

/** Най-близката допустима ширина за даден модул. */
export function nearestWidth(kind: ModuleKind, width: number): number {
  const widths = MODULES[kind].widths;
  return widths.reduce((best, w) =>
    Math.abs(w - width) < Math.abs(best - width) ? w : best,
  );
}

/** Модулът, преместен в другия ред, или null, ако не може. */
export function toOtherRow(m: KitchenModule): KitchenModule | null {
  const kind = ROW_COUNTERPART[m.kind];
  if (!kind) return null;
  return { ...m, kind, width: nearestWidth(kind, m.width) };
}

/** Дължина на стената в допустимия диапазон, закръглена на стъпката. */
export function clampWallLength(value: number): number {
  const stepped = Math.round(value / DIM.WALL_STEP) * DIM.WALL_STEP;
  return Math.min(DIM.WALL_MAX, Math.max(DIM.WALL_MIN, stepped));
}

export function emptyKitchen(length = 3600): Kitchen {
  return {
    walls: [{ length, base: [], upper: [] }],
    materials: { ...DEFAULT_MATERIALS },
    rulesVersion: RULES_VERSION,
  };
}

/* --- Резултат ----------------------------------------------------- */

export interface Part {
  /** Напр. Д2-03 */
  no: string;
  /** Код на шкафа, напр. Д2 */
  cabinet: string;
  cabinetKind: ModuleKind;
  name: string;
  material: PartMaterial;
  length: number;
  width: number;
  qty: number;
  /** Брой кантирани страни по дължината */
  edgeL: 0 | 1 | 2;
  /** Брой кантирани страни по ширината */
  edgeW: 0 | 1 | 2;
  /** Дебелина на канта, мм (0 = без кант) */
  edgeThickness: number;
  /** Обща дължина кант за реда, мм */
  edgeMm: number;
  note?: string;
}

export interface PlacedModule extends KitchenModule {
  /** Код на шкафа (Д1, К1, Г1) или null при ниша/празно */
  code: string | null;
  /** Отстояние на левия ръб от левия край на стената */
  x: number;
  row: RowId;
  spec: ModuleSpec;
}

export interface RowStatus {
  used: number;
  available: number;
  /** 'exact' | 'left' (остават) | 'over' (надвишава) */
  state: 'exact' | 'left' | 'over';
  diff: number;
}

export interface HardwareLine {
  name: string;
  qty: number;
  unit: 'бр.' | 'мм' | 'компл.';
  note?: string;
}

export interface MaterialUsage {
  material: SheetMaterial;
  areaM2: number;
  /** Площ + фира */
  areaWithWasteM2: number;
  sheets: number;
}

export interface EdgeUsage {
  thickness: number;
  label: string;
  meters: number;
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

export interface MergedPart {
  name: string;
  material: PartMaterial;
  length: number;
  width: number;
  qty: number;
  edgeL: 0 | 1 | 2;
  edgeW: 0 | 1 | 2;
  edgeThickness: number;
  edgeMm: number;
  /** Номерата на обединените детайли */
  numbers: string[];
  note?: string;
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
/* 3. Помощни                                                          */
/* ------------------------------------------------------------------ */

/** Закръгля до 0.5 мм, за да не се трупат дълги дроби от /2. */
export function mm(value: number): number {
  return Math.round(value * 2) / 2;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function edgeLength(p: Omit<Part, 'no' | 'cabinet' | 'cabinetKind' | 'edgeMm'>): number {
  if (!p.edgeThickness) return 0;
  return (p.edgeL * p.length + p.edgeW * p.width) * p.qty;
}

/** Детайл преди номериране. */
export interface RawPart {
  name: string;
  material: PartMaterial;
  length: number;
  width: number;
  qty?: number;
  edgeL?: 0 | 1 | 2;
  edgeW?: 0 | 1 | 2;
  edgeThickness?: number;
  note?: string;
}

/** ПДЧ детайл: кант 0,8 по видимия преден ръб („1 по дължина"). */
function corpus(p: RawPart): RawPart {
  return { edgeL: 1, edgeW: 0, edgeThickness: DIM.EDGE_CORPUS, ...p };
}

/** HDF гръб: без кант. */
function back(p: RawPart): RawPart {
  return { edgeL: 0, edgeW: 0, edgeThickness: 0, ...p };
}

/* ------------------------------------------------------------------ */
/* 4. Разположение на модулите                                         */
/* ------------------------------------------------------------------ */

/**
 * Свободните интервали в горния ред — между колоните.
 * Колоната заема цялата височина, затова горните шкафове се нареждат
 * само в празнините между (и около) колоните.
 */
export function freeUpperIntervals(wall: Wall): { x: number; width: number }[] {
  const columns: { x: number; width: number }[] = [];
  let x = 0;
  for (const m of wall.base) {
    if (m.kind === 'column') columns.push({ x, width: m.width });
    x += m.width;
  }

  const intervals: { x: number; width: number }[] = [];
  let cursor = 0;
  for (const c of columns) {
    if (c.x > cursor) intervals.push({ x: cursor, width: c.x - cursor });
    cursor = c.x + c.width;
  }
  if (wall.length > cursor) intervals.push({ x: cursor, width: wall.length - cursor });
  return intervals;
}

/** Номерира и позиционира модулите на една стена. */
export function placeWall(
  wall: Wall,
  counters: { base: number; column: number; upper: number } = { base: 0, column: 0, upper: 0 },
): { base: PlacedModule[]; upper: PlacedModule[] } {
  const base: PlacedModule[] = [];
  let x = 0;
  for (const m of wall.base) {
    const spec = MODULES[m.kind];
    let code: string | null = null;
    if (spec.code === 'К') code = `К${++counters.column}`;
    else if (spec.code === 'Д') code = `Д${++counters.base}`;
    base.push({ ...m, code, x, row: 'base', spec });
    x += m.width;
  }

  // Горните се нареждат последователно в свободните интервали между колоните.
  const intervals = freeUpperIntervals(wall);
  const upper: PlacedModule[] = [];
  let ii = 0;
  let ix = intervals[0]?.x ?? 0;
  let remaining = intervals[0]?.width ?? wall.length;
  for (const m of wall.upper) {
    const spec = MODULES[m.kind];
    if (remaining < m.width && ii + 1 < intervals.length) {
      ii += 1;
      ix = intervals[ii].x;
      remaining = intervals[ii].width;
    }
    const code = spec.code === 'Г' ? `Г${++counters.upper}` : null;
    upper.push({ ...m, code, x: ix, row: 'upper', spec });
    ix += m.width;
    remaining -= m.width;
  }

  return { base, upper };
}

export function rowStatus(used: number, available: number): RowStatus {
  const diff = mm(available - used);
  if (diff === 0) return { used, available, state: 'exact', diff: 0 };
  if (diff > 0) return { used, available, state: 'left', diff };
  return { used, available, state: 'over', diff: -diff };
}

export function wallStatus(wall: Wall): { base: RowStatus; upper: RowStatus } {
  const baseUsed = wall.base.reduce((s, m) => s + m.width, 0);
  const upperUsed = wall.upper.reduce((s, m) => s + m.width, 0);
  const upperAvailable = freeUpperIntervals(wall).reduce((s, i) => s + i.width, 0);
  return {
    base: rowStatus(baseUsed, wall.length),
    upper: rowStatus(upperUsed, upperAvailable),
  };
}

/** Вертикалната геометрия на модул — за чертежа. */
export function moduleGeometry(kind: ModuleKind): { y: number; height: number; depth: number } {
  const spec = MODULES[kind];
  if (kind === 'column') return { y: DIM.LEG, height: DIM.COLUMN_H, depth: DIM.BASE_D };
  if (kind === 'hood') {
    const top = DIM.UPPER_BOTTOM + DIM.UPPER_H;
    return { y: top - DIM.HOOD_H, height: DIM.HOOD_H, depth: DIM.UPPER_D };
  }
  if (spec.row === 'upper') return { y: DIM.UPPER_BOTTOM, height: DIM.UPPER_H, depth: DIM.UPPER_D };
  return { y: DIM.LEG, height: DIM.BASE_H, depth: DIM.BASE_D };
}

/** Горният ръб на долния ред, без плота. */
export function worktopHeight(worktop: WorktopType): number {
  return DIM.LEG + DIM.BASE_H + WORKTOP_THICKNESS[worktop];
}

/* ------------------------------------------------------------------ */
/* 5. Корпуси                                                          */
/* ------------------------------------------------------------------ */

const T = DIM.T;

/** Детайли на корпуса за един модул. */
export function carcassParts(kind: ModuleKind, W: number): RawPart[] {
  const parts: RawPart[] = [];

  if (kind === 'column') {
    // Дъното и таванът са между страниците.
    parts.push(corpus({ name: 'Страница', material: 'pdch18', length: DIM.COLUMN_H, width: DIM.BASE_D, qty: 2 }));
    parts.push(corpus({ name: 'Дъно', material: 'pdch18', length: W - 2 * T, width: DIM.BASE_D }));
    parts.push(corpus({ name: 'Таван', material: 'pdch18', length: W - 2 * T, width: DIM.BASE_D }));
    parts.push(
      corpus({
        name: 'Рафт над нишата',
        material: 'pdch18',
        length: W - 2 * T,
        width: DIM.BASE_D - 20,
        note: `фиксиран, ниша ${DIM.COLUMN_NICHE}`,
      }),
    );
    parts.push(back({ name: 'Гръб', material: 'hdf3', length: DIM.COLUMN_H - DIM.BACK, width: W - DIM.BACK }));
    return parts;
  }

  if (kind === 'upper' || kind === 'hood') {
    const h = kind === 'hood' ? DIM.HOOD_H : DIM.UPPER_H;
    const D = DIM.UPPER_D;
    parts.push(corpus({ name: 'Страница', material: 'pdch18', length: h, width: D, qty: 2 }));
    parts.push(
      corpus({
        name: 'Дъно',
        material: 'pdch18',
        length: W - 2 * T,
        width: D,
        note: kind === 'hood' ? 'изрез по каталога на аспиратора' : undefined,
      }),
    );
    parts.push(corpus({ name: 'Таван', material: 'pdch18', length: W - 2 * T, width: D }));
    if (kind === 'upper') {
      parts.push(corpus({ name: 'Рафт', material: 'pdch18', length: W - 2 * T - 2, width: D - 20 }));
    }
    parts.push(back({ name: 'Гръб', material: 'hdf3', length: h - DIM.BACK, width: W - DIM.BACK }));
    return parts;
  }

  // Долен корпус: страниците стъпват върху дъното, отгоре има два трегера.
  if (kind === 'door' || kind === 'drawers' || kind === 'sink' || kind === 'oven') {
    const D = DIM.BASE_D;
    parts.push(corpus({ name: 'Страница', material: 'pdch18', length: DIM.BASE_H - T, width: D, qty: 2 }));
    parts.push(corpus({ name: 'Дъно', material: 'pdch18', length: W, width: D }));
    parts.push(corpus({ name: 'Трегер', material: 'pdch18', length: W - 2 * T, width: DIM.LEG, qty: 2 }));

    if (kind === 'door') {
      parts.push(corpus({ name: 'Рафт', material: 'pdch18', length: W - 2 * T - 2, width: D - 30 }));
    }
    if (kind === 'oven') {
      parts.push(
        corpus({
          name: 'Фиксиран рафт под фурната',
          material: 'pdch18',
          length: W - 2 * T,
          width: D - 20,
          note: `ниша за фурна ${DIM.OVEN_NICHE}`,
        }),
      );
    }
    // Мивката и фурната са без гръб.
    if (kind === 'door' || kind === 'drawers') {
      parts.push(back({ name: 'Гръб', material: 'hdf3', length: DIM.BASE_H - DIM.BACK, width: W - DIM.BACK }));
    }
    return parts;
  }

  // dw, lgap, ugap — без корпус.
  return parts;
}

/* ------------------------------------------------------------------ */
/* 6. Фасади                                                           */
/* ------------------------------------------------------------------ */

export interface DoorLayout {
  width: number;
  count: 1 | 2;
  sides: HingeSide[];
}

/**
 * Фуга 2 мм към края на модула от всяка страна, 3 мм между фасадите.
 * При W ≤ 600 една врата, при W > 600 две.
 */
export function doorLayout(W: number, hingeSide: HingeSide = 'right'): DoorLayout {
  const net = W - 2 * DIM.GAP_EDGE;
  if (W <= 600) return { width: mm(net), count: 1, sides: [hingeSide] };
  return { width: mm((net - DIM.GAP_BETWEEN) / 2), count: 2, sides: ['left', 'right'] };
}

/** Панти с плавно затваряне според височината на вратата. */
export function hingeCount(doorHeight: number): number {
  if (doorHeight <= 1000) return 2;
  if (doorHeight <= 1500) return 3;
  if (doorHeight <= 2000) return 4;
  return 5;
}

function facadeEdging(type: FacadeType): { edgeL: 0 | 1 | 2; edgeW: 0 | 1 | 2; edgeThickness: number } {
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
/* 7. Чекмеджета                                                       */
/* ------------------------------------------------------------------ */

/**
 * Кутии на чекмеджетата. Вътрешна ширина LW = W − 2Т.
 * Всички стойности тук са `// ПРОВЕРИ` по каталога на механизма.
 */
export function drawerBoxParts(W: number, system: DrawerSystem): RawPart[] {
  const LW = W - 2 * T;
  const out: RawPart[] = [];

  if (system === 'metal-box') {
    out.push({
      name: 'Дъно чекмедже',
      material: 'pdch16',
      length: LW - 75,
      width: DIM.NL - 10,
      qty: 3,
      edgeL: 0,
      edgeW: 0,
      edgeThickness: 0,
      note: 'метален борд',
    });
    DRAWER_BACK_H.forEach((h) => {
      out.push({
        name: 'Гръб чекмедже',
        material: 'pdch16',
        length: LW - 87,
        width: h,
        qty: 1,
        edgeL: 1,
        edgeW: 0,
        edgeThickness: DIM.EDGE_CORPUS,
        note: 'кант по горния ръб',
      });
    });
    return out;
  }

  // Сферични водачи: кутия от ПДЧ 16 + HDF дъно.
  DRAWER_BOX_H.forEach((hb) => {
    out.push({
      name: 'Страница кутия',
      material: 'pdch16',
      length: DIM.NL,
      width: hb,
      qty: 2,
      edgeL: 1,
      edgeW: 0,
      edgeThickness: DIM.EDGE_CORPUS,
    });
    out.push({
      name: 'Чело/гръб кутия',
      material: 'pdch16',
      length: LW - 26 - 32,
      width: hb,
      qty: 2,
      edgeL: 1,
      edgeW: 0,
      edgeThickness: DIM.EDGE_CORPUS,
    });
  });
  out.push({
    name: 'Дъно кутия',
    material: 'hdf3',
    length: LW - 26,
    width: DIM.NL,
    qty: 3,
    edgeL: 0,
    edgeW: 0,
    edgeThickness: 0,
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* 8. Всички детайли на един модул                                     */
/* ------------------------------------------------------------------ */

export function modulePartsRaw(m: KitchenModule, materials: Materials): RawPart[] {
  const raw = [...carcassParts(m.kind, m.width), ...facadeParts(m, materials)];
  if (m.kind === 'drawers') raw.push(...drawerBoxParts(m.width, materials.drawers));
  return raw;
}

/** Номерира детайлите: <код>-<NN>, например Д2-03. */
export function numberParts(code: string, kind: ModuleKind, raw: RawPart[]): Part[] {
  let n = 0;
  return raw.map((p) => {
    const qty = p.qty ?? 1;
    const part: Part = {
      no: `${code}-${pad(++n)}`,
      cabinet: code,
      cabinetKind: kind,
      name: p.name,
      material: p.material,
      length: mm(p.length),
      width: mm(p.width),
      qty,
      edgeL: p.edgeL ?? 0,
      edgeW: p.edgeW ?? 0,
      edgeThickness: p.edgeThickness ?? 0,
      edgeMm: 0,
      note: p.note,
    };
    part.edgeMm = mm(edgeLength(part));
    return part;
  });
}

/* ------------------------------------------------------------------ */
/* 9. Обков                                                            */
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
    { name: 'Механизъм за чекмедже', qty: drawerSets, unit: 'компл.', note: materials.drawers === 'metal-box' ? 'метален борд' : 'сферични водачи' },
    { name: 'Подемен механизъм', qty: lifts, unit: 'бр.' },
    { name: 'Крака', qty: legs, unit: 'бр.' },
    { name: 'Окачвачи', qty: hangers, unit: 'бр.' },
    { name: 'Цокъл', qty: plinth, unit: 'мм' },
    { name: 'Плот', qty: worktopLen, unit: 'мм', note: `${WORKTOP_LABEL[materials.worktop]}, дълбочина ${DIM.WORKTOP_D}` },
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
/* 10. Обединяване и обобщение                                         */
/* ------------------------------------------------------------------ */

/** Обединява еднаквите детайли и изрежда номерата им. */
export function mergeParts(parts: Part[]): MergedPart[] {
  const map = new Map<string, MergedPart>();
  for (const p of parts) {
    const key = [p.name, p.material, p.length, p.width, p.edgeL, p.edgeW, p.edgeThickness, p.note ?? ''].join('|');
    const found = map.get(key);
    if (found) {
      found.qty += p.qty;
      found.edgeMm = mm(found.edgeMm + p.edgeMm);
      found.numbers.push(p.no);
    } else {
      map.set(key, {
        name: p.name,
        material: p.material,
        length: p.length,
        width: p.width,
        qty: p.qty,
        edgeL: p.edgeL,
        edgeW: p.edgeW,
        edgeThickness: p.edgeThickness,
        edgeMm: p.edgeMm,
        numbers: [p.no],
        note: p.note,
      });
    }
  }
  return [...map.values()].sort(
    (a, b) => a.material.localeCompare(b.material) || b.length - a.length || b.width - a.width,
  );
}

const SHEET_AREA_M2 = (DIM.SHEET_L / 1000) * (DIM.SHEET_W / 1000);

export function summarize(kitchen: Kitchen, cabinets: CabinetResult[], parts: Part[]): Summary {
  const areaByMaterial = new Map<SheetMaterial, number>();
  let paintArea = 0;

  for (const p of parts) {
    const areaM2 = (p.length * p.width * p.qty) / 1_000_000;
    if (p.material === 'facade') paintArea += areaM2;
    else areaByMaterial.set(p.material, (areaByMaterial.get(p.material) ?? 0) + areaM2);
  }

  const order: SheetMaterial[] = ['pdch18', 'pdch16', 'hdf3'];
  const materials: MaterialUsage[] = order
    .filter((m) => areaByMaterial.has(m))
    .map((m) => {
      const areaM2 = areaByMaterial.get(m) ?? 0;
      const areaWithWasteM2 = areaM2 * (1 + DIM.SHEET_WASTE);
      return {
        material: m,
        areaM2: round2(areaM2),
        areaWithWasteM2: round2(areaWithWasteM2),
        sheets: Math.ceil(areaWithWasteM2 / SHEET_AREA_M2),
      };
    });

  const edgeByThickness = new Map<number, number>();
  for (const p of parts) {
    if (!p.edgeThickness || !p.edgeMm) continue;
    edgeByThickness.set(p.edgeThickness, (edgeByThickness.get(p.edgeThickness) ?? 0) + p.edgeMm);
  }
  const edges: EdgeUsage[] = [...edgeByThickness.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([thickness, totalMm]) => ({
      thickness,
      label: thickness === DIM.EDGE_CORPUS ? `Кант ${thickness} мм (корпус)` : `Кант ${thickness} мм (фасади)`,
      meters: round2(totalMm / 1000),
    }));

  const hw = hardware(kitchen);
  const plinthLength = hw.find((l) => l.name === 'Цокъл')?.qty ?? 0;
  const worktopLength = hw.find((l) => l.name === 'Плот')?.qty ?? 0;

  return {
    cabinets: cabinets.length,
    parts: parts.length,
    partPieces: parts.reduce((s, p) => s + p.qty, 0),
    materials,
    edges,
    paintAreaM2: round2(paintArea),
    worktopLength,
    worktopDepth: DIM.WORKTOP_D,
    worktopHeight: worktopHeight(kitchen.materials.worktop),
    plinthLength,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/* ------------------------------------------------------------------ */
/* 11. Входна точка                                                    */
/* ------------------------------------------------------------------ */

export function computeKitchen(kitchen: Kitchen): KitchenResult {
  const counters = { base: 0, column: 0, upper: 0 };
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
