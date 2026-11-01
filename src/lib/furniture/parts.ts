/**
 * Детайли, материали и сметките върху тях — общата част за всяка
 * корпусна система (кухня, гардероб, ТВ композиция).
 *
 * Тук няма нищо кухненско: нито размер на шкаф, нито плот. Системата
 * подава готови детайли, а този файл ги номерира, обединява и смята
 * колко плоча и кант излизат.
 *
 * Всички размери са в милиметри.
 */

export type SheetMaterial = 'pdch18' | 'pdch16' | 'hdf3';
export type PartMaterial = SheetMaterial | 'facade';

export const MATERIAL_LABEL: Record<PartMaterial, string> = {
  pdch18: 'ПДЧ 18',
  pdch16: 'ПДЧ 16',
  hdf3: 'HDF 3',
  facade: 'Фасада',
};

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

/** Номериран детайл, какъвто отива в разбивката за цеха. */
export interface Part<Kind extends string = string> {
  /** Напр. Д2-03 */
  no: string;
  /** Код на шкафа, напр. Д2 */
  cabinet: string;
  cabinetKind: Kind;
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

/** Плочата, от която се реже, и фирата при разкрой. */
export interface SheetSpec {
  length: number;
  width: number;
  /** Дял фира, 0.15 = 15% */
  waste: number;
}

/** Закръгля до 0.5 мм, за да не се трупат дълги дроби от /2. */
export function mm(value: number): number {
  return Math.round(value * 2) / 2;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function edgeLength(p: Pick<Part, 'edgeThickness' | 'edgeL' | 'edgeW' | 'length' | 'width' | 'qty'>) {
  if (!p.edgeThickness) return 0;
  return (p.edgeL * p.length + p.edgeW * p.width) * p.qty;
}

/** Номерира детайлите на един шкаф: `<код>-<NN>`, например Д2-03. */
export function numberParts<Kind extends string>(
  code: string,
  kind: Kind,
  raw: RawPart[],
): Part<Kind>[] {
  let n = 0;
  return raw.map((p) => {
    const qty = p.qty ?? 1;
    const part: Part<Kind> = {
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

/** Обединява еднаквите детайли и изрежда номерата им. */
export function mergeParts(parts: Part[]): MergedPart[] {
  const map = new Map<string, MergedPart>();
  for (const p of parts) {
    const key = [
      p.name,
      p.material,
      p.length,
      p.width,
      p.edgeL,
      p.edgeW,
      p.edgeThickness,
      p.note ?? '',
    ].join('|');
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

/** Площ по материал, с фира, и колко плочи излизат. */
export function materialUsage(parts: Part[], sheet: SheetSpec): MaterialUsage[] {
  const sheetAreaM2 = (sheet.length / 1000) * (sheet.width / 1000);
  const areaByMaterial = new Map<SheetMaterial, number>();

  for (const p of parts) {
    if (p.material === 'facade') continue;
    const areaM2 = (p.length * p.width * p.qty) / 1_000_000;
    areaByMaterial.set(p.material, (areaByMaterial.get(p.material) ?? 0) + areaM2);
  }

  const order: SheetMaterial[] = ['pdch18', 'pdch16', 'hdf3'];
  return order
    .filter((m) => areaByMaterial.has(m))
    .map((m) => {
      const areaM2 = areaByMaterial.get(m) ?? 0;
      const areaWithWasteM2 = areaM2 * (1 + sheet.waste);
      return {
        material: m,
        areaM2: round2(areaM2),
        areaWithWasteM2: round2(areaWithWasteM2),
        sheets: Math.ceil(areaWithWasteM2 / sheetAreaM2),
      };
    });
}

/** Метри кант по дебелина. Надписът идва от системата. */
export function edgeUsage(parts: Part[], label: (thickness: number) => string): EdgeUsage[] {
  const byThickness = new Map<number, number>();
  for (const p of parts) {
    if (!p.edgeThickness || !p.edgeMm) continue;
    byThickness.set(p.edgeThickness, (byThickness.get(p.edgeThickness) ?? 0) + p.edgeMm);
  }
  return [...byThickness.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([thickness, totalMm]) => ({
      thickness,
      label: label(thickness),
      meters: round2(totalMm / 1000),
    }));
}

/** Площта на фасадите (лице) — за боядисване. */
export function facadeArea(parts: Part[]): number {
  let area = 0;
  for (const p of parts) {
    if (p.material !== 'facade') continue;
    area += (p.length * p.width * p.qty) / 1_000_000;
  }
  return round2(area);
}
