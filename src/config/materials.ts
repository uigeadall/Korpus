/**
 * Палитри и материали за конфигуратора.
 *
 * Това са работни стойности. В етап „Админ панел" същият списък ще се
 * редактира от базата (SPEC 8, „Настройки: цветове и материали").
 * Декорите и RAL номерата трябва да дойдат от доставчика. // ПРОВЕРИ
 */

import type { DrawerSystem, FacadeType, OpeningType, WorktopType } from '@/lib/cabinet-rules';

export interface Swatch {
  id: string;
  name: string;
  /** Примерен цвят за чипа в интерфейса, не е точният декор. */
  hex: string;
}

/** Корпус ПДЧ 18 мм в 4 цвята. */ // ПРОВЕРИ
export const CARCASS_COLORS: Swatch[] = [
  { id: 'white', name: 'Бял', hex: '#efece6' },
  { id: 'light-oak', name: 'Светъл дъб', hex: '#c9ae86' },
  { id: 'grey', name: 'Светло сив', hex: '#b6b4b0' },
  { id: 'anthracite', name: 'Антрацит', hex: '#4a4b4e' },
];

/** Палитра за фасадите. */ // ПРОВЕРИ
export const FACADE_COLORS: Swatch[] = [
  { id: 'ral9010', name: 'RAL 9010 чисто бяло', hex: '#f1ece4' },
  { id: 'ral9001', name: 'RAL 9001 кремаво', hex: '#e9e0d2' },
  { id: 'ral7035', name: 'RAL 7035 светло сиво', hex: '#cbd0cc' },
  { id: 'ral7016', name: 'RAL 7016 антрацит', hex: '#383e42' },
  { id: 'ral6013', name: 'RAL 6013 тръстика', hex: '#7c7b52' },
  { id: 'ral5008', name: 'RAL 5008 сиво синьо', hex: '#2e3a44' },
];

export const FACADE_TYPES: { id: FacadeType; name: string; note?: string }[] = [
  { id: 'mdf-painted', name: 'МДФ боядисан', note: 'гладък, без кант' },
  { id: 'mdf-milled', name: 'МДФ фрезован', note: 'рамка, боядисан' },
  { id: 'pdch-decor', name: 'ПДЧ декор', note: 'кант 2 мм по 4-те страни' },
];

export const WORKTOPS: { id: WorktopType; name: string; note?: string }[] = [
  { id: 'laminate38', name: 'Ламиниран 38 мм' },
  { id: 'quartz20', name: 'Кварц 20 мм' },
  { id: 'sintered12', name: 'Синтерован 12 мм' },
  { id: 'granite30', name: 'Гранит 30 мм' },
];

export const OPENINGS: { id: OpeningType; name: string; note?: string }[] = [
  { id: 'handles', name: 'Дръжки' },
  { id: 'push', name: 'Push-to-open', note: 'без дръжки' },
  { id: 'alu-profile', name: 'Алуминиев профил', note: 'без дръжки' },
];

export const DRAWER_SYSTEMS: { id: DrawerSystem; name: string; note?: string }[] = [
  { id: 'metal-box', name: 'Метален борд' },
  { id: 'ball-bearing', name: 'Сферични водачи' },
];

export function swatch(list: Swatch[], name: string): Swatch | undefined {
  return list.find((s) => s.name === name);
}
