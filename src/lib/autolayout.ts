/**
 * От човешки отговори към разположение на шкафове.
 *
 * Конфигураторът иска от клиента да мисли в милиметри и кодове. Повечето
 * хора не могат и не искат. Тук се задават въпроси, на които всеки може
 * да отговори — има ли съдомиялна, колко чекмеджета — и правилата
 * подреждат кухнята сами.
 *
 * Какво НЕ се измисля тук: нито една ширина. Всички идват от каталога в
 * `MODULES`. Измисля се само **редът**, а той следва работния триъгълник
 * хладилник → подготовка → мивка → готвене, който е ергономия, не
 * производствена стойност.
 *
 * Резултатът е обикновена кухня — отправна точка, която клиентът после
 * мести в конфигуратора. Не е технически проект.
 */

import {
  type KitchenModule,
  MODULES,
  type ModuleKind,
  type RoomKind,
  clampWallLength,
  nearestWidth,
} from './cabinet-rules';
import { fillWidths } from './furniture/system';

export interface KitchenNeeds {
  fridge: boolean;
  oven: boolean;
  dishwasher: boolean;
  hood: boolean;
  /** Колко от долните шкафове да са с чекмеджета вместо с врата. */
  drawers: 'few' | 'half' | 'many';
  /** Горен ред по цялата стена или кухня без горни шкафове. */
  upperRow: 'full' | 'none';
}

export const DEFAULT_NEEDS: KitchenNeeds = {
  fridge: true,
  oven: true,
  dishwasher: true,
  hood: true,
  drawers: 'half',
  upperRow: 'full',
};

export interface AutoLayout {
  base: KitchenModule[];
  upper: KitchenModule[];
  /** Какво не се е побрало — казва се на клиента с думи, не с числа. */
  dropped: string[];
}

/**
 * Идентификаторите излизат от мястото на модула, не от брояч: същите
 * отговори трябва да дадат същата кухня и на сървъра, и в браузъра,
 * иначе React се оплаква от разминаване при hydration.
 */
function make(kind: ModuleKind, width: number): KitchenModule {
  const spec = MODULES[kind];
  return {
    id: '',
    kind,
    width,
    hingeSide: spec.hasCarcass || kind === 'dw' ? 'right' : undefined,
  };
}

const numbered = (list: KitchenModule[], prefix: string): KitchenModule[] =>
  list.map((m, i) => ({ ...m, id: `${prefix}${i + 1}-${m.kind}` }));

/** Най-голямата ширина от каталога, която се побира в `space`. */
function widestWithin(kind: ModuleKind, space: number): number | null {
  const fits = MODULES[kind].widths.filter((w) => w <= space);
  return fits.length ? Math.max(...fits) : null;
}

/**
 * Поред на изхвърляне, когато стената не стига. Мивката не е в списъка —
 * кухня без мивка не е кухня.
 */
const SACRIFICE: { kind: ModuleKind; need: keyof KitchenNeeds; label: string }[] = [
  { kind: 'dw', need: 'dishwasher', label: 'съдомиялната' },
  { kind: 'oven', need: 'oven', label: 'фурната' },
  { kind: 'column', need: 'fridge', label: 'колоната за хладилник' },
];

export function autoLayout(wallLength: number, needs: KitchenNeeds): AutoLayout {
  const length = clampWallLength(wallLength);
  const dropped: string[] = [];

  // Кое от исканото влиза. Мивката е винаги вътре; останалите отпадат по
  // реда на `SACRIFICE`, докато задължителното се събере в стената.
  const wanted = new Set<ModuleKind>();
  if (needs.fridge) wanted.add('column');
  if (needs.oven) wanted.add('oven');
  if (needs.dishwasher) wanted.add('dw');

  /** Най-тясното, с което може да мине задължителното. */
  const minimumOf = (set: Set<ModuleKind>) => {
    let sum = Math.min(...MODULES.sink.widths);
    for (const kind of set) sum += Math.min(...MODULES[kind].widths);
    return sum;
  };

  for (const { kind, need, label } of SACRIFICE) {
    if (minimumOf(wanted) <= length) break;
    if (!needs[need] || !wanted.has(kind)) continue;
    wanted.delete(kind);
    dropped.push(`Стената не стига за ${label} — махнахме я.`);
  }

  /*
   * Нареждаме по работния триъгълник: хладилникът е в единия край,
   * мивката по средата, съдомиялнята до нея заради ВиК, готвенето след
   * тях. Подготвителното чекмедже стои между хладилника и мивката.
   */
  const base: KitchenModule[] = [];
  let left = length;
  const put = (kind: ModuleKind, preferred?: number) => {
    const want = preferred ?? Math.min(...MODULES[kind].widths);
    const width = widestWithin(kind, Math.min(left, want));
    if (width === null) return false;
    base.push(make(kind, width));
    left -= width;
    return true;
  };

  if (wanted.has('column')) put('column');

  // Подготовка до мивката — първото чекмедже, ако остава място и за нея.
  const sinkMin = Math.min(...MODULES.sink.widths);
  const otherMin = (wanted.has('dw') ? Math.min(...MODULES.dw.widths) : 0) +
    (wanted.has('oven') ? Math.min(...MODULES.oven.widths) : 0);
  const prepSpace = left - sinkMin - otherMin;
  if (prepSpace >= Math.min(...MODULES.drawers.widths)) {
    put('drawers', Math.min(600, prepSpace));
  }

  put('sink', left - otherMin >= 800 ? 800 : undefined);
  if (wanted.has('dw')) put('dw', 600);
  if (wanted.has('oven')) put('oven');

  /*
   * Остатъкът става шкафове за прибиране. Съотношението чекмеджета/врати
   * е вкусов избор на клиента, затова се пита, а не се предполага.
   */
  const drawerShare = { few: 0, half: 0.5, many: 1 }[needs.drawers];
  const fill = fillWidths(left, MODULES.door.widths);
  fill.forEach((width, i) => {
    const asDrawers = i < Math.round(fill.length * drawerShare);
    // Чекмеджетата нямат 300 мм — там вратата остава врата.
    const kind: ModuleKind =
      asDrawers && MODULES.drawers.widths.includes(width) ? 'drawers' : 'door';
    base.push(make(kind, width));
    left -= width;
  });

  /*
   * Горният ред повтаря долния: всеки горен шкаф стъпва над своя долен.
   * Така аспираторът излиза точно над фурната без смятане на отстояния,
   * а редът се побира точно, защото долният се побира.
   */
  let upper: KitchenModule[] = [];
  if (needs.upperRow === 'none') {
    if (needs.hood) dropped.push('Аспираторът иска горен шкаф над себе си — без горен ред отпада.');
  } else {
    upper = base
      .filter((m) => m.kind !== 'column')
      .map((m) =>
        m.kind === 'oven' && needs.hood && MODULES.hood.widths.includes(m.width)
          ? make('hood', m.width)
          : make('upper', m.width),
      );
  }

  return { base: numbered(base, 'auto-b'), upper: numbered(upper, 'auto-u'), dropped };
}

/* --- Спалня -------------------------------------------------------- */

export interface BedroomNeeds {
  /** Колко от гардероба да е за закачане, а не за рафтове. */
  hanging: 'little' | 'half' | 'lots';
  /** Скрин с чекмеджета в състава. */
  chest: boolean;
  /** Отворена секция за чанти и куфари. */
  openSection: boolean;
  /** Антресол над гардероба. */
  attic: boolean;
}

export const DEFAULT_BEDROOM: BedroomNeeds = {
  hanging: 'half',
  chest: true,
  openSection: false,
  attic: true,
};

/**
 * Гардероб по стената. Подредбата е проста и позната: чекмеджетата са
 * в единия край, отворената секция в другия, а между тях се редуват
 * закачане и рафтове според това какво иска клиентът.
 */
export function wardrobeLayout(wallLength: number, needs: BedroomNeeds): AutoLayout {
  const length = clampWallLength(wallLength);
  const dropped: string[] = [];
  const base: KitchenModule[] = [];
  let left = length;

  const place = (kind: ModuleKind, preferred?: number): boolean => {
    const width = widestWithin(kind, Math.min(left, preferred ?? Math.max(...MODULES[kind].widths)));
    if (width === null) return false;
    base.push(make(kind, width));
    left -= width;
    return true;
  };

  const narrowest = Math.min(...MODULES.wardrobe.widths);

  if (needs.chest) {
    if (left - narrowest >= Math.min(...MODULES['wardrobe-drawers'].widths)) {
      place('wardrobe-drawers', 600);
    } else {
      dropped.push('Стената не стига за скрин с чекмеджета — махнахме го.');
    }
  }

  // Средата: редуване на лост и рафтове според избраното съотношение.
  const share = { little: 0.25, half: 0.5, lots: 0.8 }[needs.hanging];
  const reserveOpen =
    needs.openSection && left - narrowest >= Math.min(...MODULES['wardrobe-open'].widths)
      ? Math.min(600, ...MODULES['wardrobe-open'].widths.filter((w) => w <= left - narrowest))
      : 0;

  const middle = fillWidths(left - reserveOpen, MODULES.wardrobe.widths);
  middle.forEach((width, i) => {
    const wantsRod = i < Math.round(middle.length * share);
    base.push(make(wantsRod ? 'wardrobe' : 'wardrobe-shelves', width));
    left -= width;
  });

  if (needs.openSection) {
    if (!place('wardrobe-open', reserveOpen || undefined)) {
      dropped.push('Стената не стига за отворена секция — махнахме я.');
    }
  }

  if (!base.length) {
    place('wardrobe');
  }

  /*
   * Антресолът ляга точно над гардероба: същите ширини, същите фуги.
   * Долният ред се побира, значи и той се побира.
   */
  let upper: KitchenModule[] = [];
  if (needs.attic) {
    upper = base
      .filter((m) => MODULES[m.kind].hasCarcass)
      .map((m) =>
        MODULES.attic.widths.includes(m.width)
          ? make('attic', m.width)
          : make('attic', nearestWidth('attic', m.width)),
      );
  }

  return { base: numbered(base, 'auto-b'), upper: numbered(upper, 'auto-u'), dropped };
}

/* --- Всекидневна --------------------------------------------------- */

export interface LivingNeeds {
  /** ТВ шкаф в състава. */
  tv: boolean;
  /** Висока библиотека в края. */
  bookcase: boolean;
  /** Стенен ред над долните шкафове. */
  wallShelves: boolean;
  /** Колко от стенния ред да е затворен шкаф, а не отворен рафт. */
  closed: 'little' | 'half' | 'lots';
}

export const DEFAULT_LIVING: LivingNeeds = {
  tv: true,
  bookcase: true,
  wallShelves: true,
  closed: 'half',
};

/**
 * ТВ композиция: библиотека в единия край, ТВ шкафът до нея, останалото
 * са ниски шкафове. Горе — стенен ред над ниската част, но не и над
 * библиотеката, която стига до тавана.
 */
export function livingLayout(wallLength: number, needs: LivingNeeds): AutoLayout {
  const length = clampWallLength(wallLength);
  const dropped: string[] = [];
  const base: KitchenModule[] = [];
  let left = length;

  const place = (kind: ModuleKind, preferred?: number): boolean => {
    const width = widestWithin(kind, Math.min(left, preferred ?? Math.max(...MODULES[kind].widths)));
    if (width === null) return false;
    base.push(make(kind, width));
    left -= width;
    return true;
  };

  const tvMin = Math.min(...MODULES.tv.widths);

  if (needs.bookcase) {
    const after = needs.tv ? tvMin : 0;
    if (left - after >= Math.min(...MODULES.bookcase.widths)) place('bookcase', 600);
    else dropped.push('Стената не стига за библиотека — махнахме я.');
  }

  if (needs.tv) {
    if (!place('tv', 1200)) dropped.push('Стената не стига за ТВ шкаф — махнахме го.');
  }

  for (const width of fillWidths(left, MODULES.lowboard.widths)) {
    base.push(make('lowboard', width));
    left -= width;
  }

  if (!base.length) place('lowboard');

  /*
   * Стенният ред стои само над ниската част: библиотеката е до тавана и
   * двигателят така или иначе не би пуснал нищо над нея.
   */
  let upper: KitchenModule[] = [];
  if (needs.wallShelves) {
    const lowWidth = base
      .filter((m) => m.kind !== 'bookcase')
      .reduce((sum, m) => sum + m.width, 0);
    const share = { little: 0.25, half: 0.5, lots: 0.8 }[needs.closed];
    const widths = fillWidths(lowWidth, MODULES.wallshelf.widths);
    upper = widths.map((width, i) =>
      i < Math.round(widths.length * share) && MODULES.wallbox.widths.includes(width)
        ? make('wallbox', width)
        : make('wallshelf', width),
    );
  }

  return { base: numbered(base, 'auto-b'), upper: numbered(upper, 'auto-u'), dropped };
}

/* --- Баня ------------------------------------------------------------ */

export interface BathNeeds {
  /** Шкаф с мивка — почти винаги има, но в тоалетна може и без. */
  vanity: boolean;
  /** Висока колона за хавлии и препарати. */
  tall: boolean;
  /** Ниша за пералня под плота. */
  washer: boolean;
  /** Огледален шкаф над мивката. */
  mirror: boolean;
}

export const DEFAULT_BATH: BathNeeds = {
  vanity: true,
  tall: true,
  washer: true,
  mirror: true,
};

/**
 * Банята се нарежда от мивката навън.
 *
 * Мивката е вързана за ВиК и е първото, което се поставя; пералнята
 * иска своята ниша и ако не остане място за нея, отпада цяла, вместо
 * да се свива — пералня с десет сантиметра по-тясна ниша не влиза.
 */
export function bathLayout(wallLength: number, needs: BathNeeds): AutoLayout {
  const length = clampWallLength(wallLength);
  const dropped: string[] = [];
  const base: KitchenModule[] = [];
  let left = length;

  const place = (kind: ModuleKind, preferred?: number): boolean => {
    const width = widestWithin(kind, Math.min(left, preferred ?? Math.max(...MODULES[kind].widths)));
    if (width === null) return false;
    base.push(make(kind, width));
    left -= width;
    return true;
  };

  if (needs.vanity) {
    if (!place('vanity', 800)) dropped.push('Стената не стига за шкаф с мивка.');
  }

  if (needs.washer) {
    const niche = Math.min(...MODULES.washer.widths);
    if (left >= niche) place('washer', niche);
    else dropped.push('Не остана ниша за пералня — махнахме я.');
  }

  if (needs.tall) {
    if (!place('bath-tall', 400)) dropped.push('Не остана място за колона — махнахме я.');
  }

  for (const width of fillWidths(left, MODULES['bath-drawers'].widths)) {
    base.push(make('bath-drawers', width));
    left -= width;
  }

  if (!base.length) place('vanity');

  /*
   * Огледалният шкаф стои точно над мивката, не над цялата стена:
   * огледало над пералнята не върши работа на никого.
   */
  const upper: KitchenModule[] = [];
  const vanity = base.find((m) => m.kind === 'vanity');
  if (needs.mirror && vanity) {
    const width = widestWithin('bath-mirror', vanity.width);
    if (width !== null) upper.push(make('bath-mirror', width));
  }

  return { base: numbered(base, 'auto-b'), upper: numbered(upper, 'auto-u'), dropped };
}

/* --- Коридор и антре -------------------------------------------------- */

export interface HallNeeds {
  /** Шкаф за връхни дрехи. */
  wardrobe: boolean;
  /** Шкаф за обувки. */
  shoes: boolean;
  /** Открита закачалка — по-удобна за всекидневното палто. */
  openRail: boolean;
  /** Пейка за събуване. */
  bench: boolean;
  /** Антресол над шкафовете. */
  attic: boolean;
}

export const DEFAULT_HALL: HallNeeds = {
  wardrobe: true,
  shoes: true,
  openRail: true,
  bench: false,
  attic: true,
};

/**
 * Коридорът се нарежда по важност: първо има къде да се закачи
 * палтото, после къде да се съберат обувките, и чак накрая удобства.
 * В тесен коридор отпада последното, не първото.
 */
export function hallLayout(wallLength: number, needs: HallNeeds): AutoLayout {
  const length = clampWallLength(wallLength);
  const dropped: string[] = [];
  const base: KitchenModule[] = [];
  let left = length;

  const place = (kind: ModuleKind, preferred?: number): boolean => {
    const width = widestWithin(kind, Math.min(left, preferred ?? Math.max(...MODULES[kind].widths)));
    if (width === null) return false;
    base.push(make(kind, width));
    left -= width;
    return true;
  };

  if (needs.wardrobe && !place('hall-wardrobe', 800)) {
    dropped.push('Стената не стига за шкаф за връхни дрехи.');
  }
  if (needs.openRail && !place('hall-open', 600)) {
    dropped.push('Не остана място за закачалка — махнахме я.');
  }
  if (needs.shoes && !place('shoe', 600)) {
    dropped.push('Не остана място за шкаф за обувки — махнахме го.');
  }
  if (needs.bench && !place('bench', 800)) {
    dropped.push('Не остана място за пейка — махнахме я.');
  }

  for (const width of fillWidths(left, MODULES.shoe.widths)) {
    base.push(make('shoe', width));
    left -= width;
  }

  if (!base.length) place('shoe');

  /* Антресолът стои над затворените шкафове, не над откритата закачалка. */
  const upper: KitchenModule[] = [];
  if (needs.attic) {
    const covered = base
      .filter((m) => m.kind !== 'hall-open' && m.kind !== 'bench' && m.kind !== 'hgap')
      .reduce((sum, m) => sum + m.width, 0);
    for (const width of fillWidths(covered, MODULES['hall-attic'].widths)) {
      upper.push(make('hall-attic', width));
    }
  }

  return { base: numbered(base, 'auto-b'), upper: numbered(upper, 'auto-u'), dropped };
}

/* --- Общият вход ---------------------------------------------------- */

export interface RoomNeeds {
  kitchen: KitchenNeeds;
  bedroom: BedroomNeeds;
  living: LivingNeeds;
  bath: BathNeeds;
  /** Коридорът и антрето се обзавеждат с едно и също. */
  hall: HallNeeds;
}

export const DEFAULT_ROOM_NEEDS: RoomNeeds = {
  kitchen: DEFAULT_NEEDS,
  bedroom: DEFAULT_BEDROOM,
  living: DEFAULT_LIVING,
  bath: DEFAULT_BATH,
  hall: DEFAULT_HALL,
};

/** Подреждането за избраната стая. */
export function layoutFor(room: RoomKind, wallLength: number, needs: RoomNeeds): AutoLayout {
  if (room === 'bedroom') return wardrobeLayout(wallLength, needs.bedroom);
  if (room === 'living') return livingLayout(wallLength, needs.living);
  if (room === 'bath') return bathLayout(wallLength, needs.bath);
  if (room === 'corridor' || room === 'hall') return hallLayout(wallLength, needs.hall);
  return autoLayout(wallLength, needs.kitchen);
}

/** Кой въпросник отговаря на тази стая. */
export const NEEDS_KEY: Record<RoomKind, keyof RoomNeeds> = {
  kitchen: 'kitchen',
  bedroom: 'bedroom',
  living: 'living',
  bath: 'bath',
  corridor: 'hall',
  hall: 'hall',
};
