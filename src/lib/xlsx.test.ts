import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_MATERIALS, type Kitchen, computeKitchen } from './cabinet-rules';
import { kitchenWorkbook } from './xlsx';

/** Примерната кухня от спецификацията. */
function exampleKitchen(): Kitchen {
  let n = 0;
  const m = (kind: Kitchen['walls'][0]['base'][0]['kind'], width: number) => ({
    id: `m${++n}`,
    kind,
    width,
    hingeSide: 'right' as const,
  });
  return {
    walls: [
      {
        length: 3600,
        base: [
          m('column', 600),
          m('drawers', 600),
          m('oven', 600),
          m('door', 400),
          m('sink', 800),
          m('dw', 600),
        ],
        upper: [m('upper', 600), m('hood', 600), m('upper', 400), m('upper', 800), m('upper', 600)],
      },
    ],
    materials: { ...DEFAULT_MATERIALS },
    rulesVersion: '1.0.0',
  };
}

const kitchen = exampleKitchen();
const result = computeKitchen(kitchen);

async function readBack() {
  const buffer = await kitchenWorkbook(result, kitchen.materials);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(buffer as unknown as ArrayBuffer);
  return book;
}

const cells = (sheet: ExcelJS.Worksheet, rowNumber: number): (string | number)[] => {
  const values = sheet.getRow(rowNumber).values as unknown[];
  // ExcelJS връща 1-базиран масив с дупка на индекс 0
  return values.slice(1).map((v) => (typeof v === 'number' ? v : String(v ?? '')));
};

describe('работна книга за цеха', () => {
  it('има четирите листа в очаквания ред', async () => {
    const book = await readBack();
    expect(book.worksheets.map((s) => s.name)).toEqual([
      'Обобщение',
      'По шкафове',
      'По материал',
      'Заявка за шкафове',
    ]);
  });

  it('заглавният ред на разкроя е по спецификацията', async () => {
    const book = await readBack();
    expect(cells(book.getWorksheet('По шкафове')!, 1)).toEqual([
      '№',
      'Шкаф',
      'Детайл',
      'Материал',
      'Дължина',
      'Ширина',
      'Брой',
      'Кант Д',
      'Кант Ш',
      'Кант мм',
      'Бележка',
    ]);
  });

  it('първият детайл е страница на колоната', async () => {
    const book = await readBack();
    const row = cells(book.getWorksheet('По шкафове')!, 2);
    expect(row[0]).toBe('К1-01');
    expect(row[2]).toBe('Страница');
    expect(row[4]).toBe('2030');
    expect(row[5]).toBe('560');
  });

  it('по материал има по-малко редове от по шкафове', async () => {
    const book = await readBack();
    expect(book.getWorksheet('По материал')!.rowCount).toBeLessThan(
      book.getWorksheet('По шкафове')!.rowCount,
    );
  });

  it('заявката е по един ред на шкаф', async () => {
    const book = await readBack();
    const sheet = book.getWorksheet('Заявка за шкафове')!;
    expect(sheet.rowCount - 1).toBe(result.cabinets.length);
    expect(cells(sheet, 2)[0]).toBe('К1');
  });

  it('обобщението носи версията на правилата и обкова', async () => {
    const book = await readBack();
    const sheet = book.getWorksheet('Обобщение')!;
    const flat: string[] = [];
    sheet.eachRow((row) => flat.push(cells(sheet, row.number).join('|')));
    const text = flat.join('\n');

    expect(text).toContain(result.rulesVersion);
    expect(text).toContain('Панти с плавно затваряне|22');
    expect(text).toContain('Крака|22');
    expect(text).toContain('Това не е оферта');
  });

  it('файлът е истински xlsx, не празен буфер', async () => {
    const buffer = await kitchenWorkbook(result, kitchen.materials);
    expect(buffer.length).toBeGreaterThan(5_000);
    // ZIP подпис
    expect(buffer.subarray(0, 2).toString('latin1')).toBe('PK');
  });
});
