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
  DIM,
} from './cabinet-rules';
import { formatMm } from './drawing';
import {
  CABINET_COLUMNS,
  type Column,
  EXPORT_COLUMNS,
  toCabinetRows,
  toExportRows,
} from './export-mapping';

const BRASS = 'FF9A7636';
const STONE = 'FFEFEDE8';

function header(sheet: ExcelJS.Worksheet, headers: string[]): void {
  const row = sheet.addRow(headers);
  row.font = { bold: true, size: 10 };
  row.alignment = { vertical: 'middle' };
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STONE } };
    cell.border = { bottom: { style: 'thin', color: { argb: BRASS } } };
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
