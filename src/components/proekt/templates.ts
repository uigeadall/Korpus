/**
 * Готови стаи — откъдето клиентът може да тръгне, вместо от празно.
 *
 * Шаблонът не е отделен вид проект. Той е набор отговори на въпросите
 * в потока: стая, мерки, какво да има, цветове, стени. Мебелта после я
 * подреждат същите правила, както ако човек беше отговорил сам. Затова
 * всеки шаблон остава жив — смени ли се размер или отговор, мебелта се
 * пренарежда, вместо да остане залепена картинка.
 *
 * Цветовете и плотовете са от същите списъци, от които избира клиентът;
 * тест пази шаблон да не сочи към нещо, което го няма.
 */

import { type RoomKind, type WorktopType, clampWallLength } from '@/lib/cabinet-rules';
import {
  type RoomNeeds,
  DEFAULT_ROOM_NEEDS,
  NEEDS_KEY,
} from '@/lib/autolayout';
import type { WallFinishChoice } from '@/lib/wall-finish';
import { type Answers, type ExtraWalls, START, furnitureFrom } from './answers';
import type { KitchenModule } from '@/lib/cabinet-rules';
import type { T3 } from '@/i18n/tekst';

export interface Template {
  /** Постоянен ключ — за тестовете и за адреса. */
  id: string;
  name: T3;
  /** Един ред под името: какво има вътре. */
  note: T3;
  room: RoomKind;
  roomWidth: number;
  roomDepth: number;
  wallLength: number;
  /** Само разликите от подразбиращите се отговори за тази стая. */
  needs?: Partial<RoomNeeds[keyof RoomNeeds]>;
  facadeColor: string;
  carcassColor: string;
  worktop: WorktopType;
  wallFinish?: WallFinishChoice;
  /** Подът — ключ от `config/floor-finishes`. */
  floorFinish?: string;
  /** Мебел и по другите стени — Г- и П-образни стаи. */
  extra?: ExtraWalls;
}

/** Модул за шаблон — с постоянно име, за да се помнят рафтовете му. */
const m = (id: string, kind: KitchenModule['kind'], width = 600): KitchenModule => ({
  id,
  kind,
  width,
  hingeSide: 'right',
});

export const TEMPLATES: readonly Template[] = [
  {
    id: 'kuhnya-svetla',
    name: { bg: 'Светла права кухня', en: 'Bright straight kitchen', zh: '明亮一字型厨房' },
    note: { bg: '3,6 м · горен ред · бели метро плочки', en: '3.6 m · upper row · white metro tiles', zh: '3.6 米 · 上排柜 · 白色地铁砖' },
    room: 'kitchen',
    roomWidth: 4200,
    roomDepth: 3200,
    wallLength: 3600,
    facadeColor: 'RAL 9010 чисто бяло',
    carcassColor: 'Бял',
    worktop: 'quartz20',
    wallFinish: { all: 'boya-default', sides: { top: 'plochki-metro-white' } },
    floorFinish: 'pod-laminat-natural',
  },
  {
    id: 'kuhnya-tamna',
    name: { bg: 'Тъмна кухня без горни шкафове', en: 'Dark kitchen without wall units', zh: '无吊柜深色厨房' },
    note: { bg: '3,6 м · много чекмеджета · тухлена стена', en: '3.6 m · lots of drawers · brick wall', zh: '3.6 米 · 多抽屉 · 砖墙' },
    room: 'kitchen',
    roomWidth: 4200,
    roomDepth: 3400,
    wallLength: 3600,
    needs: { upperRow: 'none', drawers: 'many', hood: false },
    facadeColor: 'RAL 7016 антрацит',
    carcassColor: 'Антрацит',
    worktop: 'sintered12',
    wallFinish: { all: 'boya-greige', sides: { top: 'tuhla-red-r' } },
    floorFinish: 'pod-parket-riba-walnut',
  },
  {
    id: 'kuhnya-g',
    name: { bg: 'Г-образна кухня', en: 'L-shaped kitchen', zh: 'L 型厨房' },
    note: { bg: 'горна и лява стена · сляп ъгъл · дъб', en: 'top and left walls · blind corner · oak', zh: '上墙和左墙 · 转角盲区 · 橡木' },
    room: 'kitchen',
    roomWidth: 4200,
    roomDepth: 3400,
    wallLength: 4200,
    facadeColor: 'RAL 9001 кремаво',
    carcassColor: 'Светъл дъб',
    worktop: 'quartz20',
    wallFinish: { all: 'boya-default', sides: { top: 'plochki-metro-white', left: 'plochki-metro-white' } },
    floorFinish: 'pod-laminat-natural',
    extra: {
      left: {
        base: [m('g-l1', 'drawers'), m('g-l2', 'door'), m('g-l3', 'door', 450)],
        upper: [m('g-u1', 'upper'), m('g-u2', 'upper'), m('g-u3', 'upper', 450)],
      },
    },
  },
  {
    id: 'kuhnya-malka',
    name: { bg: 'Малка кухня', en: 'Small kitchen', zh: '小厨房' },
    note: { bg: '2,4 м · без съдомиялна · зелени фасади', en: '2.4 m · no dishwasher · green fronts', zh: '2.4 米 · 无洗碗机 · 绿色门板' },
    room: 'kitchen',
    roomWidth: 2800,
    roomDepth: 2600,
    wallLength: 2400,
    needs: { dishwasher: false, drawers: 'few' },
    facadeColor: 'RAL 6013 тръстика',
    carcassColor: 'Светъл дъб',
    worktop: 'laminate38',
    wallFinish: { all: 'boya-default', sides: { top: 'plochki-zellige-white' } },
    floorFinish: 'pod-laminat-grey',
  },
  {
    id: 'spalnya-garderob',
    name: { bg: 'Спалня с гардероб до тавана', en: 'Bedroom with floor-to-ceiling wardrobe', zh: '通顶衣柜卧室' },
    note: { bg: '3 м гардероб · антресол · скрин', en: '3 m wardrobe · top boxes · chest of drawers', zh: '3 米衣柜 · 顶柜 · 斗柜' },
    room: 'bedroom',
    roomWidth: 3600,
    roomDepth: 3400,
    wallLength: 3000,
    needs: { hanging: 'lots', chest: true, attic: true },
    facadeColor: 'RAL 9001 кремаво',
    carcassColor: 'Светъл дъб',
    worktop: 'laminate38',
    wallFinish: { all: 'boya-greige', sides: { left: 'tapet-damask-cream' } },
    floorFinish: 'pod-kilim-beige',
  },
  {
    id: 'hol-tv',
    name: { bg: 'Хол с ТВ стена', en: 'Living room with TV wall', zh: '带电视墙的客厅' },
    note: { bg: 'ТВ шкаф · библиотека · ламели зад телевизора', en: 'TV unit · bookcase · slats behind the TV', zh: '电视柜 · 书柜 · 电视背景格栅' },
    room: 'living',
    roomWidth: 4800,
    roomDepth: 3800,
    wallLength: 3600,
    facadeColor: 'RAL 5008 сиво синьо',
    carcassColor: 'Светъл дъб',
    worktop: 'laminate38',
    wallFinish: { all: 'boya-pearl', sides: { top: 'darvo-lameli-oak' } },
    floorFinish: 'pod-parket-riba-oak',
  },
  {
    id: 'banya',
    name: { bg: 'Баня с колона и пералня', en: 'Bathroom with tall unit and washer', zh: '带高柜和洗衣机的浴室' },
    note: { bg: 'шкаф с мивка · колона · огледален шкаф', en: 'vanity unit · tall unit · mirror cabinet', zh: '台盆柜 · 高柜 · 镜柜' },
    room: 'bath',
    roomWidth: 2400,
    roomDepth: 2200,
    wallLength: 2200,
    facadeColor: 'RAL 9010 чисто бяло',
    carcassColor: 'Бял',
    worktop: 'laminate38',
    wallFinish: { all: 'plochki-60x30-greige' },
  },
  {
    id: 'antre',
    name: { bg: 'Антре с пейка', en: 'Entrance hall with bench', zh: '带换鞋凳的玄关' },
    note: { bg: 'обувки · закачалка · пейка за събуване', en: 'shoes · coat rack · shoe bench', zh: '鞋柜 · 挂衣架 · 换鞋凳' },
    room: 'hall',
    roomWidth: 2800,
    roomDepth: 1800,
    wallLength: 2600,
    needs: { bench: true },
    facadeColor: 'RAL 7035 светло сиво',
    carcassColor: 'Бял',
    worktop: 'laminate38',
    wallFinish: { all: 'boya-pearl' },
    floorFinish: 'pod-laminat-grey',
  },
  {
    id: 'koridor',
    name: { bg: 'Коридор с ламперия', en: 'Corridor with panelling', zh: '带护墙板的走廊' },
    note: { bg: 'плитки шкафове · антресол · ламперия', en: 'shallow cabinets · top boxes · panelling', zh: '浅柜 · 顶柜 · 护墙板' },
    room: 'corridor',
    roomWidth: 3200,
    roomDepth: 1400,
    wallLength: 3000,
    facadeColor: 'RAL 9010 чисто бяло',
    carcassColor: 'Бял',
    worktop: 'laminate38',
    wallFinish: { all: 'paneli-lamperia-white' },
    floorFinish: 'pod-parket-lenti',
  },
];

/**
 * Шаблонът като промяна по отговорите.
 *
 * Носи всичко, което е на стаята — и мерките, и празната ръчна мебел, и
 * стените. Иначе смяната на стаята в `answers()` би извадила запомненото
 * от миналия път и шаблонът щеше да излезе смесен с чужда мебел.
 */
export function templatePatch(
  t: Template,
  /**
   * Стаята, която вече е начертана в жилището. Шаблонът тогава носи
   * мебелта си, но не и мерките: иначе стаята от чертежа ставаше
   * 4,80 × 3,80, защото шаблонът е такъв, и мебелта излизаше през
   * зидовете в макета.
   */
  room?: { width: number; depth: number },
): Partial<Answers> {
  const key = NEEDS_KEY[t.room];
  const needs: RoomNeeds = {
    ...DEFAULT_ROOM_NEEDS,
    [key]: { ...DEFAULT_ROOM_NEEDS[key], ...t.needs },
  };
  return {
    room: t.room,
    roomWidth: room?.width ?? t.roomWidth,
    roomDepth: room?.depth ?? t.roomDepth,
    wallLength: room ? clampWallLength(Math.min(t.wallLength, room.width)) : t.wallLength,
    needs,
    facadeColor: t.facadeColor,
    carcassColor: t.carcassColor,
    worktop: t.worktop,
    wallFinish: t.wallFinish,
    floorFinish: t.floorFinish,
    extra: t.extra,
    // Правилата подреждат — шаблонът е отговори, не готова мебел.
    byHand: false,
    hand: { base: [], upper: [] },
    shelves: {},
    furnishings: [],
    door: undefined,
    windows: undefined,
    /*
     * `opened` нарочно липсва. Присъствието му в промяната казва на
     * `answers()` „това е донесен проект" и тогава текущата стая не се
     * прибира — наредената на ръка спалня би изчезнала. Без него
     * донесеното отпада само, както при всеки отговор.
     */
  };
}

/** Каквото ще излезе от шаблона — за малката картинка и за тестовете. */
export function templateKitchen(t: Template) {
  return furnitureFrom({ ...START, ...templatePatch(t) } as Answers);
}
