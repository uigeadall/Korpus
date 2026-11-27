/**
 * xlsx.ts — работната книга за цеха.
 *
 * Прави се на сървъра: файлът винаги излиза сметнат с правилата на сайта,
 * а браузърът не носи библиотеката. Колоните идват от `export-mapping`,
 * за да има един източник за CSV и за XLSX.
 */

import ExcelJS from 'exceljs';
import {
  MATERIAL_LABEL,
  type KitchenResult,
  type Materials,
  WORKTOP_LABEL,
  FACADE_LABEL,
  OPENING_LABEL,
  DIM,
} from './cabinet-rules';
import { formatMm } from './drawing';
import { roomName } from './flat';
import type { FlatBreakdown } from './flat-export';
import {
  CABINET_COLUMNS,
  type Column,
  EXPORT_COLUMNS,
  FLAT_CABINET_COLUMNS,
  FLAT_EXPORT_COLUMNS,
  FLAT_LEGEND_COLUMNS,
  toCabinetRows,
  toExportRows,
  toFlatCabinetRows,
  toFlatExportRows,
  toFlatLegendRows,
} from './export-mapping';

const ACCENT = 'FF1C5873';
const STONE = 'FFEFEDE8';

function header(sheet: ExcelJS.Worksheet, headers: string[]): void {
  const row = sheet.addRow(headers);
  row.font = { bold: true, size: 10 };
  row.alignment = { vertical: 'middle' };
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STONE } };
    cell.border = { bottom: { style: 'thin', color: { argb: ACCENT } } };
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

/** Ширина на колоната по най-дългата стойност в нея. */
function autoWidth(sheet: ExcelJS.Worksheet): void {
  sheet.columns.forEach((column) => {
    let longest = 8;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      longest = Math.max(longest, String(cell.value ?? '').length + 2);
    });
    column.width = Math.min(48, longest);
  });
}

function addTable<T>(
  book: ExcelJS.Workbook,
  name: string,
  columns: Column<T>[],
  rows: T[],
): void {
  const sheet = book.addWorksheet(name);
  header(
    sheet,
    columns.map((c) => c.header),
  );
  for (const row of rows) {
    sheet.addRow(
      columns.map((c) => (c.format ? c.format(row) : (row[c.key] as string | number))),
    );
  }
  autoWidth(sheet);
}

function addSummary(book: ExcelJS.Workbook, result: KitchenResult, materials: Materials): void {
  const sheet = book.addWorksheet('Обобщение');
  const s = result.summary;

  const title = sheet.addRow(['Спецификация за производство']);
  title.font = { bold: true, size: 13 };
  sheet.addRow([]);

  const pair = (label: string, value: string | number) => {
    const row = sheet.addRow([label, value]);
    row.getCell(1).font = { color: { argb: 'FF6B6E74' } };
  };

  pair('Версия на правилата', result.rulesVersion);
  pair('Шкафове', s.cabinets);
  pair('Детайли', s.partPieces);
  pair('Височина до плота, мм', formatMm(s.worktopHeight));
  pair('Дължина на плота, мм', formatMm(s.worktopLength));
  pair('Дълбочина на плота, мм', formatMm(s.worktopDepth));
  pair('Цокъл, мм', formatMm(s.plinthLength));
  sheet.addRow([]);

  pair('Корпус', `ПДЧ ${DIM.T}, ${materials.carcassColor}`);
  pair('Фасади', `${FACADE_LABEL[materials.facade.type]}, ${materials.facade.color}`);
  pair('Плот', WORKTOP_LABEL[materials.worktop]);
  sheet.addRow([]);

  const matHead = sheet.addRow([
    'Материал',
    'Площ м²',
    `С ${DIM.SHEET_WASTE * 100}% фира м²`,
    `Плочи ${DIM.SHEET_L}×${DIM.SHEET_W}`,
  ]);
  matHead.font = { bold: true, size: 10 };
  for (const m of s.materials) {
    sheet.addRow([MATERIAL_LABEL[m.material], m.areaM2, m.areaWithWasteM2, m.sheets]);
  }
  sheet.addRow([]);

  const edgeHead = sheet.addRow(['Кант', 'Метри']);
  edgeHead.font = { bold: true, size: 10 };
  for (const e of s.edges) sheet.addRow([e.label, e.meters]);
  sheet.addRow([]);

  const hwHead = sheet.addRow(['Обков', 'Количество', 'Мярка', 'Бележка']);
  hwHead.font = { bold: true, size: 10 };
  for (const h of result.hardware) {
    sheet.addRow([h.name, h.qty, h.unit, h.note ?? '']);
  }
  sheet.addRow([]);

  const note = sheet.addRow([
    'Това не е оферта. Точната цена следва след измерване на място.',
  ]);
  note.font = { italic: true, color: { argb: 'FF6B6E74' }, size: 10 };

  autoWidth(sheet);
}

/** Цялата книга: обобщение + трите изгледа. */
export async function kitchenWorkbook(
  result: KitchenResult,
  materials: Materials,
): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  book.creator = 'Корпус';
  book.created = new Date();

  addSummary(book, result, materials);
  addTable(book, 'По шкафове', EXPORT_COLUMNS, toExportRows(result, 'cabinet'));
  addTable(book, 'По материал', EXPORT_COLUMNS, toExportRows(result, 'material'));
  addTable(book, 'Заявка за шкафове', CABINET_COLUMNS, toCabinetRows(result, materials));

  const data = await book.xlsx.writeBuffer();
  return Buffer.from(data);
}

/* ------------------------------------------------------------------ */
/* Цялото жилище                                                       */
/* ------------------------------------------------------------------ */

function addFlatSummary(book: ExcelJS.Workbook, flat: FlatBreakdown): void {
  const sheet = book.addWorksheet('Обобщение');
  const s = flat.summary;

  const title = sheet.addRow(['Спецификация за производство — цяло жилище']);
  title.font = { bold: true, size: 13 };
  sheet.addRow([]);

  const pair = (label: string, value: string | number) => {
    const row = sheet.addRow([label, value]);
    row.getCell(1).font = { color: { argb: 'FF6B6E74' } };
  };

  pair('Версия на правилата', flat.rooms[0]?.result.rulesVersion ?? '—');
  pair('Стаи', s.rooms);
  pair('Шкафове', s.cabinets);
  pair('Детайли', s.partPieces);
  pair('Дължина на плота, мм', formatMm(s.worktopLength));
  pair('Цокъл, мм', formatMm(s.plinthLength));
  sheet.addRow([]);

  /*
   * Стаите, с материалите на всяка. Две стаи в едно жилище могат да
   * имат различни фасади и различни чекмеджета — затова не се пише
   * един ред „Материали" за цялото, а по ред на стая.
   */
  const roomHead = sheet.addRow(['Стая', 'Шкафове', 'Детайли', 'Корпус', 'Фасади', 'Отваряне']);
  roomHead.font = { bold: true, size: 10 };
  for (const r of flat.rooms) {
    const m = r.kitchen.materials;
    sheet.addRow([
      roomName(r.room),
      r.cabinets.length,
      r.result.summary.partPieces,
      `ПДЧ ${DIM.T}, ${m.carcassColor}`,
      `${FACADE_LABEL[m.facade.type]}, ${m.facade.color}`,
      OPENING_LABEL[m.opening],
    ]);
  }
  sheet.addRow([]);

  const matHead = sheet.addRow([
    'Материал',
    'Площ м²',
    `С ${DIM.SHEET_WASTE * 100}% фира м²`,
    `Плочи ${DIM.SHEET_L}×${DIM.SHEET_W}`,
  ]);
  matHead.font = { bold: true, size: 10 };
  for (const m of s.materials) {
    sheet.addRow([MATERIAL_LABEL[m.material], m.areaM2, m.areaWithWasteM2, m.sheets]);
  }

  /*
   * Печалбата от общия разкрой. Казва се като сметка, не като обещание:
   * недорязаните плочи на шест стаи стават едно парче, когато всичко
   * се реже наведнъж.
   */
  const sheets = s.materials.reduce((sum, m) => sum + m.sheets, 0);
  if (s.sheetsIfSeparate > sheets) {
    const saved = sheet.addRow([
      `Общ разкрой: ${sheets} плочи вместо ${s.sheetsIfSeparate} при рязане стая по стая.`,
    ]);
    saved.font = { italic: true, color: { argb: 'FF6B6E74' }, size: 10 };
  }
  sheet.addRow([]);

  const edgeHead = sheet.addRow(['Кант', 'Метри']);
  edgeHead.font = { bold: true, size: 10 };
  for (const e of s.edges) sheet.addRow([e.label, e.meters]);
  sheet.addRow([]);

  const hwHead = sheet.addRow(['Обков', 'Количество', 'Мярка', 'Бележка']);
  hwHead.font = { bold: true, size: 10 };
  for (const h of flat.hardware) sheet.addRow([h.name, h.qty, h.unit, h.note ?? '']);
  sheet.addRow([]);

  /*
   * Нечетимите стаи не се премълчават. Цехът трябва да види, че му е
   * дадена непълна поръчка — иначе ще я изпълни и ще я сметне за цяла.
   */
  if (flat.broken.length) {
    const warn = sheet.addRow([
      `ВНИМАНИЕ: ${flat.broken.length} ${
        flat.broken.length === 1 ? 'стая не се разчете' : 'стаи не се разчетоха'
      } и ЛИПСВАТ от този списък: ${flat.broken.map((r) => roomName(r)).join(', ')}.`,
    ]);
    warn.font = { bold: true, color: { argb: 'FFB4342A' }, size: 10 };
    sheet.addRow([]);
  }

  const note = sheet.addRow([
    'Това не е оферта. Точната цена следва след измерване на място.',
  ]);
  note.font = { italic: true, color: { argb: 'FF6B6E74' }, size: 10 };

  autoWidth(sheet);
}

/**
 * Жилището в една книга.
 *
 * Листовете са четири, не шест по стая: цехът иска един разкрой и една
 * заявка. Стаята е колона, а легендата води от позиция до стая, за да
 * се намери шкафът и на екрана.
 */
export async function flatWorkbook(flat: FlatBreakdown): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  book.creator = 'Корпус';
  book.created = new Date();

  addFlatSummary(book, flat);
  addTable(book, 'По шкафове', FLAT_EXPORT_COLUMNS, toFlatExportRows(flat, 'cabinet'));
  addTable(book, 'По материал', FLAT_EXPORT_COLUMNS, toFlatExportRows(flat, 'material'));
  addTable(book, 'Заявка за шкафове', FLAT_CABINET_COLUMNS, toFlatCabinetRows(flat));
  addTable(book, 'Позиции', FLAT_LEGEND_COLUMNS, toFlatLegendRows(flat));

  const data = await book.xlsx.writeBuffer();
  return Buffer.from(data);
}
