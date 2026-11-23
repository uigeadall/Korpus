/**
 * Ориентировъчната цена — от разбивката, не от налучкване.
 *
 * Правилата вече знаят колко плочи, кант, фасада, плот и обков влизат в
 * проекта: от същото се реже в цеха. Тук всяко от тях се умножава по
 * единичната си цена. Така цената се движи заедно с проекта — още един
 * шкаф, по-скъп плот, чекмеджета вместо врати — и никога не е число,
 * извадено отнякъде.
 *
 * Резултатът е диапазон „от–до", не точна сума: мерките още не са
 * взети на място, а единичните цени още не са потвърдени.
 */

import { FACADE_LABEL, type Kitchen, type KitchenResult, WORKTOP_LABEL } from './cabinet-rules';
import { MATERIAL_LABEL } from './furniture/parts';
import { PRICES, type PriceTable } from '@/config/prices';

export interface PriceLine {
  /** Група — за подреждането в разбивката. */
  group: 'Материали' | 'Фасади' | 'Плот' | 'Обков' | 'Изработка';
  label: string;
  qty: number;
  unit: 'бр.' | 'м' | 'м²' | 'компл.' | 'плочи' | 'шкафа' | 'проект';
  unitPrice: number;
  total: number;
}

export interface Estimate {
  lines: PriceLine[];
  /** Точната сума на редовете. */
  total: number;
  /** Диапазонът, който се показва на клиента. */
  low: number;
  high: number;
  /** Обков, за който няма цена — да се види, а не да се пропусне тихо. */
  unpriced: string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Реално изработени шкафове — нишите и празните места не се броят. */
function madeCabinets(result: KitchenResult): number {
  return result.cabinets.filter((c) => c.parts.length > 0).length;
}

export function estimatePrice(
  kitchen: Kitchen,
  result: KitchenResult,
  prices: PriceTable = PRICES,
): Estimate {
  const lines: PriceLine[] = [];
  const unpriced: string[] = [];
  const add = (line: Omit<PriceLine, 'total'>) => {
    if (line.qty <= 0) return;
    lines.push({ ...line, qty: round2(line.qty), total: round2(line.qty * line.unitPrice) });
  };

  const cabinets = madeCabinets(result);
  // Празна стая не струва нищо — дори доставката няма какво да кара.
  if (cabinets === 0) return { lines: [], total: 0, low: 0, high: 0, unpriced: [] };

  const s = result.summary;

  for (const m of s.materials) {
    add({
      group: 'Материали',
      label: MATERIAL_LABEL[m.material],
      qty: m.sheets,
      unit: 'плочи',
      unitPrice: prices.sheet[m.material],
    });
  }

  for (const e of s.edges) {
    add({
      group: 'Материали',
      label: e.label,
      qty: e.meters,
      unit: 'м',
      unitPrice: prices.edgeM[String(e.thickness)] ?? prices.edgeOther,
    });
  }

  const facade = kitchen.materials.facade.type;
  add({
    group: 'Фасади',
    label: `Фасади — ${FACADE_LABEL[facade]}`,
    qty: s.paintAreaM2,
    unit: 'м²',
    unitPrice: prices.facadeM2[facade],
  });

  const worktop = kitchen.materials.worktop;
  add({
    group: 'Плот',
    label: `Плот — ${WORKTOP_LABEL[worktop]}`,
    qty: s.worktopLength / 1000,
    unit: 'м',
    unitPrice: prices.worktopM[worktop],
  });

  for (const h of result.hardware) {
    // Плотът е сметнат по-горе с вида си; тук би излязъл втори път.
    if (h.name === 'Плот') continue;
    if (h.name === 'Механизъм за чекмедже') {
      add({
        group: 'Обков',
        label: h.name,
        qty: h.qty,
        unit: 'компл.',
        unitPrice: prices.drawerSet[kitchen.materials.drawers],
      });
      continue;
    }
    const price = prices.hardware[h.name];
    if (price === undefined) {
      unpriced.push(h.name);
      continue;
    }
    add({
      group: 'Обков',
      label: h.name,
      qty: h.unit === 'мм' ? h.qty / 1000 : h.qty,
      unit: h.unit === 'мм' ? 'м' : h.unit === 'компл.' ? 'компл.' : 'бр.',
      unitPrice: price,
    });
  }

  add({ group: 'Изработка', label: 'Изработка', qty: cabinets, unit: 'шкафа', unitPrice: prices.makePerCabinet });
  add({ group: 'Изработка', label: 'Монтаж', qty: cabinets, unit: 'шкафа', unitPrice: prices.fitPerCabinet });
  add({ group: 'Изработка', label: 'Доставка', qty: 1, unit: 'проект', unitPrice: prices.delivery });

  const total = round2(lines.reduce((sum, l) => sum + l.total, 0));
  const r = prices.roundTo;
  return {
    lines,
    total,
    low: Math.floor((total * (1 - prices.spread)) / r) * r,
    high: Math.ceil((total * (1 + prices.spread)) / r) * r,
    unpriced,
  };
}

/** „3 240" — с тесен интервал между хилядите, както се пише у нас. */
export function formatMoney(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

