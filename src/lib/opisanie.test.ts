import { describe, expect, it } from 'vitest';
import { DEFAULT_ROOM_NEEDS, layoutFor } from './autolayout';
import { emptyKitchen, type Kitchen, type RoomKind } from './cabinet-rules';
import { CARCASS_COLORS, FACADE_COLORS } from '@/config/materials';
import { FINISH_CATEGORIES, WALL_FINISHES } from '@/config/wall-finishes';
import { describeProject } from './opisanie';

function staya(kind: RoomKind = 'kitchen', wall = 3600): Kitchen {
  const k = emptyKitchen(wall);
  k.roomKind = kind;
  k.room = { width: 4200, depth: 3200 };
  const l = layoutFor(kind, wall, DEFAULT_ROOM_NEEDS);
  k.walls[0] = { ...k.walls[0], base: l.base, upper: l.upper };
  return k;
}

describe('описанието за модела', () => {
  it('е на английски — там моделите са учени', () => {
    const { promptEn } = describeProject(staya());
    expect(promptEn).toMatch(/^a kitchen, 4\.2 by 3\.2 metres/);
    // Нито една кирилска буква не бива да изтече в промпта.
    expect(promptEn).not.toMatch(/[А-Яа-я]/);
  });

  it('казва какво е, не къде е', () => {
    /*
     * Разположението го носят картите. Дума като „шкаф вляво" само спори
     * с геометрията и моделът почва да избира кое да слуша.
     */
    const { promptEn } = describeProject(staya());
    expect(promptEn).not.toMatch(/\bon the left\b|\bon the right\b|\bnext to\b/);
  });

  it('носи и как да изглежда картината', () => {
    const { promptEn } = describeProject(staya());
    expect(promptEn).toContain('photorealistic');
    expect(promptEn).toContain('no people');
  });

  it('празната стая се казва празна, а не се премълчава', () => {
    const k = emptyKitchen(3600);
    k.room = { width: 3000, depth: 3000 };
    const { promptEn, summaryBg } = describeProject(k);
    expect(promptEn).toContain('empty room');
    expect(summaryBg).toContain('без мебел');
  });

  it('и шестте стаи се казват с име', () => {
    for (const kind of ['kitchen', 'bedroom', 'living', 'bath', 'corridor', 'hall'] as const) {
      const { promptEn } = describeProject(staya(kind));
      expect(promptEn, kind).not.toMatch(/[А-Яа-я]/);
      expect(promptEn.length, kind).toBeGreaterThan(60);
    }
  });
});

describe('описанието за човека', () => {
  it('е на български и казва същото', () => {
    const { summaryBg, parts } = describeProject(staya());
    expect(summaryBg).toContain('Кухня');
    expect(summaryBg).toContain('метра');
    expect(parts.length).toBeGreaterThan(4);
    expect(parts.every((p) => p.bg && p.en)).toBe(true);
  });
});

describe('речникът няма дупки', () => {
  it('всеки цвят на фасада и корпус се превежда', () => {
    for (const s of [...FACADE_COLORS, ...CARCASS_COLORS]) {
      const k = staya();
      k.materials = {
        ...k.materials,
        facade: { ...k.materials.facade, color: s.name },
      };
      const { promptEn } = describeProject(k);
      expect(promptEn, s.name).not.toMatch(/[А-Яа-я]/);
    }
  });

  it('всяко покритие на стена се превежда', () => {
    for (const f of WALL_FINISHES) {
      const k = staya();
      k.wallFinish = { all: f.id };
      const { promptEn } = describeProject(k);
      expect(promptEn, f.name).not.toMatch(/[А-Яа-я]/);
    }
  });

  it('всеки вид покритие има свой превод — нов вид не минава мълчешком', () => {
    const k = staya();
    for (const c of FINISH_CATEGORIES) {
      const finish = WALL_FINISHES.find((f) => f.category === c.id);
      expect(finish, `няма покритие от вид ${c.id}`).toBeDefined();
      k.wallFinish = { all: finish!.id };
      expect(describeProject(k).promptEn, c.id).not.toMatch(/[А-Яа-я]/);
    }
  });

  it('всеки плот се превежда', () => {
    for (const w of ['laminate38', 'quartz20', 'sintered12', 'granite30'] as const) {
      const k = staya();
      k.materials = { ...k.materials, worktop: w };
      expect(describeProject(k).promptEn, w).not.toMatch(/[А-Яа-я]/);
    }
  });
});

describe('светлината', () => {
  it('прозорецът се казва и откъде свети', () => {
    const k = staya();
    k.windows = [{ id: 'w1', side: 'left', x: 400, width: 1200, sill: 900, height: 1400 }];
    const { promptEn, summaryBg } = describeProject(k);
    expect(promptEn).toContain('daylight from a window in the left wall');
    expect(summaryBg).toContain('лявата стена');
  });

  it('стая без прозорец получава обща светлина, не тъмнина', () => {
    const k = staya();
    k.windows = [];
    expect(describeProject(k).promptEn).toContain('soft even indoor lighting');
  });
});

describe('вратите, прозорците и мебелта — с число, за да не се измислят', () => {
  it('стая без прозорец казва „no windows", иначе моделът добавя прозорец', () => {
    const k = staya();
    k.windows = [];
    const { promptEn } = describeProject(k);
    expect(promptEn).toContain('exactly one door');
    expect(promptEn).toContain('no windows');
  });

  it('прозорците се броят и се казва, че други няма', () => {
    const k = staya();
    k.windows = [
      { id: 'w1', side: 'left', x: 400, width: 1200, sill: 900, height: 1400 },
      { id: 'w2', side: 'left', x: 2000, width: 800, sill: 900, height: 1400 },
    ];
    expect(describeProject(k).promptEn).toContain('two windows and no other windows');
  });

  it('свободностоящата мебел се назовава и се брои', () => {
    const k = staya('living');
    k.furnishings = [
      { id: 'a', kind: 'sofa', x: 1000, z: 1000, rotation: 0 },
      { id: 'b', kind: 'coffee-table', x: 1500, z: 1500, rotation: 0 },
      { id: 'c', kind: 'chair', x: 2000, z: 500, rotation: 0 },
      { id: 'd', kind: 'chair', x: 2400, z: 500, rotation: 0 },
    ];
    const { promptEn, summaryBg } = describeProject(k);
    expect(promptEn).toContain('freestanding furniture, exactly: a sofa, a coffee table, two chairs');
    expect(summaryBg).toContain('диван');
  });

  it('всеки вид мебел има превод', () => {
    const kinds = ['dining-table', 'chair', 'sofa', 'armchair', 'coffee-table', 'bed', 'nightstand'] as const;
    for (const kind of kinds) {
      const k = staya('living');
      k.furnishings = [{ id: kind, kind, x: 1000, z: 1000, rotation: 0 }];
      expect(describeProject(k).promptEn, kind).not.toMatch(/[А-Яа-я]/);
    }
  });

  it('не иска изглед от нивото на очите — кадърът е отгоре', () => {
    const { promptEn } = describeProject(staya());
    expect(promptEn).not.toContain('eye-level');
    expect(promptEn).not.toContain('natural daylight');
  });
});

describe('модулите се назовават по вид', () => {
  it('библиотеката и рафтовете остават библиотека и рафтове — не кухня', () => {
    const { promptEn } = describeProject(staya('living'));
    expect(promptEn).toContain('built-in furniture, exactly:');
    expect(promptEn).not.toMatch(/sink|fridge|oven|dishwasher/);
  });

  it('кухнята си казва мивката и колоната', () => {
    const { promptEn } = describeProject(staya('kitchen'));
    expect(promptEn).toMatch(/sink base cabinet/);
  });

  it('празните места не се казват', () => {
    for (const kind of ['kitchen', 'living', 'bedroom', 'bath', 'corridor', 'hall'] as const) {
      const { promptEn } = describeProject(staya(kind));
      expect(promptEn, kind).not.toMatch(/, ,|: ,|exactly: \./);
    }
  });
});
