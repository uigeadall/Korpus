import { describe, expect, it } from 'vitest';
import { MODULES, type KitchenModule, type ModuleKind, placeWall } from './cabinet-rules';
import { canTrim, clipAt, clipsInRange, idsBetween, rowEnd, trimWidth } from './timeline';

let seq = 0;
const mod = (kind: ModuleKind, width: number): KitchenModule => ({
  id: `m${++seq}`,
  kind,
  width,
  hingeSide: 'right',
});

/** Четири модула, опрени един до друг: 600, 600, 400, 800. */
const row = () =>
  placeWall({
    length: 3600,
    base: [mod('door', 600), mod('drawers', 600), mod('door', 400), mod('sink', 800)],
    upper: [],
  }).base;

describe('кой клип е на това място', () => {
  it('намира модула под посочената точка', () => {
    const r = row();
    expect(clipAt(r, 0)?.id).toBe(r[0].id);
    expect(clipAt(r, 599)?.id).toBe(r[0].id);
    expect(clipAt(r, 600)?.id).toBe(r[1].id);
    expect(clipAt(r, 1700)?.id).toBe(r[3].id);
  });

  it('извън реда няма клип', () => {
    expect(clipAt(row(), -10)).toBeNull();
    expect(clipAt(row(), 99_999)).toBeNull();
  });

  it('празен ред не чупи нищо', () => {
    expect(clipAt([], 100)).toBeNull();
    expect(rowEnd([])).toBe(0);
  });

  it('краят на реда е десният ръб на последния', () => {
    expect(rowEnd(row())).toBe(2400);
  });
});

describe('обхват между два посочени', () => {
  it('взема и двата, и всичко помежду им', () => {
    const r = row();
    expect(idsBetween(r, r[0].id, r[2].id)).toEqual([r[0].id, r[1].id, r[2].id]);
  });

  it('редът на посочване няма значение', () => {
    const r = row();
    expect(idsBetween(r, r[2].id, r[0].id)).toEqual(idsBetween(r, r[0].id, r[2].id));
  });

  it('един и същ модул дава само него', () => {
    const r = row();
    expect(idsBetween(r, r[1].id, r[1].id)).toEqual([r[1].id]);
  });

  it('непознат идентификатор не дава нищо', () => {
    const r = row();
    expect(idsBetween(r, r[0].id, 'няма такъв')).toEqual([]);
  });
});

describe('маркиране с рамка', () => {
  it('хваща и само отчасти засегнатите', () => {
    const r = row();
    // 500–700 реже първия и втория.
    expect(clipsInRange(r, 500, 700)).toEqual([r[0].id, r[1].id]);
  });

  it('работи и когато рамката е теглена наобратно', () => {
    const r = row();
    expect(clipsInRange(r, 700, 500)).toEqual(clipsInRange(r, 500, 700));
  });

  it('рамка върху празно място не хваща нищо', () => {
    expect(clipsInRange(row(), 3000, 3400)).toEqual([]);
  });

  it('рамка през целия ред хваща всички', () => {
    const r = row();
    expect(clipsInRange(r, -500, 99_999)).toEqual(r.map((m) => m.id));
  });

  it('допирането по ръба не брои за засягане', () => {
    const r = row();
    // Точно до ръба на първия, без да влиза в него.
    expect(clipsInRange(r, 600, 601)).toEqual([r[1].id]);
  });
});

describe('опъване на ръба', () => {
  it('отива на най-близката каталожна ширина', () => {
    expect(trimWidth('door', 600, 70)).toBe(MODULES.door.widths.includes(700) ? 700 : 600);
    expect(trimWidth('door', 600, 5)).toBe(600);
  });

  it('никога не излиза извън каталога', () => {
    for (const delta of [-9999, -500, -50, 50, 500, 9999]) {
      for (const kind of ['door', 'drawers', 'sink', 'upper'] as ModuleKind[]) {
        const w = trimWidth(kind, 600, delta);
        expect(MODULES[kind].widths, `${kind} ${delta}`).toContain(w);
      }
    }
  });

  it('вид с една-единствена ширина не се опъва', () => {
    const fixed = (Object.keys(MODULES) as ModuleKind[]).filter(
      (k) => MODULES[k].widths.length === 1,
    );
    for (const kind of fixed) expect(canTrim(kind), kind).toBe(false);
    expect(canTrim('door')).toBe(true);
  });
});
