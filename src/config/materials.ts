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
  /**
   * Дървесен декор ли е. По него обемът слага фладер
   * (`lib/povarhnost.ts`).
   *
   * Отбелязва се изрично, а не се познава по името: „тръстика" носи в
   * себе си „тик" и зелена боя получаваше шарка на дърво.
   */
  wood?: true;
}

/** Корпус ПДЧ 18 мм в 4 цвята. */ // ПРОВЕРИ
export const CARCASS_COLORS: Swatch[] = [
  { id: 'white', name: 'Бял', hex: '#efece6' },
  { id: 'light-oak', name: 'Светъл дъб', hex: '#c9ae86', wood: true },
  { id: 'grey', name: 'Светло сив', hex: '#b6b4b0' },
  { id: 'anthracite', name: 'Антрацит', hex: '#4a4b4e' },
];

/**
 * Палитра за фасадите.
 *
 * Първите шест са бои — те важат за боядисания и за фрезования МДФ.
 * Последните четири са декори на ПДЧ: дървото се поръчва готово и не
 * се бои, затова името му носи дървесината. По него обемът слага
 * фладер (`lib/povarhnost.ts`); боята няма какво да шари.
 */ // ПРОВЕРИ
export const FACADE_COLORS: Swatch[] = [
  { id: 'ral9010', name: 'RAL 9010 чисто бяло', hex: '#f1ece4' },
  { id: 'ral9001', name: 'RAL 9001 кремаво', hex: '#e9e0d2' },
  { id: 'ral7035', name: 'RAL 7035 светло сиво', hex: '#cbd0cc' },
  { id: 'ral7016', name: 'RAL 7016 антрацит', hex: '#383e42' },
  { id: 'ral6013', name: 'RAL 6013 тръстика', hex: '#7c7b52' },
  { id: 'ral5008', name: 'RAL 5008 сиво синьо', hex: '#2e3a44' },
  { id: 'oak-sonoma', name: 'Дъб сонома', hex: '#c6a97e', wood: true },
  { id: 'oak-natural', name: 'Дъб натурал', hex: '#b08f62', wood: true },
  { id: 'walnut', name: 'Орех', hex: '#7d5a3c', wood: true },
  { id: 'ash-grey', name: 'Ясен сив', hex: '#9a938a', wood: true },
];

/**
 * Декорите са дърво и се поръчват готови — боя по тях не се слага.
 * Изведени са от каталога, за да няма втори списък, който да изостане.
 */
export const DECOR_ONLY: ReadonlySet<string> = new Set(
  FACADE_COLORS.filter((c) => c.wood).map((c) => c.id),
);

/** Дървесен ли е този цвят — търси се и в двете палитри по име. */
export function isWoodColor(name: string): boolean {
  return [...FACADE_COLORS, ...CARCASS_COLORS].some((c) => c.name === name && c.wood === true);
}

/**
 * Кои цветове стоят пред този вид фасада.
 *
 * Дървесният декор съществува само на ПДЧ: той е готово фолио, а не
 * боя. „МДФ боядисан, орех" е поръчка, която цехът не може да изпълни,
 * и затова не бива да се избира — по-добре да липсва от списъка,
 * отколкото да стигне до спецификация.
 */
export function colorsFor(type: FacadeType): Swatch[] {
  return type === 'pdch-decor'
    ? FACADE_COLORS
    : FACADE_COLORS.filter((c) => !DECOR_ONLY.has(c.id));
}

/**
 * Какъв цвят остава, когато видът на фасадата се смени.
 *
 * Избраният, ако още е възможен; иначе първият. Мълчаливото оставяне
 * на невъзможен цвят е как се стига до поръчка за боядисан орех.
 */
export function colorAfterType(type: FacadeType, current: string): string {
  const list = colorsFor(type);
  return list.some((c) => c.name === current) ? current : list[0].name;
}

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
