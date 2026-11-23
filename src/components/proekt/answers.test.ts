import { describe, expect, it } from 'vitest';
import { emptyKitchen } from '@/lib/cabinet-rules';
import { START, answers, fromKitchen, furnitureFrom, type Answers } from './answers';

const mod = (kind: 'door' | 'wardrobe' | 'sink', width: number) => ({
  id: `${kind}-${width}-${Math.random().toString(36).slice(2, 7)}`,
  kind,
  width,
  hingeSide: 'right' as const,
});

/** Отговори с три гардероба, наредени на ръка в спалнята. */
const spalnya = (): Answers =>
  answers(START, {
    room: 'bedroom',
    hand: { base: [mod('wardrobe', 600), mod('wardrobe', 600), mod('wardrobe', 600)], upper: [] },
  });

describe('смяна на стаята', () => {
  it('всяка стая помни своята мебел', () => {
    // Три гардероба в спалнята…
    const спалня = spalnya();
    expect(спалня.hand.base).toHaveLength(3);

    // …кухнята се отваря празна…
    const кухня = answers(спалня, { room: 'kitchen' });
    expect(кухня.hand.base).toEqual([]);

    // …а спалнята си е същата, когато се върнем.
    const обратно = answers(кухня, { room: 'bedroom' });
    expect(обратно.hand.base).toHaveLength(3);
    expect(обратно.hand.base.map((m) => m.kind)).toEqual(['wardrobe', 'wardrobe', 'wardrobe']);
  });

  it('нареденото в кухнята също се връща', () => {
    const кухня = answers(answers(spalnya(), { room: 'kitchen' }), {
      hand: { base: [mod('sink', 800)], upper: [] },
    });
    const спалня = answers(кухня, { room: 'bedroom' });
    const пак = answers(спалня, { room: 'kitchen' });
    expect(пак.hand.base.map((m) => m.kind)).toEqual(['sink']);
  });

  it('мебелта не се вижда в чужда стая', () => {
    const кухня = answers(spalnya(), { room: 'kitchen' });
    expect(furnitureFrom(кухня).walls[0].base).toEqual([]);
  });

  it('рафтовете и обзавеждането пътуват със своята стая', () => {
    const спалня = answers(spalnya(), {
      shelves: { 'някакъв-ид': 3 },
      furnishings: [{ id: 'f1', kind: 'bed', x: 1000, z: 1000, rotation: 0 }],
    });
    const кухня = answers(спалня, { room: 'kitchen' });
    expect(кухня.shelves).toEqual({});
    expect(кухня.furnishings).toEqual([]);

    const обратно = answers(кухня, { room: 'bedroom' });
    expect(обратно.shelves).toEqual({ 'някакъв-ид': 3 });
    expect(обратно.furnishings).toHaveLength(1);
  });

  it('мерките на стаята се връщат с нея', () => {
    const спалня = answers(spalnya(), { roomWidth: 3000, roomDepth: 3600, wallLength: 3000 });
    const кухня = answers(спалня, { room: 'kitchen', roomWidth: 4200, wallLength: 4200 });
    expect(кухня.roomWidth).toBe(4200);

    const обратно = answers(кухня, { room: 'bedroom' });
    expect(обратно.roomWidth).toBe(3000);
    expect(обратно.roomDepth).toBe(3600);
    expect(обратно.wallLength).toBe(3000);
  });

  it('непипана стая взема мерките, с които се влиза', () => {
    // Те са на жилището, не на стаята: скок на фабрични числа би
    // изглеждал като грешка.
    const кухня = answers(START, { roomWidth: 5000, roomDepth: 4000, wallLength: 5000 });
    const баня = answers(кухня, { room: 'bath' });
    expect(баня.roomWidth).toBe(5000);
    expect(баня.hand.base).toEqual([]);
  });

  it('цветовете са на проекта, не на стаята', () => {
    const тъмна = answers(spalnya(), { facadeColor: 'RAL 9005 черно' });
    const кухня = answers(тъмна, { room: 'kitchen' });
    expect(кухня.facadeColor).toBe('RAL 9005 черно');
  });

  it('промяната бие прибраното — чертежът отваря стаята празна', () => {
    const спалня = spalnya();
    const кухня = answers(спалня, { room: 'kitchen' });
    const пак = answers(кухня, {
      room: 'bedroom',
      roomWidth: 3600,
      byHand: true,
      hand: { base: [], upper: [] },
      shelves: {},
      furnishings: [],
    });
    expect(пак.hand.base).toEqual([]);
    expect(пак.roomWidth).toBe(3600);
  });

  it('стаята пак се отваря празна, не подредена от правилата', () => {
    const след = answers(spalnya(), { room: 'kitchen' });
    expect(след.byHand).toBe(true);
    expect(furnitureFrom(след).walls[0].base).toEqual([]);
  });

  it('същата стая отново не пипа нищо', () => {
    const преди = spalnya();
    const след = answers(преди, { room: 'bedroom' });
    expect(след.hand.base).toHaveLength(3);
  });

  it('донесеният по линк проект не се изтрива от собствената си стая', () => {
    // Линкът носи и стаята, и мебелта наведнъж — няма какво да се чисти
    // преди него.
    const k = emptyKitchen(3600);
    k.roomKind = 'bedroom';
    k.walls[0] = { ...k.walls[0], base: [mod('wardrobe', 600)] };

    const след = answers(START, fromKitchen(k));
    expect(след.room).toBe('bedroom');
    expect(след.opened).toBeDefined();
    expect(след.opened!.walls[0].base).toHaveLength(1);
  });
});

describe('връщане към запазеното', () => {
  it('цял запазен отговор се възстановява, без да се изчисти', () => {
    /*
     * Запазеното идва като един обект и носи и стаята си. Смяната на
     * стаята чисти нареденото — но само това, което самата промяна не
     * носи. Иначе презареждането щеше да изпразва стаята.
     */
    const запазено = answers(spalnya(), { roomWidth: 3000 });
    const върнато = answers(START, JSON.parse(JSON.stringify(запазено)) as Answers);
    expect(върнато.room).toBe('bedroom');
    expect(върнато.hand.base).toHaveLength(3);
    expect(върнато.roomWidth).toBe(3000);
  });

  it('стар запис без прибрани стаи не чупи нищо', () => {
    // Записите отпреди „всяка стая помни своето" нямат `stash`.
    const стар = { ...spalnya() } as Partial<Answers>;
    delete стар.stash;
    const върнато = answers(START, стар);
    expect(върнато.hand.base).toHaveLength(3);
    expect(върнато.stash).toBeDefined();
  });
});

describe('какво отменя донесения проект', () => {
  const sProekt = () => {
    const k = emptyKitchen(3600);
    k.walls[0] = { ...k.walls[0], base: [mod('door', 600)] };
    return answers(START, fromKitchen(k));
  };

  it('местенето на вратата не пренарежда мебелта', () => {
    const преди = sProekt();
    const след = answers(преди, { door: { ...преди.door!, x: 400 } });
    expect(след.opened).toBeDefined();
    expect(след.opened!.door?.x).toBe(400);
  });

  it('всеки друг въпрос го отменя — оттам нататък подреждат правилата', () => {
    const след = answers(sProekt(), { wallLength: 4200 });
    expect(след.opened).toBeUndefined();
  });
});

describe('нареденото на ръка', () => {
  it('оцелява при смяна на размерите', () => {
    const преди = answers(START, {
      hand: { base: [mod('door', 600)], upper: [] },
    });
    const след = answers(преди, { wallLength: 4200 });
    expect(след.hand.base).toHaveLength(1);
    expect(furnitureFrom(след).walls[0].base).toHaveLength(1);
    expect(furnitureFrom(след).walls[0].length).toBe(4200);
  });

  it('празна стая значи празни редове, не подредени от правилата', () => {
    expect(START.byHand).toBe(true);
    const k = furnitureFrom(START);
    expect(k.walls[0].base).toEqual([]);
    expect(k.walls[0].upper).toEqual([]);
  });

  it('щом правилата поемат, стаята се подрежда', () => {
    const след = answers(START, { byHand: false });
    expect(furnitureFrom(след).walls[0].base.length).toBeGreaterThan(0);
  });
});
