import { describe, expect, it } from 'vitest';
import { emptyKitchen } from '@/lib/cabinet-rules';
import { START, answers, fromKitchen, furnitureFrom, type Answers } from './answers';

const mod = (kind: 'door' | 'wardrobe', width: number) => ({
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
  it('нареденото не пътува от една стая в друга', () => {
    const преди = spalnya();
    expect(преди.hand.base).toHaveLength(3);

    const след = answers(преди, { room: 'kitchen' });
    expect(след.room).toBe('kitchen');
    expect(след.hand.base).toEqual([]);
    expect(след.hand.upper).toEqual([]);
  });

  it('рафтовете и обзавеждането също остават в старата стая', () => {
    const преди = answers(spalnya(), {
      shelves: { 'някакъв-ид': 3 },
      furnishings: [
        { id: 'f1', kind: 'bed', x: 1000, z: 1000, rotation: 0 },
      ],
    });
    const след = answers(преди, { room: 'kitchen' });
    expect(след.shelves).toEqual({});
    expect(след.furnishings).toEqual([]);
  });

  it('стаята пак се отваря празна, не подредена от правилата', () => {
    const след = answers(spalnya(), { room: 'kitchen' });
    expect(след.byHand).toBe(true);
    expect(furnitureFrom(след).walls[0].base).toEqual([]);
  });

  it('същата стая отново не чисти нищо', () => {
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
