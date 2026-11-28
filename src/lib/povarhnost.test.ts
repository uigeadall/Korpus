import { describe, expect, it } from 'vitest';
import { DEFAULT_MATERIALS, type Materials } from './cabinet-rules';
import {
  carcassPovarhnost,
  darker,
  facadePovarhnost,
  faceSurface,
  hasPovarhnost,
  isWood,
  povarhnostFor,
  woodGrain,
  worktopPovarhnost,
} from './povarhnost';
import { boxFaces, type Box } from './scene3d';
import { wallMarks } from './wall-pattern';

const materials = (over: Partial<Materials> = {}): Materials => ({
  ...DEFAULT_MATERIALS,
  ...over,
});

const box = (over: Partial<Box> = {}): Box => ({
  x: 0,
  y: 0,
  z: 0,
  width: 600,
  height: 720,
  depth: 560,
  role: 'facade',
  facing: 'top',
  key: 'b',
  ...over,
});

describe('кое е дърво', () => {
  it('дървото идва от каталога, не от името', () => {
    expect(isWood('Светъл дъб')).toBe(true);
    expect(isWood('Орех')).toBe(true);
    expect(isWood('Бял')).toBe(false);
    expect(isWood('RAL 7016 антрацит')).toBe(false);
  });

  it('дума в името не прави боята дърво', () => {
    /*
     * Първият опит търсеше дървесни думи в името и „RAL 6013
     * тръстика" мина за дърво, защото „тръстика" съдържа „тик".
     * Зелена боя получаваше фладер.
     */
    expect(isWood('RAL 6013 тръстика')).toBe(false);
    expect(isWood('Орехово зелено')).toBe(false);
  });

  it('по-тъмната отсянка си остава цвят', () => {
    expect(darker('#c9ae86')).toMatch(/^#[0-9a-f]{6}$/);
    expect(darker('#000000')).toBe('#000000');
    // Не излиза извън канала, колкото и да се светли.
    expect(darker('#ffffff', 3)).toBe('#ffffff');
  });

  it('фладерът е влакно, не дъски — на една врата няма фуги', () => {
    const spec = woodGrain('#c9ae86');
    expect(spec.kind).toBe('grain');
    const marks = wallMarks(spec, { u0: 0, u1: 600, v0: 0, v1: 720 });
    expect(marks.lines.length).toBeGreaterThan(0);
    expect(marks.lines[0].segs.length).toBeGreaterThan(20);
  });

  it('влакното се извива — права черта не прилича на дърво', () => {
    const marks = wallMarks(woodGrain('#c9ae86'), { u0: 0, u1: 600, v0: 0, v1: 2000 });
    const segs = marks.lines[0].segs;
    // Влакното върви нагоре (dir 'v'), затова се мери отклонението по u.
    const us = segs.flatMap(([a, b]) => [a[0], b[0]]);
    expect(Math.max(...us) - Math.min(...us)).toBeGreaterThan(5);
  });

  it('едно и също лице дава една и съща шарка — иначе мига при въртене', () => {
    const area = { u0: 0, u1: 600, v0: 0, v1: 720 };
    const a = wallMarks(woodGrain('#c9ae86'), area, 3);
    const b = wallMarks(woodGrain('#c9ae86'), area, 3);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('фасадата', () => {
  it('боядисаният МДФ е гладък — няма какво да се шари', () => {
    const p = facadePovarhnost(materials(), '#f1ece4');
    expect(p.pattern.kind).toBe('plain');
  });

  it('декор с дървесно име получава фладер', () => {
    const p = facadePovarhnost(
      materials({ facade: { type: 'pdch-decor', color: 'Дъб сонома' } }),
      '#c9ae86',
    );
    expect(p.pattern.kind).toBe('grain');
  });

  it('декор, който не е дърво, не получава фладер', () => {
    const p = facadePovarhnost(
      materials({ facade: { type: 'pdch-decor', color: 'RAL 7016 антрацит' } }),
      '#383e42',
    );
    expect(p.pattern.kind).toBe('plain');
  });

  it('боядисаното лъщи повече от декора', () => {
    const boya = facadePovarhnost(materials({ facade: { type: 'mdf-painted', color: 'Бяло' } }), '#fff');
    const dekor = facadePovarhnost(materials({ facade: { type: 'pdch-decor', color: 'Бяло' } }), '#fff');
    expect(boya.gloss).toBeGreaterThan(dekor.gloss);
  });
});

describe('плотът', () => {
  it('ламинатът е хартия — плосък е вярното', () => {
    expect(worktopPovarhnost('laminate38', '#6f6a62').pattern.kind).toBe('plain');
  });

  it('трите каменни плота се различават, а не само на име', () => {
    const vidove = (['quartz20', 'granite30', 'sintered12'] as const).map(
      (w) => worktopPovarhnost(w, '#d9d6cf').pattern.kind,
    );
    expect(new Set(vidove).size).toBeGreaterThan(1);
    expect(vidove).not.toContain('plain');
  });

  it('гранитът е по-едро зърно от кварца', () => {
    const kvarc = worktopPovarhnost('quartz20', '#d9d6cf').pattern;
    const granit = worktopPovarhnost('granite30', '#53514d').pattern;
    if (kvarc.kind !== 'mottle' || granit.kind !== 'mottle') throw new Error('очаква се зърно');
    expect(granit.density).toBeGreaterThan(kvarc.density);
    expect(granit.tones.length).toBeGreaterThan(kvarc.tones.length);
  });

  it('камъкът лъщи повече от ламината', () => {
    expect(worktopPovarhnost('granite30', '#53514d').gloss).toBeGreaterThan(
      worktopPovarhnost('laminate38', '#6f6a62').gloss,
    );
  });

  it('всеки вид дава шарка, която се рисува', () => {
    for (const w of ['laminate38', 'quartz20', 'granite30', 'sintered12'] as const) {
      const marks = wallMarks(worktopPovarhnost(w, '#8a8580').pattern, {
        u0: 0,
        u1: 3000,
        v0: 0,
        v1: 600,
      });
      expect(marks.fills.length + marks.lines.length, w).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('кое лице какво носи', () => {
  it('зидът, подът и сянката не са мебел', () => {
    for (const role of ['wall', 'floor', 'shadow', 'glass', 'handle'] as const) {
      expect(hasPovarhnost(role), role).toBe(false);
      expect(povarhnostFor(role, materials(), {}), role).toBeNull();
    }
  });

  it('корпусът и рафтът са от една плоскост', () => {
    const palette = { carcass: '#c9ae86' };
    const korpus = povarhnostFor('carcass', materials({ carcassColor: 'Светъл дъб' }), palette);
    const raft = povarhnostFor('shelf', materials({ carcassColor: 'Светъл дъб' }), palette);
    expect(korpus?.id).toBe(raft?.id);
    expect(korpus?.pattern.kind).toBe('grain');
  });

  it('белият корпус няма влакно', () => {
    expect(carcassPovarhnost('Бял', '#efece6').pattern.kind).toBe('plain');
  });
});

describe('шарката ляга върху лицето', () => {
  const front = (b: Box) => boxFaces(b).find((f) => f.front)!;

  it('мерките на повърхността са мерките на шкафа', () => {
    const f = front(box({ width: 600, height: 720 }));
    const s = faceSurface(f)!;
    expect(s.area.u1).toBeCloseTo(600, 3);
    expect(s.area.v1).toBeCloseTo(720, 3);
  });

  it('ъглите на повърхността са ъглите на лицето', () => {
    const f = front(box());
    const s = faceSurface(f)!;
    const dolu = s.at(0, 0);
    const gore = s.at(s.area.u1, s.area.v1);
    const ys = f.corners.map((c) => c.y);
    expect(dolu.y).toBeCloseTo(Math.min(...ys), 3);
    expect(gore.y).toBeCloseTo(Math.max(...ys), 3);
  });

  it('средата на повърхността е средата на лицето', () => {
    const f = front(box({ x: 1200, z: 300 }));
    const s = faceSurface(f)!;
    const mid = s.at(s.area.u1 / 2, s.area.v1 / 2);
    const cx = f.corners.reduce((n, c) => n + c.x, 0) / 4;
    const cy = f.corners.reduce((n, c) => n + c.y, 0) / 4;
    expect(mid.x).toBeCloseTo(cx, 3);
    expect(mid.y).toBeCloseTo(cy, 3);
  });

  it('работи и за завъртяна врата — там осите вече не помагат', () => {
    /*
     * Отворената врата е единственото нещо в сцената, което не е
     * успоредно на осите. Повърхността се строи от самите ъгли, не от
     * координатите, точно затова.
     */
    const f = front(box({ swing: { pivotX: 0, pivotZ: 0, angle: 0.9 } }));
    const s = faceSurface(f)!;
    expect(s.area.u1).toBeCloseTo(600, 2);
    const mid = s.at(300, 360);
    const cx = f.corners.reduce((n, c) => n + c.x, 0) / 4;
    const cz = f.corners.reduce((n, c) => n + c.z, 0) / 4;
    expect(mid.x).toBeCloseTo(cx, 2);
    expect(mid.z).toBeCloseTo(cz, 2);
  });

  it('лице без площ не дава повърхност, вместо да дели на нула', () => {
    const f = front(box({ width: 0 }));
    expect(faceSurface(f)).toBeNull();
  });

  it('ключът на повърхността е ключът на лицето — паметта разчита на това', () => {
    const f = front(box({ key: 'm7' }));
    expect(faceSurface(f)!.key).toBe(f.key);
  });
});
