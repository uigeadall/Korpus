/**
 * export-mapping.ts — форматът на файла за цеха.
 *
 * Точният формат на Прокът е отворен въпрос (SPEC 5.4), затова колоните са
 * описани тук, на едно място. Пренастройването е смяна на този масив:
 * ред, заглавия и стойности. Самият експорт не се променя.
 */

import {
  type CabinetResult,
  DRAWER_SYSTEM_LABEL,
  MATERIAL_LABEL,
  MODULES,
  type KitchenResult,
  type Materials,
  type MergedPart,
  OPENING_LABEL,
  type Part,
  facadeParts,
  hingeCount,
  moduleGeometry,
} from './cabinet-rules';
import { formatMm } from './drawing';

export interface ExportRow {
  /** Номер на детайла или номерата на обединените */
  no: string;
  cabinet: string;
  part: string;
  material: string;
  length: number;
  width: number;
  qty: number;
  /** Брой кантирани страни по дължината */
  edgeL: number;
  /** Брой кантирани страни по ширината */
  edgeW: number;
  /** Обща дължина кант, мм */
  edgeMm: number;
  note: string;
}

export interface Column<T> {
  key: keyof T;
  header: string;
  /** Как стойността влиза в CSV / XLSX клетка. */
  format?: (row: T) => string | number;
}

export type ExportColumn = Column<ExportRow>;

/** Колони по SPEC 5.4. Разменете редовете тук, ако цехът иска друг ред. */
export const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'no', header: '№' },
  { key: 'cabinet', header: 'Шкаф' },
  { key: 'part', header: 'Детайл' },
  { key: 'material', header: 'Материал' },
  { key: 'length', header: 'Дължина', format: (r) => formatMm(r.length) },
  { key: 'width', header: 'Ширина', format: (r) => formatMm(r.width) },
  { key: 'qty', header: 'Брой' },
  { key: 'edgeL', header: 'Кант Д' },
  { key: 'edgeW', header: 'Кант Ш' },
  { key: 'edgeMm', header: 'Кант мм', format: (r) => formatMm(r.edgeMm) },
  { key: 'note', header: 'Бележка' },
];

export type ExportView = 'cabinet' | 'material' | 'cabinets';

function rowFromPart(p: Part): ExportRow {
  return {
    no: p.no,
    cabinet: p.cabinet,
    part: p.name,
    material: MATERIAL_LABEL[p.material],
    length: p.length,
    width: p.width,
    qty: p.qty,
    edgeL: p.edgeL,
    edgeW: p.edgeW,
    edgeMm: p.edgeMm,
    note: p.note ?? '',
  };
}

function rowFromMerged(p: MergedPart): ExportRow {
  return {
    no: p.numbers.join(', '),
    cabinet: '—',
    part: p.name,
    material: MATERIAL_LABEL[p.material],
    length: p.length,
    width: p.width,
    qty: p.qty,
    edgeL: p.edgeL,
    edgeW: p.edgeW,
    edgeMm: p.edgeMm,
    note: p.note ?? '',
  };
}

/**
 * Двата изгледа: по шкафове (за монтажа) и по материал (за разкроя,
 * с обединени еднакви детайли).
 */
export function toExportRows(result: KitchenResult, view: ExportView): ExportRow[] {
  if (view === 'material') return result.byMaterial.map(rowFromMerged);
  return result.cabinets.flatMap((c) => c.parts.map(rowFromPart));
}

/* ------------------------------------------------------------------ */
/* Заявка по шкафове                                                   */
/* ------------------------------------------------------------------ */

/**
 * Обобщение на ниво шкаф — това, което външният цех иска, за да разкрои и
 * пробие детайлите за домашен монтаж: габарит, брой рафтове, брой чела,
 * начин на отваряне и какви механизми се ползват.
 */
export interface CabinetSummaryRow {
  cabinet: string;
  type: string;
  carcass: string;
  width: number;
  height: number;
  depth: number;
  shelves: number;
  fronts: number;
  opening: string;
  mechanisms: string;
  note: string;
}

export const CABINET_COLUMNS: Column<CabinetSummaryRow>[] = [
  { key: 'cabinet', header: 'Шкаф' },
  { key: 'type', header: 'Тип' },
  { key: 'carcass', header: 'Корпус' },
  { key: 'width', header: 'Ширина', format: (r) => formatMm(r.width) },
  { key: 'height', header: 'Височина', format: (r) => formatMm(r.height) },
  { key: 'depth', header: 'Дълбочина', format: (r) => formatMm(r.depth) },
  { key: 'shelves', header: 'Рафтове' },
  { key: 'fronts', header: 'Чела' },
  { key: 'opening', header: 'Отваряне' },
  { key: 'mechanisms', header: 'Механизми' },
  { key: 'note', header: 'Бележка' },
];

function mechanismsFor(cabinet: CabinetResult, materials: Materials): string {
  const facades = facadeParts(
    { id: cabinet.code, kind: cabinet.kind, width: cabinet.width },
    materials,
  );

  const out: string[] = [];
  const hinges = facades
    .filter((f) => f.name.startsWith('Врата'))
    .reduce((sum, f) => sum + hingeCount(f.length) * (f.qty ?? 1), 0);
  if (hinges) out.push(`${hinges} панти`);

  if (cabinet.kind === 'drawers') out.push(`3 × ${DRAWER_SYSTEM_LABEL[materials.drawers]}`);
  if (facades.some((f) => f.name === 'Клапа')) out.push('подемен механизъм');

  return out.join(', ');
}

export function toCabinetRows(result: KitchenResult, materials: Materials): CabinetSummaryRow[] {
  return result.cabinets.map((c) => {
    const g = moduleGeometry(c.kind);
    const shelves = c.parts
      .filter((p) => p.name.toLowerCase().includes('рафт'))
      .reduce((s, p) => s + p.qty, 0);
    const fronts = c.parts
      .filter((p) => p.material === 'facade')
      .reduce((s, p) => s + p.qty, 0);

    const notes: string[] = [];
    if (!MODULES[c.kind].hasCarcass) notes.push('само фасада, без корпус');
    if (c.kind === 'oven') notes.push(`ниша за фурна ${formatMm(595)}`);
    if (c.kind === 'hood') notes.push('дъно с изрез по аспиратора');
    if (c.kind === 'sink' || c.kind === 'oven') notes.push('без гръб');

    return {
      cabinet: c.code,
      type: c.label,
      carcass: MODULES[c.kind].hasCarcass ? `ПДЧ 18, ${materials.carcassColor}` : '—',
      width: c.width,
      height: g.height,
      depth: g.depth,
      shelves,
      fronts,
      opening: OPENING_LABEL[materials.opening],
      mechanisms: mechanismsFor(c, materials),
      note: notes.join('; '),
    };
  });
}

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

export interface CsvOptions {
  /** Разделител. Excel на български очаква „;". */
  delimiter?: string;
  /** BOM, за да отвори Excel кирилицата правилно. */
  bom?: boolean;
}

function csvCell(value: string | number, delimiter: string): string {
  const s = typeof value === 'number' ? String(value) : value;
  if (s.includes(delimiter) || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv<T>(
  rows: T[],
  columns: Column<T>[],
  { delimiter = ';', bom = true }: CsvOptions = {},
): string {
  const head = columns.map((c) => csvCell(c.header, delimiter)).join(delimiter);
  const body = rows.map((r) =>
    columns
      .map((c) => csvCell(c.format ? c.format(r) : (r[c.key] as string | number), delimiter))
      .join(delimiter),
  );
  return (bom ? '﻿' : '') + [head, ...body].join('\r\n') + '\r\n';
}

/** Цялата книга за цеха: korpus-specifikaciya-2026-11-01.xlsx */
export function workbookFileName(date = new Date()): string {
  return `korpus-specifikaciya-${date.toISOString().slice(0, 10)}.xlsx`;
}

/** Един изглед: korpus-razkroi-po-material-2026-11-01.csv */
export function exportFileName(view: ExportView, ext: string, date = new Date()): string {
  const iso = date.toISOString().slice(0, 10);
  const suffix =
    view === 'material' ? 'po-material' : view === 'cabinets' ? 'zayavka-shkafove' : 'po-shkafove';
  return `korpus-razkroi-${suffix}-${iso}.${ext}`;
}
