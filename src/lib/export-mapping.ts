/**
 * export-mapping.ts — форматът на файла за цеха.
 *
 * Точният формат на Прокът е отворен въпрос (SPEC 5.4), затова колоните са
 * описани тук, на едно място. Пренастройването е смяна на този масив:
 * ред, заглавия и стойности. Самият експорт не се променя.
 */

import {
  MATERIAL_LABEL,
  type KitchenResult,
  type MergedPart,
  type Part,
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

export interface ExportColumn {
  key: keyof ExportRow;
  header: string;
  /** Как стойността влиза в CSV / XLSX клетка. */
  format?: (row: ExportRow) => string | number;
}

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

export type ExportView = 'cabinet' | 'material';

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

export function toCsv(
  rows: ExportRow[],
  columns: ExportColumn[] = EXPORT_COLUMNS,
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

/** Име на файла: korpus-razkroi-po-material-2026-11-01.csv */
export function exportFileName(view: ExportView, ext: string, date = new Date()): string {
  const iso = date.toISOString().slice(0, 10);
  const suffix = view === 'material' ? 'po-material' : 'po-shkafove';
  return `korpus-razkroi-${suffix}-${iso}.${ext}`;
}
