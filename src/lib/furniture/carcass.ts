/**
 * Дърводелството, което е еднакво за всяка корпусна мебел: кутия,
 * рафт, врати, панти, чекмеджета.
 *
 * Системата (кухня, гардероб) казва размерите и стила на сглобяване;
 * тук се получават детайлите. Нищо тук не знае какво е плот или
 * аспиратор.
 */

import type { RawPart } from './parts';
import { mm } from './parts';

/** Дебелините и кантовете, с които работи системата. */
export interface CarpentryDims {
  /** Дебелина на корпусната плоскост */
  T: number;
  /** Дебелина на гърба */
  BACK: number;
  /** Кант по видимия преден ръб на корпуса */
  EDGE_CORPUS: number;
}

export type HingeSide = 'left' | 'right';
export type DrawerSystem = 'metal-box' | 'ball-bearing';

/** ПДЧ детайл: кант по видимия преден ръб („1 по дължина"). */
export function corpus(dims: CarpentryDims, p: RawPart): RawPart {
  return { edgeL: 1, edgeW: 0, edgeThickness: dims.EDGE_CORPUS, ...p };
}

/** HDF гръб и дъна: без кант. */
export function back(p: RawPart): RawPart {
  return { edgeL: 0, edgeW: 0, edgeThickness: 0, ...p };
}

export interface BoxSpec {
  width: number;
  height: number;
  depth: number;
  /** HDF гръб. По подразбиране има. */
  back?: boolean;
  /** Бележка към дъното (изрез за уред например). */
  bottomNote?: string;
}

/**
 * Корпус със страници по цялата височина — дъното и таванът влизат
 * между тях. Така се правят горните шкафове и високите колони.
 */
export function betweenSidesBox(dims: CarpentryDims, box: BoxSpec): RawPart[] {
  const { T } = dims;
  const parts: RawPart[] = [
    corpus(dims, { name: 'Страница', material: 'pdch18', length: box.height, width: box.depth, qty: 2 }),
    corpus(dims, {
      name: 'Дъно',
      material: 'pdch18',
      length: box.width - 2 * T,
      width: box.depth,
      note: box.bottomNote,
    }),
    corpus(dims, { name: 'Таван', material: 'pdch18', length: box.width - 2 * T, width: box.depth }),
  ];
  if (box.back !== false) parts.push(backPanel(dims, box.height, box.width));
  return parts;
}

/**
 * Корпус, стъпил върху дъното: страниците са с Т по-къси, а отгоре
 * вместо таван има два трегера. Така се правят долните кухненски
 * шкафове — плотът ляга върху трегерите.
 */
export function onBottomBox(
  dims: CarpentryDims,
  box: BoxSpec & { railWidth: number },
): RawPart[] {
  const { T } = dims;
  const parts: RawPart[] = [
    corpus(dims, {
      name: 'Страница',
      material: 'pdch18',
      length: box.height - T,
      width: box.depth,
      qty: 2,
    }),
    corpus(dims, {
      name: 'Дъно',
      material: 'pdch18',
      length: box.width,
      width: box.depth,
      note: box.bottomNote,
    }),
    corpus(dims, {
      name: 'Трегер',
      material: 'pdch18',
      length: box.width - 2 * T,
      width: box.railWidth,
      qty: 2,
    }),
  ];
  if (box.back !== false) parts.push(backPanel(dims, box.height, box.width));
  return parts;
}

/** Гръб HDF: по 3 мм по-малък от светлия отвор от двете страни. */
export function backPanel(dims: CarpentryDims, height: number, width: number): RawPart {
  return back({
    name: 'Гръб',
    material: 'hdf3',
    length: height - dims.BACK,
    width: width - dims.BACK,
  });
}

export interface ShelfSpec {
  width: number;
  depth: number;
  name?: string;
  /** Колко по-плитък е рафтът от корпуса. */
  inset?: number;
  /** Подвижният рафт е с 2 мм хлабина по дължина; фиксираният — не. */
  fixed?: boolean;
  qty?: number;
  note?: string;
}

/** Рафт между страниците. */
export function shelf(dims: CarpentryDims, s: ShelfSpec): RawPart {
  const slack = s.fixed ? 0 : 2;
  return corpus(dims, {
    name: s.name ?? 'Рафт',
    material: 'pdch18',
    length: s.width - 2 * dims.T - slack,
    width: s.depth - (s.inset ?? 0),
    qty: s.qty,
    note: s.note,
  });
}

/* --- Фасади -------------------------------------------------------- */

export interface DoorLayout {
  width: number;
  count: 1 | 2;
  sides: HingeSide[];
}

export interface DoorGaps {
  /** Фуга фасада → край на модула, от всяка страна */
  edge: number;
  /** Фуга между две фасади */
  between: number;
  /** До тази ширина модулът е с една врата. */
  maxSingle: number;
}

/** Една врата до `maxSingle`, после две еднакви. */
export function doorLayout(W: number, hingeSide: HingeSide, gaps: DoorGaps): DoorLayout {
  const net = W - 2 * gaps.edge;
  if (W <= gaps.maxSingle) return { width: mm(net), count: 1, sides: [hingeSide] };
  return { width: mm((net - gaps.between) / 2), count: 2, sides: ['left', 'right'] };
}

/** Панти с плавно затваряне според височината на вратата. */
export function hingeCount(doorHeight: number): number {
  if (doorHeight <= 1000) return 2;
  if (doorHeight <= 1500) return 3;
  if (doorHeight <= 2000) return 4;
  return 5;
}

/* --- Чекмеджета ---------------------------------------------------- */

/**
 * Геометрията на чекмеджетата идва от каталога на механизма.
 * Всички стойности, с които се извиква това, са `// ПРОВЕРИ`, докато
 * мебелистът не даде своя каталог.
 */
export interface DrawerGeometry {
  /** Номинална дължина на водача */
  nominalLength: number;
  /** Височини на гърбовете при метален борд, отгоре надолу */
  backHeights: readonly number[];
  /** Височини на кутията при сферични водачи, отгоре надолу */
  boxHeights: readonly number[];
}

/** Кутии на чекмеджетата. Вътрешна ширина LW = W − 2Т. */
export function drawerBoxParts(
  dims: CarpentryDims,
  W: number,
  system: DrawerSystem,
  geo: DrawerGeometry,
): RawPart[] {
  const LW = W - 2 * dims.T;
  const out: RawPart[] = [];

  if (system === 'metal-box') {
    out.push({
      name: 'Дъно чекмедже',
      material: 'pdch16',
      length: LW - 75,
      width: geo.nominalLength - 10,
      qty: geo.backHeights.length,
      edgeL: 0,
      edgeW: 0,
      edgeThickness: 0,
      note: 'метален борд',
    });
    geo.backHeights.forEach((h) => {
      out.push({
        name: 'Гръб чекмедже',
        material: 'pdch16',
        length: LW - 87,
        width: h,
        qty: 1,
        edgeL: 1,
        edgeW: 0,
        edgeThickness: dims.EDGE_CORPUS,
        note: 'кант по горния ръб',
      });
    });
    return out;
  }

  // Сферични водачи: кутия от ПДЧ 16 + HDF дъно.
  geo.boxHeights.forEach((hb) => {
    out.push({
      name: 'Страница кутия',
      material: 'pdch16',
      length: geo.nominalLength,
      width: hb,
      qty: 2,
      edgeL: 1,
      edgeW: 0,
      edgeThickness: dims.EDGE_CORPUS,
    });
    out.push({
      name: 'Чело/гръб кутия',
      material: 'pdch16',
      length: LW - 26 - 32,
      width: hb,
      qty: 2,
      edgeL: 1,
      edgeW: 0,
      edgeThickness: dims.EDGE_CORPUS,
    });
  });
  out.push({
    name: 'Дъно кутия',
    material: 'hdf3',
    length: LW - 26,
    width: geo.nominalLength,
    qty: geo.boxHeights.length,
    edgeL: 0,
    edgeW: 0,
    edgeThickness: 0,
  });
  return out;
}
