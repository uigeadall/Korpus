/**
 * Единичните цени, от които се смята ориентировъчната цена.
 *
 * ВСИЧКИ ЧИСЛА ТУК СА ПРИМЕРНИ. Не са от доставчик и не са от цеха —
 * сложени са, за да се види как работи сметката. Докато не дойдат
 * истинските, `PRICE_STATUS` е „чернова" и цената се показва с ясен
 * надпис, че е примерна, точно както правните текстове стоят като
 * чернови до преглед от юрист.
 *
 * Как се сменя:
 *   - истинските цени → тук, после `PRICE_STATUS = 'потвърдена'`;
 *   - цена да не се показва никъде → `PRICE_STATUS = 'скрита'`.
 *
 * Сумите са в евро, с ДДС.
 */

import type { FacadeType, WorktopType } from '@/lib/cabinet-rules';
import type { SheetMaterial } from '@/lib/furniture/parts';

export type PriceStatus = 'чернова' | 'потвърдена' | 'скрита';

export const PRICE_STATUS: PriceStatus = 'чернова';

export const CURRENCY = '€';

export interface PriceTable {
  /** Цяла плоча, с разкроя. */
  sheet: Record<SheetMaterial, number>;
  /** Фасада, на квадратен метър лице. */
  facadeM2: Record<FacadeType, number>;
  /** Кант, на метър, по дебелина в мм. Непозната дебелина взема `edgeOther`. */
  edgeM: Record<string, number>;
  edgeOther: number;
  /** Плот, на линеен метър. */
  worktopM: Record<WorktopType, number>;
  /**
   * Обков по името, с което излиза в разбивката. За `мм` цената е на
   * метър. Механизмът за чекмедже зависи от избраната система.
   */
  hardware: Record<string, number>;
  drawerSet: { 'metal-box': number; 'ball-bearing': number };
  /** Изработка и монтаж — на шкаф. */
  makePerCabinet: number;
  fitPerCabinet: number;
  /** Доставка до адреса — веднъж на проект с мебел. */
  delivery: number;
  /**
   * Колко широк е диапазонът около сметката, в дял. Цената е
   * ориентировъчна — точната идва след измерване.
   */
  spread: number;
  /** До колко се закръглят краищата на диапазона. */
  roundTo: number;
}

export const PRICES: PriceTable = {
  sheet: { pdch18: 58, pdch16: 48, hdf3: 19 },
  facadeM2: { 'mdf-painted': 125, 'mdf-milled': 155, 'pdch-decor': 48 },
  edgeM: { '0.8': 0.7, '2': 1.4 },
  edgeOther: 1.2,
  worktopM: { laminate38: 65, quartz20: 330, sintered12: 390, granite30: 290 },
  hardware: {
    'Панти с плавно затваряне': 6,
    'Подемен механизъм': 65,
    Крака: 1.6,
    Окачвачи: 4,
    Цокъл: 9,
    Дръжки: 8,
    'Push-to-open': 9,
    'Алуминиев L-профил': 18,
    'Алуминиев C-профил': 18,
    'Лост за гардероб': 7,
  },
  drawerSet: { 'metal-box': 48, 'ball-bearing': 16 },
  makePerCabinet: 45,
  fitPerCabinet: 25,
  delivery: 60,
  spread: 0.12,
  roundTo: 10,
};
