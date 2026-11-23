/**
 * Подовете — ламинат, паркет, килим. По три от всеки.
 *
 * Като стените: подът не е мебел, не се реже и не влиза в разбивката.
 * Без избор подът е такъв, какъвто беше — топъл, с фуги на дъските.
 *
 * Ключовете влизат в линка към проекта; веднъж пуснат, ключ не се сменя.
 * Цветовете са примерни, не са декори на производител.
 */

import type { PatternSpec } from '@/lib/wall-pattern';
import { mix } from './wall-finishes';

export type FloorCategory = 'laminat' | 'parket' | 'kilim';

export interface FloorFinish {
  id: string;
  name: string;
  category: FloorCategory;
  hex: string;
  pattern: PatternSpec;
}

export const FLOOR_CATEGORIES: { id: FloorCategory; name: string }[] = [
  { id: 'laminat', name: 'Ламинат' },
  { id: 'parket', name: 'Паркет' },
  { id: 'kilim', name: 'Килим' },
];

const darker = (hex: string, t: number) => mix(hex, '#000000', t);
const lighter = (hex: string, t: number) => mix(hex, '#ffffff', t);
const tones = (hex: string, t: number) => [darker(hex, t), lighter(hex, t * 0.8), darker(hex, t / 2)];

const laminate = (id: string, name: string, hex: string): FloorFinish => ({
  id,
  name,
  category: 'laminat',
  hex,
  pattern: {
    kind: 'planks',
    w: 190,
    length: 1290,
    dir: 'h',
    gap: darker(hex, 0.3),
    tones: tones(hex, 0.09),
    grain: darker(hex, 0.18),
  },
});

const herringbone = (id: string, name: string, hex: string): FloorFinish => ({
  id,
  name,
  category: 'parket',
  hex,
  pattern: { kind: 'herringbone', h: 70, ratio: 5, grout: darker(hex, 0.35), tones: tones(hex, 0.1) },
});

const carpet = (id: string, name: string, hex: string): FloorFinish => ({
  id,
  name,
  category: 'kilim',
  hex,
  // Ситни петна — мъхът на килима, без фуги.
  pattern: { kind: 'mottle', scale: 70, density: 0.55, tones: [darker(hex, 0.07), lighter(hex, 0.06)] },
});

export const FLOOR_FINISHES: readonly FloorFinish[] = [
  laminate('pod-laminat-natural', 'Ламинат натурален дъб', '#c8a073'),
  laminate('pod-laminat-grey', 'Ламинат сив дъб', '#a39c92'),
  laminate('pod-laminat-walnut', 'Ламинат тъмен орех', '#6c5240'),

  herringbone('pod-parket-riba-oak', 'Паркет рибена кост, дъб', '#c49a6c'),
  herringbone('pod-parket-riba-walnut', 'Паркет рибена кост, орех', '#7a5a44'),
  {
    id: 'pod-parket-lenti',
    name: 'Паркет на ленти, светъл дъб',
    category: 'parket',
    hex: '#d7b88f',
    pattern: {
      kind: 'planks',
      w: 70,
      length: 490,
      dir: 'h',
      gap: darker('#d7b88f', 0.3),
      tones: tones('#d7b88f', 0.1),
      grain: darker('#d7b88f', 0.15),
    },
  },

  carpet('pod-kilim-grey', 'Килим сив', '#9a9893'),
  carpet('pod-kilim-beige', 'Килим бежов', '#c9b99f'),
  carpet('pod-kilim-blue', 'Килим тъмносин', '#3d4a5e'),
];

const BY_ID = new Map(FLOOR_FINISHES.map((f) => [f.id, f]));

/** Подът по ключ, или null — тогава е подразбиращият се, както преди. */
export function floorById(id: string | undefined | null): FloorFinish | null {
  return (id && BY_ID.get(id)) || null;
}

export function floorsIn(category: FloorCategory): FloorFinish[] {
  return FLOOR_FINISHES.filter((f) => f.category === category);
}
