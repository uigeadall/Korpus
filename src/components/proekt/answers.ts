/**
 * Отговорите на водения поток — и правилото какво става с тях.
 *
 * Стои отделно от компонента, защото това не е рисуване, а решение:
 * кога нареденото оцелява и кога отпада. Такова нещо се проверява с
 * тест, а тест през React е проверка на React, не на правилото.
 */

import {
  DEFAULT_MATERIALS,
  type Kitchen,
  type KitchenModule,
  RULES_VERSION,
  type RoomDoor,
  type RoomKind,
  type RoomWindow,
  type WorktopType,
  clampDoor,
  clampWindow,
  defaultDoor,
  kitchenDoor,
  kitchenWindows,
} from '@/lib/cabinet-rules';
import { type RoomNeeds, DEFAULT_ROOM_NEEDS, layoutFor } from '@/lib/autolayout';
import { CARCASS_COLORS } from '@/config/materials';
import { type Furnishing, FURNISHINGS } from '@/lib/furnishings';

export interface Answers {
  room: RoomKind;
  roomWidth: number;
  roomDepth: number;
  wallLength: number;
  needs: RoomNeeds;
  facadeColor: string;
  carcassColor: string;
  worktop: WorktopType;
  /**
   * Рафтове, които клиентът е завлякъл в конкретен шкаф. Пазят се по
   * идентификатор, защото подреждането се преизчислява при всеки
   * отговор; смени ли се то, старите ключове просто вече ги няма.
   */
  shelves: Record<string, number>;
  /** Готовите изделия в стаята — маса, диван, легло. Не се режат. */
  furnishings: Furnishing[];
  /**
   * Къде се влиза. Няма стая без врата: липсва ли отговор, взема се
   * подразбиращата се за тази стая и човекът я мести оттам.
   */
  door?: RoomDoor;
  /** Прозорците в стаята. Празно значи стая без прозорец, не „още не". */
  windows?: RoomWindow[];
  /**
   * Проект, отворен по линк. Показва се както е дошъл; пипне ли се
   * който и да е въпрос, правилата подреждат наново и това отпада.
   */
  opened?: Kitchen;
  /**
   * Стаята се отваря празна и човек я нарежда сам.
   *
   * Това е редът по подразбиране: влизаш в помещение, виждаш го голо и
   * слагаш в него каквото ти трябва. Правилата остават на един бутон —
   * който иска готово, го получава, но не му се налага.
   */
  byHand: boolean;
  /**
   * Модулите, сложени на ръка. В ръчен режим те са мебелта.
   *
   * Стоят тук, а не в `opened`, нарочно: `opened` отпада при всеки
   * пипнат въпрос, защото правилата подреждат наново. Нареденото на
   * ръка няма какво да се преподрежда и не бива да се губи, когато
   * човек промени ширината на стената.
   */
  hand: { base: KitchenModule[]; upper: KitchenModule[] };
  /**
   * Какво е оставено в другите стаи.
   *
   * Живите полета горе са на стаята, в която сме сега; тук чакат
   * останалите. Смени ли се стаята, текущата се прибира и на нейно
   * място излиза тази, която се отваря — такава, каквато е оставена.
   *
   * Първата поправка на този проблем беше да се изчисти нареденото при
   * смяна на стаята, за да не изтича от спалнята в кухнята. Това спря
   * изтичането, като изтри работата — по-лошо от самия бъг. Мебелта не
   * е на отговорите, а на стаята.
   */
  stash: Partial<Record<RoomKind, RoomSlice>>;
}

/** Онова от отговорите, което е на стаята, а не на целия проект. */
export interface RoomSlice {
  roomWidth: number;
  roomDepth: number;
  wallLength: number;
  byHand: boolean;
  hand: { base: KitchenModule[]; upper: KitchenModule[] };
  shelves: Record<string, number>;
  furnishings: Furnishing[];
  door?: RoomDoor;
  windows?: RoomWindow[];
}

const SLICE_KEYS = [
  'roomWidth',
  'roomDepth',
  'wallLength',
  'byHand',
  'hand',
  'shelves',
  'furnishings',
  'door',
  'windows',
] as const satisfies readonly (keyof RoomSlice)[];

/** Каквото тази стая носи със себе си. */
export function sliceOf(a: Answers): RoomSlice {
  return {
    roomWidth: a.roomWidth,
    roomDepth: a.roomDepth,
    wallLength: a.wallLength,
    byHand: a.byHand,
    hand: a.hand,
    shelves: a.shelves,
    furnishings: a.furnishings,
    door: a.door,
    windows: a.windows,
  };
}

/**
 * Празна стая: мебелта пада, мерките остават.
 *
 * Първото влизане в непипана стая взема размерите, с които човек е
 * дошъл — те са на жилището, не на стаята, и да скочат на фабрични
 * числа би изглеждало като грешка.
 */
function freshSlice(a: Answers): RoomSlice {
  return {
    ...sliceOf(a),
    byHand: true,
    hand: { base: [], upper: [] },
    shelves: {},
    furnishings: [],
  };
}

export const START: Answers = {
  room: 'kitchen',
  roomWidth: 4200,
  roomDepth: 3200,
  wallLength: 3600,
  needs: DEFAULT_ROOM_NEEDS,
  /*
   * Светла фасада по подразбиране. Тъмносиньото стоеше тук, за да личат
   * шкафовете — бяло върху бял корпус наистина не се чете. Но то правеше
   * всеки изглед мрачен, а това е първото, което клиентът вижда от
   * работата ни. Четливостта я носят фугите и сенките по ръбовете, не
   * цветът.
   */
  facadeColor: 'RAL 9001 кремаво',
  carcassColor: CARCASS_COLORS[0].name,
  worktop: 'laminate38',
  shelves: {},
  furnishings: [],
  byHand: true,
  hand: { base: [], upper: [] },
  stash: {},
};

/** Отговорите стават конфигурация. Нито една ширина не се избира от клиента. */
export function furnitureFrom(a: Answers): Kitchen {
  // В ръчен режим мебелта е това, което човек е сложил — празно в
  // началото. Иначе подреждат правилата.
  const layout = a.byHand ? a.hand : layoutFor(a.room, a.wallLength, a.needs);
  const room = { width: a.roomWidth, depth: a.roomDepth };
  const withShelves = (list: typeof layout.base) =>
    list.map((m) => (m.id in a.shelves ? { ...m, shelves: a.shelves[m.id] } : m));
  return {
    roomKind: a.room,
    room,
    // Мебелта е на горната стена, затова вратата по подразбиране пада
    // на съседна — вкарва се в зида при всяка промяна на стаята.
    door: clampDoor(room, a.door ?? defaultDoor(room, 'top')),
    windows: (a.windows ?? []).map((w) => clampWindow(room, w)),
    walls: [
      {
        id: 'proekt-wall-1',
        side: 'top',
        length: a.wallLength,
        base: withShelves(layout.base),
        upper: withShelves(layout.upper),
      },
    ],
    furnishings: a.furnishings,
    materials: {
      ...DEFAULT_MATERIALS,
      carcassColor: a.carcassColor,
      facade: { ...DEFAULT_MATERIALS.facade, color: a.facadeColor },
      worktop: a.worktop,
    },
    rulesVersion: RULES_VERSION,
  };
}

/**
 * Отворен по линк проект се връща в отговори. Самите въпроси не се
 * пазят в линка — пази се резултатът, затова състава го няма. Това е
 * нарочно: линкът носи мебелта, а не пътя до нея.
 */
export function fromKitchen(k: Kitchen): Partial<Answers> {
  const wall = k.walls[0];
  return {
    room: k.roomKind ?? 'kitchen',
    roomWidth: k.room?.width ?? START.roomWidth,
    roomDepth: k.room?.depth ?? START.roomDepth,
    wallLength: wall.length,
    facadeColor: k.materials.facade.color,
    carcassColor: k.materials.carcassColor,
    worktop: k.materials.worktop,
    furnishings: k.furnishings ?? [],
    // Донесеният проект вече е подреден; оттук нататък го водят
    // правилата, както беше и преди ръчният режим да съществува.
    byHand: false,
    door: kitchenDoor(k),
    windows: kitchenWindows(k),
    shelves: Object.fromEntries(
      [...wall.base, ...wall.upper]
        .filter((m) => m.shelves !== undefined)
        .map((m) => [m.id, m.shelves as number]),
    ),
    opened: k,
  };
}

export const ANSWERS_KEY = 'korpus:proekt:v2';

export type AnswerPatch = Partial<Answers> | ((prev: Answers) => Partial<Answers>);

/**
 * Къде да застане нов предмет. Всеки вид си има обичайно място спрямо
 * стената с мебелта: диванът срещу нея, холната маса между двете,
 * столовете около масата. Еднаквите се нареждат един до друг, вместо
 * да се трупат на купчина.
 */
const SPOT: Record<Furnishing['kind'], { depth: number; side: number }> = {
  sofa: { depth: 0.66, side: 0 },
  'coffee-table': { depth: 0.34, side: 0 },
  armchair: { depth: 0.45, side: -0.32 },
  'dining-table': { depth: 0.58, side: 0 },
  chair: { depth: 0.58, side: 0 },
  // Леглото стои далеч от стената с гардероба, за да се отварят вратите.
  bed: { depth: 0.82, side: 0 },
  nightstand: { depth: 0.82, side: -0.32 },
};

export function place(a: Answers, kind: Furnishing['kind']): Furnishing {
  const spec = FURNISHINGS[kind];
  const spot = SPOT[kind];
  const sameKind = a.furnishings.filter((f) => f.kind === kind).length;

  /*
   * Нощните шкафчета отиват до главата на леглото, ако има легло.
   * Иначе биха застанали някъде по средата на стаята.
   */
  const bed = a.furnishings.find((f) => f.kind === 'bed');
  if (kind === 'nightstand' && bed) {
    const bedSpec = FURNISHINGS.bed;
    const side = a.furnishings.filter((f) => f.kind === 'nightstand').length % 2 ? 1 : -1;
    return {
      id: `f${Date.now().toString(36)}-${a.furnishings.length}`,
      kind,
      x: Math.max(
        spec.width / 2,
        Math.min(
          a.roomWidth - spec.width / 2,
          bed.x + side * (bedSpec.width / 2 + spec.width / 2 + 80),
        ),
      ),
      z: Math.max(spec.depth / 2, bed.z - bedSpec.depth / 2 + spec.depth / 2),
      rotation: 0,
    };
  }

  // Столовете обикалят масата; останалите еднакви се редят настрани.
  const around =
    kind === 'chair'
      ? [
          { dx: -600, dz: -700 },
          { dx: 600, dz: -700 },
          { dx: -600, dz: 700 },
          { dx: 600, dz: 700 },
          { dx: -1100, dz: 0 },
          { dx: 1100, dz: 0 },
        ][sameKind % 6]
      : { dx: sameKind * (spec.width + 200), dz: 0 };

  const clamp = (v: number, size: number, limit: number) =>
    Math.max(size / 2, Math.min(limit - size / 2, v));

  const wanted = {
    x: clamp(a.roomWidth * (0.5 + spot.side) + around.dx, spec.width, a.roomWidth),
    z: clamp(a.roomDepth * spot.depth + around.dz, spec.depth, a.roomDepth),
  };

  /*
   * Столовете се подпъхват под масата и затова се застъпват с нея по
   * план — това е наред. Всичко останало се отмества, докато престане
   * да стои върху вече сложеното; иначе диванът поглъща фотьойла.
   */
  const spread = kind === 'chair' ? wanted : freeSpot(a, kind, wanted);

  return {
    id: `f${Date.now().toString(36)}-${a.furnishings.length}`,
    kind,
    x: clamp(spread.x, spec.width, a.roomWidth),
    z: clamp(spread.z, spec.depth, a.roomDepth),
    rotation: 0,
  };
}

/** Най-близкото свободно място около желаното. */
function freeSpot(a: Answers, kind: Furnishing['kind'], want: { x: number; z: number }) {
  const spec = FURNISHINGS[kind];
  const taken = a.furnishings
    .filter((f) => f.kind !== 'chair')
    .map((f) => ({ ...FURNISHINGS[f.kind], x: f.x, z: f.z }));

  const clashes = (x: number, z: number) =>
    taken.some(
      (t) =>
        Math.abs(t.x - x) < (t.width + spec.width) / 2 + 150 &&
        Math.abs(t.z - z) < (t.depth + spec.depth) / 2 + 150,
    );

  const ring = [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ];
  for (let r = 0; r < 8; r++) {
    for (const [dx, dz] of ring) {
      const x = want.x + dx * r * 450;
      const z = want.z + dz * r * 450;
      if (x < 0 || z < 0 || x > a.roomWidth || z > a.roomDepth) continue;
      if (!clashes(x, z)) return { x, z };
    }
  }
  return want;
}

export function answers(state: Answers, patch: AnswerPatch): Answers {
  const delta = typeof patch === 'function' ? patch(state) : patch;
  const next = { ...state, ...delta };
  const touched = Object.keys(delta);

  /*
   * Вратата е на стаята, а не въпрос за мебелта: местенето ѝ не
   * пренарежда шкафовете и затова не бута донесения по линк проект —
   * само вратата в него.
   */
  if (touched.length > 0 && touched.every((key) => key === 'door' || key === 'windows')) {
    if (state.opened) {
      next.opened = {
        ...state.opened,
        ...(next.door ? { door: next.door } : {}),
        ...(next.windows ? { windows: next.windows } : {}),
      };
    }
    return next;
  }

  /*
   * Смени ли се стаята, нареденото остава в предишната.
   *
   * Гардеробът няма какво да прави в кухнята: всяка стая си има свой
   * каталог и модулите на едната не са модули на другата. Без това
   * трите гардероба от спалнята се появяваха в кухнята — мебелта се
   * пазеше в отговорите, а отговорите преживяваха смяната.
   *
   * Донесен по линк проект е изключение: той носи и стаята си, и
   * мебелта си наведнъж, и няма какво да се чисти преди него.
   */
  if ('room' in delta && delta.room !== state.room && !('opened' in delta)) {
    /*
     * Текущата стая се прибира каквато е, а на нейно място излиза
     * тази, която се отваря. Непипана стая се отваря празна, но с
     * мерките, с които човек е дошъл.
     */
    const stash = { ...state.stash, [state.room]: sliceOf(state) };
    const saved = stash[delta.room as RoomKind] ?? freshSlice(state);

    for (const key of SLICE_KEYS) {
      // Каквото самата промяна носи, остава: тя знае повече от
      // прибраното. Така идването от чертежа на жилището отваря стаята
      // с неговите мерки, а не със запомнените.
      if (!(key in delta)) (next as Record<string, unknown>)[key] = saved[key];
    }

    next.stash = stash;
    next.opened = undefined;
    return next;
  }

  // Всяка друга промяна по въпросите отменя донесения проект — оттук
  // нататък подреждат правилата.
  if (!('opened' in delta)) next.opened = undefined;
  return next;
}
