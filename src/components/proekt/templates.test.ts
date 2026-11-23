import { describe, expect, it } from 'vitest';
import { DIM, computeKitchen, isGapKind } from '@/lib/cabinet-rules';
import { layoutFor } from '@/lib/autolayout';
import { CARCASS_COLORS, FACADE_COLORS, WORKTOPS } from '@/config/materials';
import { isKnownFinish } from '@/config/wall-finishes';
import { floorById } from '@/config/floor-finishes';
import { START, answers } from './answers';
import { TEMPLATES, templateKitchen, templatePatch } from './templates';

describe('готовите стаи', () => {
  it('има поне шест и ключовете не се повтарят', () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(6);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    for (const t of TEMPLATES) expect(t.id).toMatch(/^[a-z0-9-]+$/);
  });

  it('сочат само към цветове, плотове и стени, които ги има', () => {
    for (const t of TEMPLATES) {
      expect(FACADE_COLORS.some((c) => c.name === t.facadeColor), t.id).toBe(true);
      expect(CARCASS_COLORS.some((c) => c.name === t.carcassColor), t.id).toBe(true);
      expect(WORKTOPS.some((w) => w.id === t.worktop), t.id).toBe(true);
      const ids = [t.wallFinish?.all, ...Object.values(t.wallFinish?.sides ?? {})].filter(Boolean);
      for (const id of ids) expect(isKnownFinish(id), `${t.id}: ${id}`).toBe(true);
      if (t.floorFinish) expect(floorById(t.floorFinish), `${t.id}: ${t.floorFinish}`).not.toBeNull();
    }
  });

  it('всяка излиза с мебел и нищо не отпада', () => {
    for (const t of TEMPLATES) {
      const patch = templatePatch(t);
      const layout = layoutFor(t.room, t.wallLength, patch.needs!);
      expect(layout.dropped, t.id).toEqual([]);
      const result = computeKitchen(templateKitchen(t));
      expect(result.cabinets.length, t.id).toBeGreaterThan(0);
    }
  });

  it('не пренася мебел от предишната стая', () => {
    // Човек е наредил нещо в спалнята на ръка, после избира готова кухня.
    let a = answers(START, { room: 'bedroom' });
    a = answers(a, {
      hand: { base: [{ id: 'x', kind: 'wardrobe', width: 600, hingeSide: 'right' }], upper: [] },
    });
    const kitchen = TEMPLATES.find((t) => t.room === 'kitchen')!;
    const next = answers(a, templatePatch(kitchen));
    expect(next.room).toBe('kitchen');
    expect(next.byHand).toBe(false);
    expect(next.hand).toEqual({ base: [], upper: [] });
    expect(next.wallFinish).toEqual(kitchen.wallFinish);
    // Спалнята си пази своето за после.
    expect(next.stash.bedroom?.hand.base).toHaveLength(1);
  });

  it('Г-образната кухня е по две стени и не се застъпва в ъгъла', () => {
    const t = TEMPLATES.find((x) => x.id === 'kuhnya-g')!;
    const k = templateKitchen(t);
    const result = computeKitchen(k);
    const left = k.walls.findIndex((w) => w.side === 'left');
    const cabinets = result.placed[left].base.filter((m) => !isGapKind(m.kind));
    expect(cabinets).toHaveLength(3);
    // Лявата стена е долепена до ъгъла с горната — точно до нейния ред, не в него.
    const last = cabinets.at(-1)!;
    expect(last.x + last.width).toBe(t.roomDepth - DIM.BASE_D);
  });
});

