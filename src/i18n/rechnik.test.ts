import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { imaPrevod, kod, prevedi } from './rechnik';
import {
  CARCASS_COLORS,
  DRAWER_SYSTEMS,
  FACADE_COLORS,
  FACADE_TYPES,
  OPENINGS,
  WORKTOPS,
} from '@/config/materials';
import { FLOOR_CATEGORIES, FLOOR_FINISHES } from '@/config/floor-finishes';
import { MODULES, OPENING_KIND_LABEL, ROOM_KIND_LABEL, WALL_SIDE_LABEL } from '@/lib/cabinet-rules';
import { DOOR_HINGE_LABEL, DOOR_SWING_LABEL } from '@/lib/openings';
import { DIRECTION_LABEL, FLAT_ROOM_LABEL } from '@/lib/flat';
import { FURNISHINGS } from '@/lib/furnishings';
import { NO_ROOM } from '@/components/configurator/state';

/**
 * Всяко име, което правилата показват на човека, трябва да има превод.
 * Списъците се четат от самите каталози; имената на обкова и на
 * покритията на стените — от изходния код, защото се раждат вътре във
 * функции.
 */
const IZTOCHNICI = [
  'src/lib/cabinet-rules.ts',
  'src/config/wall-finishes.ts',
  'src/config/floor-finishes.ts',
];

function imenaOtKoda(file: string): string[] {
  const s = readFileSync(join(process.cwd(), file), 'utf8');
  const out = new Set<string>();
  for (const m of s.matchAll(/(?:name|label):\s*'([^']*[А-Яа-я][^']*)'/g)) out.add(m[1]);
  // помощниците на покритията: plain('id', 'Име', …)
  for (const m of s.matchAll(/\(\s*'[a-z0-9-]+',\s*'([^']*[А-Яа-я][^']*)'/g)) out.add(m[1]);
  return [...out];
}

describe('речникът', () => {
  const imena = [
    ...Object.values(MODULES).map((m) => m.label),
    ...Object.values(ROOM_KIND_LABEL),
    ...Object.values(OPENING_KIND_LABEL),
    ...Object.values(WALL_SIDE_LABEL),
    ...Object.values(DOOR_HINGE_LABEL),
    ...Object.values(DOOR_SWING_LABEL),
    ...Object.values(FLAT_ROOM_LABEL),
    ...Object.values(DIRECTION_LABEL),
    ...Object.values(FURNISHINGS).map((f) => f.label),
    ...[...CARCASS_COLORS, ...FACADE_COLORS].map((c) => c.name),
    ...[...FACADE_TYPES, ...WORKTOPS, ...OPENINGS, ...DRAWER_SYSTEMS].flatMap((x) =>
      x.note ? [x.name, x.note] : [x.name],
    ),
    ...FLOOR_CATEGORIES.map((c) => c.name),
    ...FLOOR_FINISHES.map((f) => f.name),
    ...IZTOCHNICI.flatMap(imenaOtKoda),
    NO_ROOM,
  ];

  it.each([...new Set(imena)])('„%s" има превод', (ime) => {
    expect(imaPrevod(ime)).toBe(true);
  });

  it('непознатото име остава както е', () => {
    expect(prevedi('Нещо ново', 'en')).toBe('Нещо ново');
    expect(prevedi('Кухня', 'bg')).toBe('Кухня');
    expect(prevedi('Кухня', 'zh')).toBe('厨房');
  });

  it('номерът на шкафа се чете на латиница', () => {
    expect(kod('Д2', 'en')).toBe('D2');
    expect(kod('Г5', 'zh')).toBe('G5');
    expect(kod('Д2', 'bg')).toBe('Д2');
  });
});
