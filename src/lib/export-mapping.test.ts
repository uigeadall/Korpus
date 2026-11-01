import { describe, expect, it } from 'vitest';
import { DEFAULT_MATERIALS, type Kitchen, computeKitchen } from './cabinet-rules';
import { EXPORT_COLUMNS, exportFileName, toCsv, toExportRows } from './export-mapping';

function kitchen(): Kitchen {
  return {
    walls: [
      {
        length: 1800,
        base: [
          { id: 'a', kind: 'drawers', width: 600 },
          { id: 'b', kind: 'door', width: 600 },
        ],
        upper: [{ id: 'c', kind: 'upper', width: 600 }],
      },
    ],
    materials: { ...DEFAULT_MATERIALS },
    rulesVersion: '1.0.0',
  };
}

const result = computeKitchen(kitchen());

describe('колони за цеха', () => {
  it('са в реда от спецификацията', () => {
    expect(EXPORT_COLUMNS.map((c) => c.header)).toEqual([
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
});

describe('изглед по шкафове', () => {
  const rows = toExportRows(result, 'cabinet');

  it('всеки детайл е отделен ред с номера си', () => {
    expect(rows[0].no).toBe('Д1-01');
    expect(rows[0].cabinet).toBe('Д1');
  });

  it('броят редове е броят детайли', () => {
    expect(rows).toHaveLength(result.parts.length);
  });
});

describe('изглед по материал', () => {
  const rows = toExportRows(result, 'material');

  it('обединява еднаквите и изрежда номерата', () => {
    const sides = rows.find((r) => r.part === 'Страница' && r.length === 702)!;
    expect(sides.qty).toBe(4);
    expect(sides.no).toBe('Д1-01, Д2-01');
  });

  it('редовете са по-малко от детайлите', () => {
    expect(rows.length).toBeLessThan(result.parts.length);
  });
});

describe('CSV', () => {
  const csv = toCsv(toExportRows(result, 'material'));

  it('започва с BOM и заглавния ред', () => {
    expect(csv.startsWith('﻿№;Шкаф;Детайл')).toBe(true);
  });

  it('редовете са с CRLF', () => {
    expect(csv.split('\r\n').length).toBeGreaterThan(2);
  });

  it('десетичните са с запетая и не чупят разделителя', () => {
    const rows = toCsv(
      [
        {
          no: 'Г1-01',
          cabinet: 'Г1',
          part: 'Врата',
          material: 'Фасада',
          length: 716,
          width: 396.5,
          qty: 2,
          edgeL: 0,
          edgeW: 0,
          edgeMm: 0,
          note: 'панти вляво, 2 панти',
        },
      ],
      EXPORT_COLUMNS,
      { bom: false },
    );
    const line = rows.split('\r\n')[1];
    expect(line).toContain(';396,5;');
    expect(line.split(';')).toHaveLength(EXPORT_COLUMNS.length);
  });

  it('екранира полета с разделител в текста', () => {
    const csv2 = toCsv(
      [
        {
          no: '1',
          cabinet: 'Д1',
          part: 'Гръб',
          material: 'HDF 3',
          length: 1,
          width: 1,
          qty: 1,
          edgeL: 0,
          edgeW: 0,
          edgeMm: 0,
          note: 'бележка; с разделител',
        },
      ],
      EXPORT_COLUMNS,
      { bom: false },
    );
    expect(csv2).toContain('"бележка; с разделител"');
  });
});

describe('име на файла', () => {
  it('съдържа изгледа и датата', () => {
    const name = exportFileName('material', 'csv', new Date('2026-11-01T10:00:00Z'));
    expect(name).toBe('korpus-razkroi-po-material-2026-11-01.csv');
    expect(exportFileName('cabinet', 'xlsx', new Date('2026-11-01T10:00:00Z'))).toBe(
      'korpus-razkroi-po-shkafove-2026-11-01.xlsx',
    );
  });
});
