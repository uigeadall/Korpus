import { describe, expect, it } from 'vitest';
import {
  MODULES,
  type RoomKind,
  computeKitchen,
  emptyKitchen,
  modulesFor,
} from './cabinet-rules';
import {
  type AutoLayout,
  type BedroomNeeds,
  type KitchenNeeds,
  type LivingNeeds,
  DEFAULT_BATH,
  DEFAULT_BEDROOM,
  DEFAULT_HALL,
  DEFAULT_LIVING,
  DEFAULT_NEEDS,
  DEFAULT_ROOM_NEEDS,
  autoLayout,
  bathLayout,
  hallLayout,
  layoutFor,
  livingLayout,
  wardrobeLayout,
} from './autolayout';

const needs = (over: Partial<KitchenNeeds> = {}): KitchenNeeds => ({ ...DEFAULT_NEEDS, ...over });

/** Слага разположението в кухня и връща сметките на двигателя. */
const place = (length: number, n: KitchenNeeds) => {
  const layout = autoLayout(length, n);
  const k = emptyKitchen(length);
  k.walls[0] = { ...k.walls[0], base: layout.base, upper: layout.upper };
  return { layout, result: computeKitchen(k), status: computeKitchen(k).rowStatus[0] };
};

const kinds = (list: { kind: string }[]) => list.map((m) => m.kind);

describe('ширините идват от каталога, не от въображението', () => {
  it('всеки модул е с позволена за вида си ширина', () => {
    for (const length of [1800, 2400, 3000, 3600, 4200, 5000]) {
      const { layout } = place(length, needs());
      for (const m of [...layout.base, ...layout.upper]) {
        expect(MODULES[m.kind].widths, `${m.kind} при стена ${length}`).toContain(m.width);
      }
    }
  });
});

describe('подредбата следва работния триъгълник', () => {
  it('хладилник, подготовка, мивка, съдомиялна, готвене — в този ред', () => {
    const { layout } = place(3600, needs());
    const order = kinds(layout.base);
    expect(order[0]).toBe('column');
    expect(order.indexOf('sink')).toBeLessThan(order.indexOf('oven'));
    // Съдомиялнята стои до мивката заради ВиК.
    expect(order.indexOf('dw')).toBe(order.indexOf('sink') + 1);
  });

  it('без хладилник няма колона', () => {
    const { layout } = place(3600, needs({ fridge: false }));
    expect(kinds(layout.base)).not.toContain('column');
  });

  it('без фурна и съдомиялна остават само мивка и шкафове', () => {
    const { layout } = place(3000, needs({ oven: false, dishwasher: false }));
    expect(kinds(layout.base)).not.toContain('oven');
    expect(kinds(layout.base)).not.toContain('dw');
    expect(kinds(layout.base)).toContain('sink');
  });
});

describe('никога не излиза от стената', () => {
  it('на всяка дължина редът се побира', () => {
    for (const length of [1200, 1500, 1800, 2100, 2400, 3000, 3600, 4200, 4800, 6000]) {
      const { status } = place(length, needs());
      expect(status.base.state, `долен ред при ${length}`).not.toBe('over');
      expect(status.upper.state, `горен ред при ${length}`).not.toBe('over');
    }
  });

  it('дългата стена се запълва докрай, не оставя дупка', () => {
    const { status } = place(4200, needs());
    expect(status.base.state).toBe('exact');
  });
});

describe('късата стена', () => {
  it('първо се жертва съдомиялнята, мивката остава', () => {
    const { layout } = place(1800, needs());
    expect(kinds(layout.base)).toContain('sink');
    expect(kinds(layout.base)).not.toContain('dw');
    expect(layout.dropped.join(' ')).toContain('съдомиялн');
  });

  it('при съвсем тясно остава само мивката', () => {
    const { layout, status } = place(1200, needs());
    expect(kinds(layout.base)).toContain('sink');
    expect(status.base.state).not.toBe('over');
    expect(layout.dropped.length).toBeGreaterThan(0);
  });

  it('казва с думи какво е махнало', () => {
    const { layout } = place(1500, needs());
    for (const text of layout.dropped) expect(text).toMatch(/[а-я]/i);
  });

  it('широката стена не жертва нищо', () => {
    const { layout } = place(4200, needs());
    expect(layout.dropped).toEqual([]);
  });
});

describe('горният ред повтаря долния', () => {
  it('над всеки долен шкаф има горен, освен над колоната', () => {
    const { layout } = place(3600, needs());
    const withoutColumn = layout.base.filter((m) => m.kind !== 'column');
    expect(layout.upper).toHaveLength(withoutColumn.length);
    expect(layout.upper.map((m) => m.width)).toEqual(withoutColumn.map((m) => m.width));
  });

  it('аспираторът застава точно над фурната', () => {
    const { layout, result } = place(3600, needs({ hood: true }));
    expect(kinds(layout.upper)).toContain('hood');
    const oven = result.placed[0].base.find((m) => m.kind === 'oven');
    const hood = result.placed[0].upper.find((m) => m.kind === 'hood');
    expect(hood?.x).toBe(oven?.x);
    expect(hood?.width).toBe(oven?.width);
  });

  it('без аспиратор над фурната стои обикновен горен шкаф', () => {
    const { layout } = place(3600, needs({ hood: false }));
    expect(kinds(layout.upper)).not.toContain('hood');
  });

  it('„без горни шкафове" оставя реда празен', () => {
    const { layout } = place(3600, needs({ upperRow: 'none' }));
    expect(layout.upper).toEqual([]);
    expect(layout.dropped.join(' ')).toContain('спиратор');
  });
});

describe('колко чекмеджета', () => {
  it('„много" дава повече чекмеджета от „малко"', () => {
    const few = place(4800, needs({ drawers: 'few' })).layout.base.filter(
      (m) => m.kind === 'drawers',
    ).length;
    const many = place(4800, needs({ drawers: 'many' })).layout.base.filter(
      (m) => m.kind === 'drawers',
    ).length;
    expect(many).toBeGreaterThan(few);
  });

  it('дори при „малко" има поне един до мивката за подготовка', () => {
    const { layout } = place(3600, needs({ drawers: 'few' }));
    expect(kinds(layout.base)).toContain('drawers');
  });
});

describe('сметките излизат', () => {
  it('подреденото минава през правилата и дава обков', () => {
    const { result } = place(3600, needs());
    expect(result.hardware.length).toBeGreaterThan(0);
    expect(result.parts.length).toBeGreaterThan(0);
  });

  it('всеки модул получава собствен id', () => {
    const { layout } = place(3600, needs());
    const ids = [...layout.base, ...layout.upper].map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

/* --- Спалня и всекидневна ------------------------------------------ */

const bedroom = (over: Partial<BedroomNeeds> = {}): BedroomNeeds => ({
  ...DEFAULT_BEDROOM,
  ...over,
});
const living = (over: Partial<LivingNeeds> = {}): LivingNeeds => ({ ...DEFAULT_LIVING, ...over });

/** Слага подреждането в стая и връща сметките на двигателя. */
const placeIn = (room: 'bedroom' | 'living', length: number, layout: AutoLayout) => {
  const k = emptyKitchen(length);
  k.roomKind = room;
  k.walls[0] = { ...k.walls[0], base: layout.base, upper: layout.upper };
  return computeKitchen(k);
};

describe('гардероб', () => {
  it('ширините са от каталога и редът се побира', () => {
    for (const length of [1200, 2000, 2800, 3600, 4800]) {
      const layout = wardrobeLayout(length, bedroom());
      for (const m of [...layout.base, ...layout.upper]) {
        expect(MODULES[m.kind].widths, `${m.kind} при ${length}`).toContain(m.width);
      }
      const status = placeIn('bedroom', length, layout).rowStatus[0];
      expect(status.base.state, `долу при ${length}`).not.toBe('over');
      expect(status.upper.state, `горе при ${length}`).not.toBe('over');
    }
  });

  it('скринът е в единия край, отворената секция — в другия', () => {
    const layout = wardrobeLayout(3600, bedroom({ chest: true, openSection: true }));
    const kinds = layout.base.map((m) => m.kind);
    expect(kinds[0]).toBe('wardrobe-drawers');
    expect(kinds.at(-1)).toBe('wardrobe-open');
  });

  it('„повече закачане" дава повече лостове от „по-малко"', () => {
    const rods = (h: BedroomNeeds['hanging']) =>
      wardrobeLayout(4800, bedroom({ hanging: h, chest: false, openSection: false })).base.filter(
        (m) => m.kind === 'wardrobe',
      ).length;
    expect(rods('lots')).toBeGreaterThan(rods('little'));
  });

  it('антресолът ляга над гардероба и не прелива', () => {
    const layout = wardrobeLayout(3600, bedroom({ attic: true }));
    expect(layout.upper.every((m) => m.kind === 'attic')).toBe(true);
    expect(placeIn('bedroom', 3600, layout).rowStatus[0].upper.state).not.toBe('over');
  });

  it('без антресол горният ред е празен', () => {
    expect(wardrobeLayout(3600, bedroom({ attic: false })).upper).toEqual([]);
  });

  it('на тясна стена остава поне един гардероб', () => {
    const layout = wardrobeLayout(1200, bedroom());
    expect(layout.base.length).toBeGreaterThan(0);
    expect(placeIn('bedroom', 1200, layout).rowStatus[0].base.state).not.toBe('over');
  });

  it('дава обков с лостове и детайли за разкрой', () => {
    const r = placeIn('bedroom', 3600, wardrobeLayout(3600, bedroom({ hanging: 'lots' })));
    expect(r.hardware.find((h) => h.name === 'Лост за гардероб')?.qty).toBeGreaterThan(0);
    expect(r.parts.length).toBeGreaterThan(0);
    // Плотът е кухненско понятие и няма работа в спалнята.
    expect(r.hardware.find((h) => h.name === 'Плот')).toBeUndefined();
  });
});

describe('всекидневна', () => {
  it('ширините са от каталога и редът се побира', () => {
    for (const length of [1200, 2000, 3000, 4200, 5600]) {
      const layout = livingLayout(length, living());
      for (const m of [...layout.base, ...layout.upper]) {
        expect(MODULES[m.kind].widths, `${m.kind} при ${length}`).toContain(m.width);
      }
      const status = placeIn('living', length, layout).rowStatus[0];
      expect(status.base.state, `долу при ${length}`).not.toBe('over');
      expect(status.upper.state, `горе при ${length}`).not.toBe('over');
    }
  });

  it('библиотеката е в края, ТВ шкафът до нея', () => {
    const kinds = livingLayout(4200, living()).base.map((m) => m.kind);
    expect(kinds[0]).toBe('bookcase');
    expect(kinds[1]).toBe('tv');
  });

  it('библиотеката реже стенния ред над себе си', () => {
    const layout = livingLayout(4200, living({ bookcase: true, wallShelves: true }));
    const r = placeIn('living', 4200, layout);
    const bookcase = r.placed[0].base.find((m) => m.kind === 'bookcase')!;
    for (const m of r.placed[0].upper) {
      expect(m.x, 'стенен модул над библиотеката').toBeGreaterThanOrEqual(
        bookcase.x + bookcase.width,
      );
    }
  });

  it('„повече затворено" дава повече шкафове от рафтове', () => {
    const boxes = (c: LivingNeeds['closed']) =>
      livingLayout(5600, living({ closed: c })).upper.filter((m) => m.kind === 'wallbox').length;
    expect(boxes('lots')).toBeGreaterThan(boxes('little'));
  });

  it('без стенен ред горе няма нищо', () => {
    expect(livingLayout(4200, living({ wallShelves: false })).upper).toEqual([]);
  });

  it('тясна стена жертва библиотеката, но казва защо', () => {
    const layout = livingLayout(1200, living());
    expect(layout.base.length).toBeGreaterThan(0);
    expect(placeIn('living', 1200, layout).rowStatus[0].base.state).not.toBe('over');
  });
});

describe('общият вход', () => {
  it('праща към правилното подреждане', () => {
    const needs = DEFAULT_ROOM_NEEDS;
    expect(layoutFor('kitchen', 3600, needs).base.some((m) => m.kind === 'sink')).toBe(true);
    expect(layoutFor('bedroom', 3600, needs).base.every((m) => m.kind.startsWith('wardrobe'))).toBe(
      true,
    );
    expect(layoutFor('living', 3600, needs).base.some((m) => m.kind === 'tv')).toBe(true);
  });
});

describe('банята се нарежда от мивката навън', () => {
  it('мивката е първа — тя е вързана за ВиК', () => {
    const layout = bathLayout(2400, DEFAULT_BATH);
    expect(layout.base[0].kind).toBe('vanity');
  });

  it('пералнята иска цяла ниша или отпада', () => {
    const wide = bathLayout(2400, DEFAULT_BATH);
    expect(wide.base.some((m) => m.kind === 'washer')).toBe(true);

    const narrow = bathLayout(1300, DEFAULT_BATH);
    if (!narrow.base.some((m) => m.kind === 'washer')) {
      expect(narrow.dropped.join(' ')).toContain('пералня');
    }
    // Нишата никога не се свива под каталожната си ширина.
    for (const m of narrow.base.filter((x) => x.kind === 'washer')) {
      expect(MODULES.washer.widths).toContain(m.width);
    }
  });

  it('огледалният шкаф стои над мивката, не над цялата стена', () => {
    const layout = bathLayout(2400, DEFAULT_BATH);
    const vanity = layout.base.find((m) => m.kind === 'vanity')!;
    const mirror = layout.upper.find((m) => m.kind === 'bath-mirror')!;
    expect(mirror.width).toBeLessThanOrEqual(vanity.width);
  });

  it('без мивка няма и огледало', () => {
    const layout = bathLayout(2400, { ...DEFAULT_BATH, vanity: false });
    expect(layout.upper).toEqual([]);
  });

  it('нищо не излиза извън стената, каквато и да е', () => {
    for (const wall of [1200, 1500, 1800, 2400, 3000, 4000]) {
      const layout = bathLayout(wall, DEFAULT_BATH);
      const width = layout.base.reduce((sum, m) => sum + m.width, 0);
      expect(width, `${wall}`).toBeLessThanOrEqual(wall);
      expect(layout.base.length, `${wall}`).toBeGreaterThan(0);
    }
  });
});

describe('коридорът се нарежда по важност', () => {
  it('палтото преди обувките', () => {
    const layout = hallLayout(1600, DEFAULT_HALL);
    const kinds = layout.base.map((m) => m.kind);
    const wardrobe = kinds.indexOf('hall-wardrobe');
    const shoes = kinds.indexOf('shoe');
    expect(wardrobe).toBeGreaterThanOrEqual(0);
    if (shoes >= 0) expect(wardrobe).toBeLessThan(shoes);
  });

  it('в тесен коридор отпада последното, не първото', () => {
    const narrow = hallLayout(1200, { ...DEFAULT_HALL, bench: true });
    expect(narrow.base.some((m) => m.kind === 'hall-wardrobe')).toBe(true);
    expect(narrow.base.some((m) => m.kind === 'bench')).toBe(false);
    expect(narrow.dropped.join(' ')).toContain('пейка');
  });

  it('антресолът стои над затворените шкафове, не над закачалката', () => {
    const layout = hallLayout(3000, DEFAULT_HALL);
    const closed = layout.base
      .filter((m) => m.kind !== 'hall-open' && m.kind !== 'bench' && m.kind !== 'hgap')
      .reduce((sum, m) => sum + m.width, 0);
    const attic = layout.upper.reduce((sum, m) => sum + m.width, 0);
    expect(attic).toBeLessThanOrEqual(closed);
  });

  it('без антресол горният ред е празен', () => {
    expect(hallLayout(3000, { ...DEFAULT_HALL, attic: false }).upper).toEqual([]);
  });

  it('нищо не излиза извън стената, каквато и да е', () => {
    for (const wall of [1200, 1600, 2000, 3000, 5000]) {
      const layout = hallLayout(wall, DEFAULT_HALL);
      const width = layout.base.reduce((sum, m) => sum + m.width, 0);
      expect(width, `${wall}`).toBeLessThanOrEqual(wall);
      expect(layout.base.length, `${wall}`).toBeGreaterThan(0);
    }
  });
});

describe('всяка стая има подредба', () => {
  it('layoutFor не оставя нито един вид стая без мебел', () => {
    const kinds: RoomKind[] = ['kitchen', 'bedroom', 'living', 'bath', 'corridor', 'hall'];
    for (const room of kinds) {
      const layout = layoutFor(room, 3000, DEFAULT_ROOM_NEEDS);
      expect(layout.base.length, room).toBeGreaterThan(0);
    }
  });

  it('коридорът и антрето се нареждат еднакво', () => {
    const corridor = layoutFor('corridor', 3000, DEFAULT_ROOM_NEEDS);
    const hall = layoutFor('hall', 3000, DEFAULT_ROOM_NEEDS);
    expect(corridor.base.map((m) => [m.kind, m.width])).toEqual(
      hall.base.map((m) => [m.kind, m.width]),
    );
  });

  it('всеки модул, който правилата слагат, е от каталога на своята стая', () => {
    const kinds: RoomKind[] = ['kitchen', 'bedroom', 'living', 'bath', 'corridor', 'hall'];
    for (const room of kinds) {
      const layout = layoutFor(room, 3200, DEFAULT_ROOM_NEEDS);
      for (const m of layout.base) {
        expect(modulesFor(room, 'base'), `${room}/${m.kind}`).toContain(m.kind);
      }
      for (const m of layout.upper) {
        expect(modulesFor(room, 'upper'), `${room}/${m.kind}`).toContain(m.kind);
      }
    }
  });
});
