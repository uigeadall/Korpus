/**
 * drawing.ts — геометрия на фронталния чертеж.
 *
 * Чисти функции, без React. Всички координати са в милиметри.
 * Моделът мери височината от пода нагоре; SVG мери надолу, затова
 * всяко преобразуване минава през `floorY`.
 */

import {
  DIM,
  type HingeSide,
  type ModuleKind,
  type OpeningKind,
  OPENING_KIND_LABEL,
  type PlacedModule,
  type RowId,
  type WallOpening,
  MODULES,
  mm,
  moduleGeometry,
} from './cabinet-rules';
import { facadePanels } from './facade';

/** Полета около чертежа — място за размерните вериги и височините. */
export const PAD = {
  /** горе: верига на горния ред */
  top: 230,
  /** долу: верига на долния ред + обща дължина */
  bottom: 520,
  /** вляво: височини */
  left: 330,
  right: 150,
} as const;

/** Стена в разрез */
export const WALL_T = 90;
/** Видима височина над пода */
export const DRAW_H = 2320;
/** Дебелина на пода в разрез */
export const FLOOR_T = 90;

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Y на пода в SVG координати */
  floorY: number;
  /** Дължина на стената */
  wallLength: number;
  /** Текстът за viewBox атрибута */
  value: string;
}

/**
 * @param wallLength дължина на стената
 * @param contentRight най-десният край на съдържанието; при надвишаване е
 *   по-голям от стената, за да не изпадат размерите извън рамката
 */
export function viewBoxFor(wallLength: number, contentRight = wallLength): ViewBox {
  const right = Math.max(wallLength, contentRight);
  const x = -(PAD.left + WALL_T);
  const y = -PAD.top;
  const width = PAD.left + WALL_T + right + WALL_T + PAD.right;
  const height = PAD.top + DRAW_H + PAD.bottom;
  return {
    x,
    y,
    width,
    height,
    floorY: DRAW_H,
    wallLength,
    value: `${x} ${y} ${width} ${height}`,
  };
}

/** Преобразува височина над пода в SVG Y. */
export function toSvgY(view: ViewBox, heightAboveFloor: number): number {
  return view.floorY - heightAboveFloor;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  code: string | null;
  kind: ModuleKind;
  label: string;
  /** Празно място / ниша — рисува се само с пунктир. */
  empty: boolean;
}

export function moduleBox(view: ViewBox, m: PlacedModule): Box {
  const g = moduleGeometry(m.kind);
  const spec = MODULES[m.kind];
  return {
    x: m.x,
    y: toSvgY(view, g.y + g.height),
    width: m.width,
    height: g.height,
    code: m.code,
    kind: m.kind,
    label: spec.label,
    empty: m.kind === 'lgap' || m.kind === 'ugap',
  };
}

export function moduleBoxes(view: ViewBox, modules: PlacedModule[]): Box[] {
  return modules.map((m) => moduleBox(view, m));
}

/* ------------------------------------------------------------------ */
/* Размерни вериги                                                     */
/* ------------------------------------------------------------------ */

export interface ChainSegment {
  x: number;
  width: number;
  /** Текстът на размера */
  label: string;
  /** Център за надписа */
  center: number;
  /** Сегментът е дупка в реда (например мястото на колоната). */
  gap: boolean;
}

/**
 * Вериден размер от подредени интервали, със запълнени дупки.
 * Дупките също са размер — чертежът трябва да е затворен.
 */
export function chainFromRanges(
  ranges: { x: number; width: number }[],
  total: number,
): ChainSegment[] {
  const sorted = [...ranges].sort((a, b) => a.x - b.x);
  const out: ChainSegment[] = [];
  let cursor = 0;

  const push = (x: number, width: number, gap: boolean) => {
    if (width <= 0) return;
    out.push({ x, width, label: formatMm(width), center: x + width / 2, gap });
  };

  for (const r of sorted) {
    if (r.x > cursor) push(cursor, r.x - cursor, true);
    push(r.x, r.width, false);
    cursor = Math.max(cursor, r.x + r.width);
  }
  if (total > cursor) push(cursor, total - cursor, true);
  return out;
}

export function chainForModules(modules: PlacedModule[], total: number): ChainSegment[] {
  return chainFromRanges(
    modules.map((m) => ({ x: m.x, width: m.width })),
    total,
  );
}

/** 1234 → „1234"; 396,5 → „396,5" (десетичната запетая е българска). */
export function formatMm(value: number): string {
  const v = mm(value);
  return Number.isInteger(v) ? String(v) : String(v).replace('.', ',');
}

/* ------------------------------------------------------------------ */
/* Височини вляво                                                      */
/* ------------------------------------------------------------------ */

export interface HeightMark {
  /** Височина над пода */
  h: number;
  label: string;
  /** Основна (с надпис) или спомагателна линия */
  minor?: boolean;
}

export function heightMarks(worktopThickness: number): HeightMark[] {
  const worktop = DIM.LEG + DIM.BASE_H + worktopThickness;
  return [
    { h: 0, label: '0' },
    { h: DIM.LEG, label: formatMm(DIM.LEG), minor: true },
    { h: worktop, label: formatMm(worktop) },
    { h: DIM.UPPER_BOTTOM, label: formatMm(DIM.UPPER_BOTTOM) },
    { h: DIM.UPPER_BOTTOM + DIM.UPPER_H, label: formatMm(DIM.UPPER_BOTTOM + DIM.UPPER_H) },
  ];
}

/* ------------------------------------------------------------------ */
/* Отваряне на вратите                                                 */
/* ------------------------------------------------------------------ */

export interface Swing {
  /** Пунктирен триъгълник: връх сочи към пантите. */
  points: string;
  side: HingeSide;
}

/**
 * Триъгълник на отваряне в границите на една фасада.
 * Основата е при дръжката, върхът — при пантите.
 */
export function swingTriangle(
  x: number,
  y: number,
  width: number,
  height: number,
  side: HingeSide,
): Swing {
  const hingeX = side === 'left' ? x : x + width;
  const handleX = side === 'left' ? x + width : x;
  const midY = y + height / 2;
  return {
    points: `${handleX},${y} ${hingeX},${midY} ${handleX},${y + height}`,
    side,
  };
}

export interface FacadeRect {
  x: number;
  y: number;
  width: number;
  height: number;
  swing?: Swing;
}

/**
 * Лицата в координатите на чертежа. Разположението им идва от
 * `facadePanels`, за да съвпада с обемния изглед — тук се прибавя само
 * дъгата на отваряне, която е нещо чертежно.
 */
export function facadeRects(view: ViewBox, m: PlacedModule): FacadeRect[] {
  const g = moduleGeometry(m.kind);
  const top = toSvgY(view, g.y + g.height);

  return facadePanels(m).map((panel) => {
    const x = m.x + panel.dx;
    // Местното `dy` е от долния ръб нагоре; чертежът брои отгоре надолу.
    const y = top + (g.height - panel.dy - panel.height);
    return {
      x,
      y,
      width: panel.width,
      height: panel.height,
      swing: panel.hinge
        ? swingTriangle(x, y, panel.width, panel.height, panel.hinge)
        : undefined,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Преподреждане с влачене                                             */
/* ------------------------------------------------------------------ */

/** Границата между двата реда — по средата между горния ръб на долния
 * корпус и долния ръб на горния. */
export const ROW_SPLIT = (DIM.LEG + DIM.BASE_H + DIM.UPPER_BOTTOM) / 2;

/** В кой ред попада дадена височина над пода. */
export function rowAtHeight(heightAboveFloor: number): RowId {
  return heightAboveFloor >= ROW_SPLIT ? 'upper' : 'base';
}

/**
 * Къде да влезе влаченият модул в реда си.
 *
 * За всяка възможна позиция се пресмята къде би застанал левият му ръб и
 * се избира най-близката. Сравняването по центрове не върши работа, защото
 * при различни ширини крайните позиции стават недостижими.
 */
export function dropIndex(
  row: PlacedModule[],
  draggedId: string,
  draggedLeft: number,
): number {
  const others = row.filter((m) => m.id !== draggedId);
  if (!others.length) return 0;

  const rowStart = Math.min(...row.map((m) => m.x));
  let best = 0;
  let bestDistance = Infinity;
  let slot = rowStart;

  for (let i = 0; i <= others.length; i += 1) {
    const distance = Math.abs(slot - draggedLeft);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
    if (i < others.length) slot += others[i].width;
  }
  return best;
}

/**
 * Къде да влезе нов модул, довлечен от палитрата.
 *
 * Същата сметка като при преподреждане, само че нищо не се маха от
 * реда — новият още го няма в него.
 */
export function insertIndexAt(row: PlacedModule[], left: number): number {
  return dropIndex(row, '', left);
}

/* ------------------------------------------------------------------ */
/* Отвори в стената                                                     */
/* ------------------------------------------------------------------ */

export interface OpeningBox {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: OpeningKind;
  /** Надпис в средата на отвора: „Врата 900". */
  label: string;
  /** Горният ръб на парапета, когато има такъв. */
  sillY: number | null;
}

/** Отворът, нарисуван по фронталния изглед. */
export function openingBox(view: ViewBox, o: WallOpening): OpeningBox {
  return {
    x: o.x,
    y: toSvgY(view, o.bottom + o.height),
    width: o.width,
    height: o.height,
    kind: o.kind,
    label: `${OPENING_KIND_LABEL[o.kind]} ${formatMm(o.width)}`,
    sillY: o.bottom > 0 ? toSvgY(view, o.bottom) : null,
  };
}

/* ------------------------------------------------------------------ */
/* Щриховка                                                            */
/* ------------------------------------------------------------------ */

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Диагонални линии под 45°, отрязани в правоъгълника.
 *
 * В браузъра щриховката е SVG pattern, но PDF рендерът не поддържа
 * patterns — там линиите трябва да са изрично изчислени.
 */
export function hatchLines(
  x: number,
  y: number,
  width: number,
  height: number,
  spacing: number,
): Segment[] {
  if (width <= 0 || height <= 0 || spacing <= 0) return [];

  const out: Segment[] = [];
  for (let t = -height; t <= width; t += spacing) {
    const px = x + t;
    // Точките по линията са (px + s, y + height − s)
    const sMin = Math.max(0, x - px);
    const sMax = Math.min(height, x + width - px);
    if (sMin >= sMax) continue;
    out.push({
      x1: px + sMin,
      y1: y + height - sMin,
      x2: px + sMax,
      y2: y + height - sMax,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Мащаб на текста                                                     */
/* ------------------------------------------------------------------ */

/**
 * Таван на шрифта в милиметри. Полетата около чертежа са фиксирани в мм,
 * а шрифтът расте, когато чертежът се рисува тесен — без таван последният
 * размер изпада извън рамката.
 */
export const MAX_FONT_MM = 75;

/**
 * Големина на шрифта в мм, така че на екрана да излезе ~`px` пиксела.
 * Така размерите остават четими и на телефон.
 */
export function fontSizeMm(view: ViewBox, renderedWidthPx: number, px: number): number {
  const mmPerPx = renderedWidthPx ? view.width / renderedWidthPx : 4;
  return Math.min(MAX_FONT_MM, px * mmPerPx);
}
