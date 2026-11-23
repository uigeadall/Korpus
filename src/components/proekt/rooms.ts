/**
 * Какво се пита за всяка стая.
 *
 * Въпросите са различни — кухнята пита за уреди, спалнята за закачане,
 * всекидневната за библиотека — но формата им е една и съща, за да може
 * екранът да ги рисува, без да знае коя стая е.
 */

import type { RoomKind } from '@/lib/cabinet-rules';
import type {
  BathNeeds,
  BedroomNeeds,
  HallNeeds,
  KitchenNeeds,
  LivingNeeds,
  RoomNeeds,
} from '@/lib/autolayout';

export interface RoomCopy {
  title: string;
  lead: string;
  /** Въпросът на стъпка „Размери". */
  wallQuestion: string;
  /** Подсказка под плъзгача. */
  wallHint: string;
  /** Въпросът на стъпка „Какво да има". */
  needsQuestion: string;
  /** Какво правилата слагат винаги. */
  always: string;
}

export const ROOM_COPY: Record<RoomKind, RoomCopy> = {
  kitchen: {
    title: 'Направете си кухнята',
    lead: 'Отговорете на няколко въпроса и вижте кухнята си в обем. Ние смятаме шкафовете, размерите и обкова.',
    wallQuestion: 'Колко е дълга стената за кухнята?',
    wallHint:
      'Ако не сте мерили — вратата на стая е около 0,80 м, а обикновена кухненска стена е между 3 и 4 метра.',
    needsQuestion: 'Какво да има в кухнята?',
    always:
      'Мивката влиза винаги. Останалото подреждаме по пътя хладилник → подготовка → мивка → готвене, за да не се разхождате из кухнята.',
  },
  bedroom: {
    title: 'Направете си гардероба',
    lead: 'Отговорете на няколко въпроса и вижте гардероба си в обем. Ние смятаме секциите, рафтовете и обкова.',
    wallQuestion: 'Колко е дълга стената за гардероба?',
    wallHint: 'Обикновен гардероб в спалня е между 2 и 4 метра. Височината е до 2,20 м.',
    needsQuestion: 'Какво да има в гардероба?',
    always:
      'Поне една секция влиза винаги. Чекмеджетата застават в единия край, отворената секция — в другия.',
  },
  living: {
    title: 'Направете си всекидневната',
    lead: 'Отговорете на няколко въпроса и вижте композицията си в обем. Ние смятаме шкафовете, рафтовете и обкова.',
    wallQuestion: 'Колко е дълга стената за композицията?',
    wallHint: 'ТВ стена обикновено е между 2,5 и 4,5 метра.',
    needsQuestion: 'Какво да има във всекидневната?',
    always:
      'Библиотеката застава в единия край и стига до тавана, затова стенният ред минава само над ниската част.',
  },
  bath: {
    title: 'Направете си банята',
    lead: 'Отговорете на няколко въпроса и вижте банята си в обем. Шкафовете висят, за да се мие подът под тях.',
    wallQuestion: 'Колко е дълга стената за шкафовете?',
    wallHint: 'В панелен апартамент банята е между 1,5 и 2,5 метра по дългата стена.',
    needsQuestion: 'Какво да има в банята?',
    always:
      'Мивката е вързана за ВиК и застава първа. Пералнята иска цяла ниша — не остане ли място за нея, отпада цяла, вместо да се свива.',
  },
  corridor: {
    title: 'Направете си коридора',
    lead: 'Отговорете на няколко въпроса и вижте коридора си в обем. Шкафовете са плитки — в коридор всеки сантиметър се усеща.',
    wallQuestion: 'Колко е дълга стената за шкафовете?',
    wallHint: 'Коридор в жилище обикновено е между 2 и 5 метра.',
    needsQuestion: 'Какво да има в коридора?',
    always:
      'Редът е по важност: първо къде да се закачи палтото, после къде да се съберат обувките. В тесен коридор отпада последното, не първото.',
  },
  hall: {
    title: 'Направете си антрето',
    lead: 'Отговорете на няколко въпроса и вижте антрето си в обем. Шкафовете са плитки, за да се минава.',
    wallQuestion: 'Колко е дълга стената за шкафовете?',
    wallHint: 'Антре в жилище обикновено е между 1,5 и 3 метра.',
    needsQuestion: 'Какво да има в антрето?',
    always:
      'Редът е по важност: първо къде да се закачи палтото, после къде да се съберат обувките.',
  },
};

/** Едно ключе: етикет, пояснение и към кой отговор се връзва. */
export interface Switch<N> {
  label: string;
  note: string;
  get: (n: N) => boolean;
  set: (on: boolean) => Partial<N>;
}

/** Един избор от три: етикет и стойности. */
export interface Choice<N> {
  label: string;
  options: { value: string; label: string }[];
  get: (n: N) => string;
  set: (value: string) => Partial<N>;
}

export const KITCHEN_SWITCHES: Switch<KitchenNeeds>[] = [
  {
    label: 'Хладилник',
    note: 'Висока колона с ниша за вграждане',
    get: (n) => n.fridge,
    set: (fridge) => ({ fridge }),
  },
  { label: 'Фурна', note: 'Шкаф за вградена фурна', get: (n) => n.oven, set: (oven) => ({ oven }) },
  {
    label: 'Съдомиялна',
    note: 'Застава до мивката',
    get: (n) => n.dishwasher,
    set: (dishwasher) => ({ dishwasher }),
  },
  { label: 'Аспиратор', note: 'С шкаф над него', get: (n) => n.hood, set: (hood) => ({ hood }) },
];

export const KITCHEN_CHOICES: Choice<KitchenNeeds>[] = [
  {
    label: 'Колко чекмеджета',
    options: [
      { value: 'few', label: 'Малко' },
      { value: 'half', label: 'Средно' },
      { value: 'many', label: 'Много' },
    ],
    get: (n) => n.drawers,
    set: (value) => ({ drawers: value as KitchenNeeds['drawers'] }),
  },
  {
    label: 'Горен ред',
    options: [
      { value: 'full', label: 'С горни шкафове' },
      { value: 'none', label: 'Без горни' },
    ],
    get: (n) => n.upperRow,
    set: (value) => ({ upperRow: value as KitchenNeeds['upperRow'] }),
  },
];

export const BEDROOM_SWITCHES: Switch<BedroomNeeds>[] = [
  {
    label: 'Скрин с чекмеджета',
    note: 'Пет чекмеджета в единия край',
    get: (n) => n.chest,
    set: (chest) => ({ chest }),
  },
  {
    label: 'Отворена секция',
    note: 'За чанти, куфари и кутии',
    get: (n) => n.openSection,
    set: (openSection) => ({ openSection }),
  },
  {
    label: 'Антресол',
    note: 'Шкафове над гардероба, до тавана',
    get: (n) => n.attic,
    set: (attic) => ({ attic }),
  },
];

export const BEDROOM_CHOICES: Choice<BedroomNeeds>[] = [
  {
    label: 'Колко място за закачане',
    options: [
      { value: 'little', label: 'По-малко' },
      { value: 'half', label: 'Поравно' },
      { value: 'lots', label: 'Повече' },
    ],
    get: (n) => n.hanging,
    set: (value) => ({ hanging: value as BedroomNeeds['hanging'] }),
  },
];

export const LIVING_SWITCHES: Switch<LivingNeeds>[] = [
  {
    label: 'ТВ шкаф',
    note: 'Нисък, с две чекмеджета',
    get: (n) => n.tv,
    set: (tv) => ({ tv }),
  },
  {
    label: 'Библиотека',
    note: 'Висока, с отворени рафтове',
    get: (n) => n.bookcase,
    set: (bookcase) => ({ bookcase }),
  },
  {
    label: 'Стенен ред',
    note: 'Рафтове и шкафове над ниската част',
    get: (n) => n.wallShelves,
    set: (wallShelves) => ({ wallShelves }),
  },
];

export const LIVING_CHOICES: Choice<LivingNeeds>[] = [
  {
    label: 'Колко от стенния ред да е затворен',
    options: [
      { value: 'little', label: 'Повече рафтове' },
      { value: 'half', label: 'Поравно' },
      { value: 'lots', label: 'Повече шкафове' },
    ],
    get: (n) => n.closed,
    set: (value) => ({ closed: value as LivingNeeds['closed'] }),
  },
];

export const BATH_SWITCHES: Switch<BathNeeds>[] = [
  {
    label: 'Шкаф с мивка',
    note: 'Висящ, с две чекмеджета',
    get: (n) => n.vanity,
    set: (vanity) => ({ vanity }),
  },
  {
    label: 'Колона',
    note: 'Висока и плитка — за хавлии и препарати',
    get: (n) => n.tall,
    set: (tall) => ({ tall }),
  },
  {
    label: 'Ниша за пералня',
    note: 'Пералнята иска цели 65 см',
    get: (n) => n.washer,
    set: (washer) => ({ washer }),
  },
  {
    label: 'Огледален шкаф',
    note: 'Над мивката, не над цялата стена',
    get: (n) => n.mirror,
    set: (mirror) => ({ mirror }),
  },
];

export const HALL_SWITCHES: Switch<HallNeeds>[] = [
  {
    label: 'Шкаф за връхни дрехи',
    note: 'Затворен, до тавана',
    get: (n) => n.wardrobe,
    set: (wardrobe) => ({ wardrobe }),
  },
  {
    label: 'Шкаф за обувки',
    note: 'Нисък, с падащи чела',
    get: (n) => n.shoes,
    set: (shoes) => ({ shoes }),
  },
  {
    label: 'Открита закачалка',
    note: 'За палтото, което се сваля всеки ден',
    get: (n) => n.openRail,
    set: (openRail) => ({ openRail }),
  },
  {
    label: 'Пейка за събуване',
    note: 'Иска поне 60 см стена',
    get: (n) => n.bench,
    set: (bench) => ({ bench }),
  },
  {
    label: 'Антресол',
    note: 'Над затворените шкафове',
    get: (n) => n.attic,
    set: (attic) => ({ attic }),
  },
];

/** Какво е избрано, с думи — за обобщението накрая. */
export function compositionOf(room: RoomKind, needs: RoomNeeds): string {
  if (room === 'kitchen') {
    const n = needs.kitchen;
    return (
      [n.fridge && 'хладилник', n.oven && 'фурна', n.dishwasher && 'съдомиялна', n.hood && 'аспиратор']
        .filter(Boolean)
        .join(', ') || 'без вградени уреди'
    );
  }
  if (room === 'bedroom') {
    const n = needs.bedroom;
    return (
      ['лост и рафтове', n.chest && 'скрин', n.openSection && 'отворена секция', n.attic && 'антресол']
        .filter(Boolean)
        .join(', ')
    );
  }
  if (room === 'bath') {
    const n = needs.bath;
    return (
      [n.vanity && 'шкаф с мивка', n.tall && 'колона', n.washer && 'ниша за пералня', n.mirror && 'огледален шкаф']
        .filter(Boolean)
        .join(', ') || 'без шкафове'
    );
  }
  if (room === 'corridor' || room === 'hall') {
    const n = needs.hall;
    return (
      [
        n.wardrobe && 'шкаф за дрехи',
        n.shoes && 'шкаф за обувки',
        n.openRail && 'закачалка',
        n.bench && 'пейка',
        n.attic && 'антресол',
      ]
        .filter(Boolean)
        .join(', ') || 'без шкафове'
    );
  }
  const n = needs.living;
  return (
    [n.tv && 'ТВ шкаф', n.bookcase && 'библиотека', n.wallShelves && 'стенен ред', 'ниски шкафове']
      .filter(Boolean)
      .join(', ')
  );
}
