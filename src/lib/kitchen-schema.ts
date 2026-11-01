/**
 * kitchen-schema.ts — проверка на конфигурация, дошла отвън.
 *
 * Крайната точка за експорт е публична, затова нищо от тялото на заявката
 * не се приема на доверие: видовете, ширините и броят модули се сверяват
 * с каталога, преди да се смята каквото и да било.
 */

import {
  DEFAULT_MATERIALS,
  DIM,
  type DrawerSystem,
  type FacadeType,
  type Kitchen,
  type KitchenModule,
  MODULES,
  type ModuleKind,
  type OpeningType,
  type Room,
  RULES_VERSION,
  type Wall,
  type WallSide,
  WALL_SIDES,
  type WorktopType,
  WORKTOP_THICKNESS,
  clampRoom,
  clampWallLength,
  roomForWalls,
} from './cabinet-rules';

/** Горни граници, за да не може една заявка да изяде сървъра. */
export const LIMITS = {
  /** Правоъгълна стая — по една стена на страна. */
  walls: 4,
  modulesPerRow: 40,
  colorLength: 60,
} as const;

export type Validation =
  | { ok: true; kitchen: Kitchen }
  | { ok: false; error: string };

function fail(error: string): Validation {
  return { ok: false, error };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function text(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.length <= LIMITS.colorLength && v.trim() ? v : fallback;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

function parseModule(raw: unknown, index: number, row: 'base' | 'upper'): KitchenModule | string {
  if (!isRecord(raw)) return `модул ${index + 1}: не е обект`;

  const kind = raw.kind;
  if (typeof kind !== 'string' || !(kind in MODULES)) {
    return `модул ${index + 1}: непознат вид „${String(kind)}"`;
  }
  const spec = MODULES[kind as ModuleKind];
  if (spec.row !== row) {
    return `модул ${index + 1}: „${spec.label}" не е от ${row === 'base' ? 'долния' : 'горния'} ред`;
  }

  const width = Number(raw.width);
  if (!spec.widths.includes(width)) {
    return `модул ${index + 1}: ширина ${raw.width} не е в каталога на „${spec.label}"`;
  }

  return {
    id: typeof raw.id === 'string' && raw.id.length <= 64 ? raw.id : `${kind}-${index}`,
    kind: kind as ModuleKind,
    width,
    hingeSide: raw.hingeSide === 'left' ? 'left' : 'right',
  };
}

function parseWall(raw: unknown, index: number): Wall | string {
  if (!isRecord(raw)) return `стена ${index + 1}: не е обект`;

  const length = Number(raw.length);
  if (!Number.isFinite(length)) return `стена ${index + 1}: липсва дължина`;
  if (length < DIM.WALL_MIN || length > DIM.WALL_MAX) {
    return `стена ${index + 1}: дължина ${length} е извън ${DIM.WALL_MIN}–${DIM.WALL_MAX} мм`;
  }

  // Конфигурациите отпреди стаите нямат страна — подреждат се по часовника.
  const side = oneOf<WallSide>(raw.side, WALL_SIDES, WALL_SIDES[index % WALL_SIDES.length]);
  const id = typeof raw.id === 'string' && raw.id.length <= 64 ? raw.id : `wall-${index + 1}`;

  const rows: Record<'base' | 'upper', KitchenModule[]> = { base: [], upper: [] };
  for (const row of ['base', 'upper'] as const) {
    const list = raw[row];
    if (list === undefined) continue;
    if (!Array.isArray(list)) return `стена ${index + 1}: ${row} не е списък`;
    if (list.length > LIMITS.modulesPerRow) {
      return `стена ${index + 1}: повече от ${LIMITS.modulesPerRow} модула в един ред`;
    }
    for (const [i, item] of list.entries()) {
      const parsed = parseModule(item, i, row);
      if (typeof parsed === 'string') return `стена ${index + 1}, ${parsed}`;
      rows[row].push(parsed);
    }
  }

  return { id, side, length: clampWallLength(length), base: rows.base, upper: rows.upper };
}

/** Стаята е по избор; подадена, минава през същите граници като в интерфейса. */
function parseRoom(raw: unknown): Room | string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) return 'стаята не е обект';
  const width = Number(raw.width);
  const depth = Number(raw.depth);
  if (!Number.isFinite(width) || !Number.isFinite(depth)) return 'стаята е без размери';
  return { width: clampRoom(width), depth: clampRoom(depth) };
}

/** Чете конфигурация от непроверено тяло на заявка. */
export function parseKitchen(raw: unknown): Validation {
  if (!isRecord(raw)) return fail('тялото не е обект');

  const walls = raw.walls;
  if (!Array.isArray(walls) || !walls.length) return fail('липсват стени');
  if (walls.length > LIMITS.walls) return fail(`повече от ${LIMITS.walls} стени`);

  const parsed: Wall[] = [];
  for (const [i, wall] of walls.entries()) {
    const result = parseWall(wall, i);
    if (typeof result === 'string') return fail(result);
    parsed.push(result);
  }

  const sides = parsed.map((w) => w.side);
  if (new Set(sides).size !== sides.length) return fail('две стени на една и съща страна');

  const room = parseRoom(raw.room);
  if (typeof room === 'string') return fail(room);

  const m = isRecord(raw.materials) ? raw.materials : {};
  const facade = isRecord(m.facade) ? m.facade : {};

  return {
    ok: true,
    kitchen: {
      room: room ?? roomForWalls(parsed),
      walls: parsed,
      materials: {
        carcassColor: text(m.carcassColor, DEFAULT_MATERIALS.carcassColor),
        facade: {
          type: oneOf<FacadeType>(
            facade.type,
            ['mdf-painted', 'mdf-milled', 'pdch-decor'],
            DEFAULT_MATERIALS.facade.type,
          ),
          color: text(facade.color, DEFAULT_MATERIALS.facade.color),
        },
        worktop: oneOf<WorktopType>(
          m.worktop,
          Object.keys(WORKTOP_THICKNESS) as WorktopType[],
          DEFAULT_MATERIALS.worktop,
        ),
        opening: oneOf<OpeningType>(
          m.opening,
          ['handles', 'push', 'alu-profile'],
          DEFAULT_MATERIALS.opening,
        ),
        drawers: oneOf<DrawerSystem>(
          m.drawers,
          ['metal-box', 'ball-bearing'],
          DEFAULT_MATERIALS.drawers,
        ),
      },
      // Експортът се смята с текущите правила, не с версията на клиента.
      rulesVersion: RULES_VERSION,
    },
  };
}
