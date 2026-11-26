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
import type { Ezik } from '@/i18n/ezik';
import { type T3, izbroi, tekstove } from '@/i18n/tekst';

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

export const ROOM_COPY = tekstove<Record<RoomKind, RoomCopy>>({
  bg: {
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
  },
  en: {
    kitchen: {
      title: 'Design your kitchen',
      lead: 'Answer a few questions and see your kitchen in 3D. We work out the cabinets, sizes and hardware.',
      wallQuestion: 'How long is the kitchen wall?',
      wallHint:
        'If you haven’t measured — a room door is about 0.80 m wide, and a typical kitchen wall is between 3 and 4 metres.',
      needsQuestion: 'What should the kitchen have?',
      always:
        'The sink is always included. The rest follows the path fridge → preparation → sink → cooking, so you don’t walk back and forth.',
    },
    bedroom: {
      title: 'Design your wardrobe',
      lead: 'Answer a few questions and see your wardrobe in 3D. We work out the sections, shelves and hardware.',
      wallQuestion: 'How long is the wardrobe wall?',
      wallHint: 'A typical bedroom wardrobe is between 2 and 4 metres long and up to 2.20 m high.',
      needsQuestion: 'What should the wardrobe have?',
      always:
        'At least one section is always included. The drawers go at one end, the open section at the other.',
    },
    living: {
      title: 'Design your living room',
      lead: 'Answer a few questions and see your wall unit in 3D. We work out the cabinets, shelves and hardware.',
      wallQuestion: 'How long is the wall for the wall unit?',
      wallHint: 'A TV wall is usually between 2.5 and 4.5 metres.',
      needsQuestion: 'What should the living room have?',
      always:
        'The bookcase stands at one end and reaches the ceiling, so the wall row runs only above the low part.',
    },
    bath: {
      title: 'Design your bathroom',
      lead: 'Answer a few questions and see your bathroom in 3D. The cabinets are wall-hung so the floor underneath can be cleaned.',
      wallQuestion: 'How long is the wall for the cabinets?',
      wallHint: 'In a typical apartment the bathroom’s long wall is between 1.5 and 2.5 metres.',
      needsQuestion: 'What should the bathroom have?',
      always:
        'The sink is tied to the plumbing and goes first. The washing machine needs a full niche — if there is no room for it, it is left out entirely rather than squeezed.',
    },
    corridor: {
      title: 'Design your corridor',
      lead: 'Answer a few questions and see your corridor in 3D. The cabinets are shallow — in a corridor every centimetre counts.',
      wallQuestion: 'How long is the wall for the cabinets?',
      wallHint: 'A corridor in a home is usually between 2 and 5 metres.',
      needsQuestion: 'What should the corridor have?',
      always:
        'The order follows importance: first somewhere to hang a coat, then somewhere for the shoes. In a narrow corridor the last item goes, not the first.',
    },
    hall: {
      title: 'Design your entrance hall',
      lead: 'Answer a few questions and see your entrance hall in 3D. The cabinets are shallow so there is room to pass.',
      wallQuestion: 'How long is the wall for the cabinets?',
      wallHint: 'An entrance hall is usually between 1.5 and 3 metres.',
      needsQuestion: 'What should the entrance hall have?',
      always: 'The order follows importance: first somewhere to hang a coat, then somewhere for the shoes.',
    },
  },
  zh: {
    kitchen: {
      title: '设计您的厨房',
      lead: '回答几个问题，即可看到厨房的三维效果。柜体、尺寸和五金由我们计算。',
      wallQuestion: '厨房这面墙有多长？',
      wallHint: '如果还没量过——房门宽约 0.80 米，一般厨房墙长在 3 到 4 米之间。',
      needsQuestion: '厨房里需要哪些？',
      always: '水槽一定会有。其余按照冰箱 → 备餐 → 水槽 → 烹饪的动线排列，免得在厨房里来回走动。',
    },
    bedroom: {
      title: '设计您的衣柜',
      lead: '回答几个问题，即可看到衣柜的三维效果。分区、层板和五金由我们计算。',
      wallQuestion: '衣柜这面墙有多长？',
      wallHint: '卧室衣柜一般长 2 到 4 米，高度不超过 2.20 米。',
      needsQuestion: '衣柜里需要哪些？',
      always: '至少会有一个分区。抽屉放在一端，开放格放在另一端。',
    },
    living: {
      title: '设计您的客厅',
      lead: '回答几个问题，即可看到组合柜的三维效果。柜体、层板和五金由我们计算。',
      wallQuestion: '组合柜这面墙有多长？',
      wallHint: '电视墙一般长 2.5 到 4.5 米。',
      needsQuestion: '客厅里需要哪些？',
      always: '书柜放在一端并通到天花板，所以墙面柜只在矮柜上方。',
    },
    bath: {
      title: '设计您的浴室',
      lead: '回答几个问题，即可看到浴室的三维效果。柜子采用悬挂式，方便清洁下方地面。',
      wallQuestion: '放柜子的这面墙有多长？',
      wallHint: '普通公寓的浴室长边一般在 1.5 到 2.5 米之间。',
      needsQuestion: '浴室里需要哪些？',
      always: '台盆连着给排水，优先放置。洗衣机需要完整的空位——放不下就整个去掉，而不是硬塞。',
    },
    corridor: {
      title: '设计您的走廊',
      lead: '回答几个问题，即可看到走廊的三维效果。柜子较浅——走廊里每一厘米都很重要。',
      wallQuestion: '放柜子的这面墙有多长？',
      wallHint: '住宅走廊一般长 2 到 5 米。',
      needsQuestion: '走廊里需要哪些？',
      always: '按重要性排列：先是挂外套的地方，再是放鞋的地方。走廊较窄时，去掉的是最后一项，而不是第一项。',
    },
    hall: {
      title: '设计您的玄关',
      lead: '回答几个问题，即可看到玄关的三维效果。柜子较浅，留出通行空间。',
      wallQuestion: '放柜子的这面墙有多长？',
      wallHint: '玄关一般长 1.5 到 3 米。',
      needsQuestion: '玄关里需要哪些？',
      always: '按重要性排列：先是挂外套的地方，再是放鞋的地方。',
    },
  },
});

/** Едно ключе: етикет, пояснение и към кой отговор се връзва. */
export interface Switch<N> {
  label: T3;
  note: T3;
  get: (n: N) => boolean;
  set: (on: boolean) => Partial<N>;
}

/** Един избор от три: етикет и стойности. */
export interface Choice<N> {
  label: T3;
  options: { value: string; label: T3 }[];
  get: (n: N) => string;
  set: (value: string) => Partial<N>;
}

export const KITCHEN_SWITCHES: Switch<KitchenNeeds>[] = [
  {
    label: { bg: 'Хладилник', en: 'Fridge', zh: '冰箱' },
    note: {
      bg: 'Висока колона с ниша за вграждане',
      en: 'Tall column with a built-in niche',
      zh: '带嵌入空位的高柜',
    },
    get: (n) => n.fridge,
    set: (fridge) => ({ fridge }),
  },
  {
    label: { bg: 'Фурна', en: 'Oven', zh: '烤箱' },
    note: { bg: 'Шкаф за вградена фурна', en: 'Unit for a built-in oven', zh: '嵌入式烤箱柜' },
    get: (n) => n.oven,
    set: (oven) => ({ oven }),
  },
  {
    label: { bg: 'Съдомиялна', en: 'Dishwasher', zh: '洗碗机' },
    note: { bg: 'Застава до мивката', en: 'Goes next to the sink', zh: '放在水槽旁边' },
    get: (n) => n.dishwasher,
    set: (dishwasher) => ({ dishwasher }),
  },
  {
    label: { bg: 'Аспиратор', en: 'Extractor hood', zh: '油烟机' },
    note: { bg: 'С шкаф над него', en: 'With a cabinet above it', zh: '上方带吊柜' },
    get: (n) => n.hood,
    set: (hood) => ({ hood }),
  },
];

export const KITCHEN_CHOICES: Choice<KitchenNeeds>[] = [
  {
    label: { bg: 'Колко чекмеджета', en: 'How many drawers', zh: '抽屉数量' },
    options: [
      { value: 'few', label: { bg: 'Малко', en: 'Few', zh: '少' } },
      { value: 'half', label: { bg: 'Средно', en: 'Some', zh: '适中' } },
      { value: 'many', label: { bg: 'Много', en: 'Many', zh: '多' } },
    ],
    get: (n) => n.drawers,
    set: (value) => ({ drawers: value as KitchenNeeds['drawers'] }),
  },
  {
    label: { bg: 'Горен ред', en: 'Upper row', zh: '上排柜' },
    options: [
      { value: 'full', label: { bg: 'С горни шкафове', en: 'With wall units', zh: '带吊柜' } },
      { value: 'none', label: { bg: 'Без горни', en: 'No wall units', zh: '不要吊柜' } },
    ],
    get: (n) => n.upperRow,
    set: (value) => ({ upperRow: value as KitchenNeeds['upperRow'] }),
  },
];

export const BEDROOM_SWITCHES: Switch<BedroomNeeds>[] = [
  {
    label: { bg: 'Скрин с чекмеджета', en: 'Chest of drawers', zh: '斗柜' },
    note: { bg: 'Пет чекмеджета в единия край', en: 'Five drawers at one end', zh: '一端设五个抽屉' },
    get: (n) => n.chest,
    set: (chest) => ({ chest }),
  },
  {
    label: { bg: 'Отворена секция', en: 'Open section', zh: '开放格' },
    note: { bg: 'За чанти, куфари и кутии', en: 'For bags, suitcases and boxes', zh: '放包、行李箱和收纳盒' },
    get: (n) => n.openSection,
    set: (openSection) => ({ openSection }),
  },
  {
    label: { bg: 'Антресол', en: 'Top boxes', zh: '顶柜' },
    note: {
      bg: 'Шкафове над гардероба, до тавана',
      en: 'Cabinets above the wardrobe, up to the ceiling',
      zh: '衣柜上方的柜子，通到天花板',
    },
    get: (n) => n.attic,
    set: (attic) => ({ attic }),
  },
];

export const BEDROOM_CHOICES: Choice<BedroomNeeds>[] = [
  {
    label: { bg: 'Колко място за закачане', en: 'How much hanging space', zh: '挂衣空间' },
    options: [
      { value: 'little', label: { bg: 'По-малко', en: 'Less', zh: '少一些' } },
      { value: 'half', label: { bg: 'Поравно', en: 'Half and half', zh: '各一半' } },
      { value: 'lots', label: { bg: 'Повече', en: 'More', zh: '多一些' } },
    ],
    get: (n) => n.hanging,
    set: (value) => ({ hanging: value as BedroomNeeds['hanging'] }),
  },
];

export const LIVING_SWITCHES: Switch<LivingNeeds>[] = [
  {
    label: { bg: 'ТВ шкаф', en: 'TV unit', zh: '电视柜' },
    note: { bg: 'Нисък, с две чекмеджета', en: 'Low, with two drawers', zh: '矮柜，带两个抽屉' },
    get: (n) => n.tv,
    set: (tv) => ({ tv }),
  },
  {
    label: { bg: 'Библиотека', en: 'Bookcase', zh: '书柜' },
    note: { bg: 'Висока, с отворени рафтове', en: 'Tall, with open shelves', zh: '高柜，开放层板' },
    get: (n) => n.bookcase,
    set: (bookcase) => ({ bookcase }),
  },
  {
    label: { bg: 'Стенен ред', en: 'Wall row', zh: '墙面柜' },
    note: {
      bg: 'Рафтове и шкафове над ниската част',
      en: 'Shelves and cabinets above the low part',
      zh: '矮柜上方的搁板和柜子',
    },
    get: (n) => n.wallShelves,
    set: (wallShelves) => ({ wallShelves }),
  },
];

export const LIVING_CHOICES: Choice<LivingNeeds>[] = [
  {
    label: {
      bg: 'Колко от стенния ред да е затворен',
      en: 'How much of the wall row is closed',
      zh: '墙面柜的封闭比例',
    },
    options: [
      { value: 'little', label: { bg: 'Повече рафтове', en: 'More shelves', zh: '多些搁板' } },
      { value: 'half', label: { bg: 'Поравно', en: 'Half and half', zh: '各一半' } },
      { value: 'lots', label: { bg: 'Повече шкафове', en: 'More cabinets', zh: '多些柜子' } },
    ],
    get: (n) => n.closed,
    set: (value) => ({ closed: value as LivingNeeds['closed'] }),
  },
];

export const BATH_SWITCHES: Switch<BathNeeds>[] = [
  {
    label: { bg: 'Шкаф с мивка', en: 'Vanity unit', zh: '台盆柜' },
    note: { bg: 'Висящ, с две чекмеджета', en: 'Wall-hung, with two drawers', zh: '悬挂式，带两个抽屉' },
    get: (n) => n.vanity,
    set: (vanity) => ({ vanity }),
  },
  {
    label: { bg: 'Колона', en: 'Tall unit', zh: '高柜' },
    note: {
      bg: 'Висока и плитка — за хавлии и препарати',
      en: 'Tall and shallow — for towels and toiletries',
      zh: '高而浅——放毛巾和洗护用品',
    },
    get: (n) => n.tall,
    set: (tall) => ({ tall }),
  },
  {
    label: { bg: 'Ниша за пералня', en: 'Washing machine niche', zh: '洗衣机位' },
    note: { bg: 'Пералнята иска цели 65 см', en: 'The washing machine needs a full 65 cm', zh: '洗衣机需要整整 65 厘米' },
    get: (n) => n.washer,
    set: (washer) => ({ washer }),
  },
  {
    label: { bg: 'Огледален шкаф', en: 'Mirror cabinet', zh: '镜柜' },
    note: {
      bg: 'Над мивката, не над цялата стена',
      en: 'Above the sink, not across the whole wall',
      zh: '在台盆上方，而不是整面墙',
    },
    get: (n) => n.mirror,
    set: (mirror) => ({ mirror }),
  },
];

export const HALL_SWITCHES: Switch<HallNeeds>[] = [
  {
    label: { bg: 'Шкаф за връхни дрехи', en: 'Coat cupboard', zh: '外套柜' },
    note: { bg: 'Затворен, до тавана', en: 'Closed, up to the ceiling', zh: '封闭式，通到天花板' },
    get: (n) => n.wardrobe,
    set: (wardrobe) => ({ wardrobe }),
  },
  {
    label: { bg: 'Шкаф за обувки', en: 'Shoe cabinet', zh: '鞋柜' },
    note: { bg: 'Нисък, с падащи чела', en: 'Low, with tilt-out fronts', zh: '矮柜，翻斗式' },
    get: (n) => n.shoes,
    set: (shoes) => ({ shoes }),
  },
  {
    label: { bg: 'Открита закачалка', en: 'Open coat rack', zh: '开放式挂衣架' },
    note: {
      bg: 'За палтото, което се сваля всеки ден',
      en: 'For the coat you take off every day',
      zh: '挂每天穿脱的外套',
    },
    get: (n) => n.openRail,
    set: (openRail) => ({ openRail }),
  },
  {
    label: { bg: 'Пейка за събуване', en: 'Shoe bench', zh: '换鞋凳' },
    note: { bg: 'Иска поне 60 см стена', en: 'Needs at least 60 cm of wall', zh: '需要至少 60 厘米墙面' },
    get: (n) => n.bench,
    set: (bench) => ({ bench }),
  },
  {
    label: { bg: 'Антресол', en: 'Top boxes', zh: '顶柜' },
    note: { bg: 'Над затворените шкафове', en: 'Above the closed cabinets', zh: '在封闭柜上方' },
    get: (n) => n.attic,
    set: (attic) => ({ attic }),
  },
];

/** Думите за обобщението накрая. */
const DUMI = tekstove({
  bg: {
    fridge: 'хладилник', oven: 'фурна', dishwasher: 'съдомиялна', hood: 'аспиратор',
    bezUredi: 'без вградени уреди',
    rail: 'лост и рафтове', chest: 'скрин', openSection: 'отворена секция', attic: 'антресол',
    vanity: 'шкаф с мивка', tall: 'колона', washer: 'ниша за пералня', mirror: 'огледален шкаф',
    bezShkafove: 'без шкафове',
    coats: 'шкаф за дрехи', shoes: 'шкаф за обувки', openRail: 'закачалка', bench: 'пейка',
    tv: 'ТВ шкаф', bookcase: 'библиотека', wallShelves: 'стенен ред', low: 'ниски шкафове',
  },
  en: {
    fridge: 'fridge', oven: 'oven', dishwasher: 'dishwasher', hood: 'extractor hood',
    bezUredi: 'no built-in appliances',
    rail: 'rail and shelves', chest: 'chest of drawers', openSection: 'open section', attic: 'top boxes',
    vanity: 'vanity unit', tall: 'tall unit', washer: 'washing machine niche', mirror: 'mirror cabinet',
    bezShkafove: 'no cabinets',
    coats: 'coat cupboard', shoes: 'shoe cabinet', openRail: 'coat rack', bench: 'bench',
    tv: 'TV unit', bookcase: 'bookcase', wallShelves: 'wall row', low: 'low cabinets',
  },
  zh: {
    fridge: '冰箱', oven: '烤箱', dishwasher: '洗碗机', hood: '油烟机',
    bezUredi: '无嵌入式电器',
    rail: '挂衣杆和层板', chest: '斗柜', openSection: '开放格', attic: '顶柜',
    vanity: '台盆柜', tall: '高柜', washer: '洗衣机位', mirror: '镜柜',
    bezShkafove: '无柜子',
    coats: '外套柜', shoes: '鞋柜', openRail: '挂衣架', bench: '换鞋凳',
    tv: '电视柜', bookcase: '书柜', wallShelves: '墙面柜', low: '矮柜',
  },
});

/** Какво е избрано, с думи — за обобщението накрая. */
export function compositionOf(room: RoomKind, needs: RoomNeeds, ezik: Ezik = 'bg'): string {
  const d = DUMI[ezik];
  const spisak = (xs: (string | false)[], prazno = '') =>
    izbroi(xs.filter((x): x is string => Boolean(x)), ezik) || prazno;
  if (room === 'kitchen') {
    const n = needs.kitchen;
    return spisak(
      [n.fridge && d.fridge, n.oven && d.oven, n.dishwasher && d.dishwasher, n.hood && d.hood],
      d.bezUredi,
    );
  }
  if (room === 'bedroom') {
    const n = needs.bedroom;
    return spisak([d.rail, n.chest && d.chest, n.openSection && d.openSection, n.attic && d.attic]);
  }
  if (room === 'bath') {
    const n = needs.bath;
    return spisak(
      [n.vanity && d.vanity, n.tall && d.tall, n.washer && d.washer, n.mirror && d.mirror],
      d.bezShkafove,
    );
  }
  if (room === 'corridor' || room === 'hall') {
    const n = needs.hall;
    return spisak(
      [n.wardrobe && d.coats, n.shoes && d.shoes, n.openRail && d.openRail, n.bench && d.bench, n.attic && d.attic],
      d.bezShkafove,
    );
  }
  const n = needs.living;
  return spisak([n.tv && d.tv, n.bookcase && d.bookcase, n.wallShelves && d.wallShelves, d.low]);
}
