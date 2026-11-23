/**
 * Проектът, побран в един линк.
 *
 * Клиентът построява мебелта в браузъра си и дотук тя оставаше там.
 * С това тя се събира в кратък низ, който влиза в адреса: клиентът го
 * праща, ние го отваряме и виждаме точно неговия проект — без база,
 * без акаунт, без нищо по сървъра.
 *
 * Записът е нарочно кратък, защото влиза и в тялото на имейл, където
 * дължината е ограничена. Вместо имена се пишат номера от постоянни
 * списъци; тест пази списъците пълни, за да не се загуби вид мебел,
 * добавен по-късно.
 */

import {
  DEFAULT_MATERIALS,
  type DrawerSystem,
  type FacadeType,
  type Kitchen,
  type KitchenModule,
  type ModuleKind,
  type OpeningType,
  RULES_VERSION,
  type RoomKind,
  type WorktopType,
  clampRoom,
  clampWallLength,
} from './cabinet-rules';
import { ROOM, WALL_SIDES, clampCeiling } from './furniture/room';
import {
  type DoorHinge,
  type DoorSwing,
  type RoomDoor,
  type RoomWindow,
  clampDoor,
  clampWindow,
} from './openings';
import { CARCASS_COLORS, FACADE_COLORS } from '@/config/materials';
import { type Furnishing, type FurnishingKind } from './furnishings';
import { type PackedFinish, packFinish, unpackFinish } from './wall-finish';
import { floorById } from '@/config/floor-finishes';

/** Версия на записа. Вдига се, ако подредбата по-долу някога се счупи. */
const VERSION = 1;

/*
 * Постоянни списъци. Редът им е част от формата на линка — нов вид се
 * ДОБАВЯ НАКРАЯ, никога не се вмъква по средата, иначе старите линкове
 * започват да сочат към друга мебел.
 */
const ROOMS: readonly RoomKind[] = ['kitchen', 'bedroom', 'living', 'bath', 'corridor', 'hall'];

const KINDS: readonly ModuleKind[] = [
  'column',
  'door',
  'drawers',
  'sink',
  'oven',
  'dw',
  'lgap',
  'upper',
  'hood',
  'ugap',
  'wardrobe',
  'wardrobe-shelves',
  'wardrobe-drawers',
  'wardrobe-open',
  'attic',
  'wgap',
  'tv',
  'lowboard',
  'bookcase',
  'wallbox',
  'wallshelf',
  'vgap',
  // Баня и коридор — добавени по-късно, затова са накрая.
  'vanity',
  'bath-drawers',
  'bath-tall',
  'washer',
  'bgap',
  'bath-mirror',
  'bath-shelf',
  'hall-wardrobe',
  'shoe',
  'hall-open',
  'bench',
  'hgap',
  'hall-attic',
];

const THINGS: readonly FurnishingKind[] = [
  'dining-table',
  'chair',
  'sofa',
  'armchair',
  'coffee-table',
  'bed',
  'nightstand',
];

const FACADE_TYPES: readonly FacadeType[] = ['mdf-painted', 'mdf-milled', 'pdch-decor'];
const WORKTOP_TYPES: readonly WorktopType[] = [
  'laminate38',
  'quartz20',
  'sintered12',
  'granite30',
];
const OPENINGS: readonly OpeningType[] = ['handles', 'push', 'alu-profile'];
const DRAWERS: readonly DrawerSystem[] = ['metal-box', 'ball-bearing'];
const HINGES: readonly DoorHinge[] = ['left', 'right'];
const SWINGS: readonly DoorSwing[] = ['in', 'out'];

export const SHARE_LISTS = {
  ROOMS,
  KINDS,
  THINGS,
  FACADE_TYPES,
  WORKTOP_TYPES,
  OPENINGS,
  DRAWERS,
  WALLS: WALL_SIDES,
  HINGES,
  SWINGS,
};

/** Модул: вид, ширина и по желание панти и брой рафтове. */
type PackedModule = [kind: number, width: number, hinge?: number, shelves?: number];
type PackedThing = [kind: number, x: number, z: number, degrees: number];
/** Врата: стена, отстояние, ширина, височина, панти, посока. */
/** Прозорец: стена, отстояние, ширина, парапет, височина. */
type PackedWindow = [side: number, x: number, width: number, sill: number, height: number];

type PackedDoor = [
  side: number,
  x: number,
  width: number,
  height: number,
  hinge: number,
  swing: number,
];

interface Packed {
  v: number;
  r: number;
  /** стая: ширина, дълбочина */
  s: [number, number];
  /** дължина на стената */
  w: number;
  b: PackedModule[];
  u: PackedModule[];
  /** материали: корпус, фасада-цвят, фасада-вид, плот, отваряне, чекмеджета */
  m: [number, number, number, number, number, number];
  f: PackedThing[];
  /**
   * Вратата. Липсва в линковете отпреди нея — тогава проектът се чете
   * без врата и правилата слагат подразбиращата се.
   */
  d?: PackedDoor;
  /** Прозорците. Липсват в линковете отпреди тях. */
  n?: PackedWindow[];
  /**
   * Покритието на стените: общото, после горна, дясна, долна, лява.
   * Липсва в линковете отпреди него и при стени по подразбиране.
   */
  c?: PackedFinish;
  /** Подът. Липсва в линковете отпреди него и при подразбиращия се под. */
  fl?: string;
  /** Височината до тавана. Липсва при обичайните 2,60 м и в старите линкове. */
  hh?: number;
  /**
   * Другите стени с мебел: страна, дължина, долен и горен ред. Липсват в
   * линковете отпреди тях и когато мебелта е само по главната стена.
   */
  xw?: [side: number, length: number, base: PackedModule[], upper: PackedModule[]][];
}

const packModule = (m: KitchenModule): PackedModule => {
  const out: PackedModule = [Math.max(0, KINDS.indexOf(m.kind)), m.width];
  if (m.hingeSide === 'left') out[2] = 1;
  if (m.shelves !== undefined) {
    out[2] = out[2] ?? 0;
    out[3] = m.shelves;
  }
  return out;
};

const unpackModule = (p: PackedModule, prefix: string, i: number): KitchenModule => ({
  id: `${prefix}${i + 1}-${KINDS[p[0]] ?? 'door'}`,
  kind: KINDS[p[0]] ?? 'door',
  width: p[1],
  hingeSide: p[2] === 1 ? 'left' : 'right',
  ...(p[3] !== undefined ? { shelves: p[3] } : {}),
});

/** Низ, безопасен за адрес: base64 без `+`, `/` и опашката от `=`. */
function toUrlSafe(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromUrlSafe(code: string): string {
  const padded = code.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeProject(kitchen: Kitchen): string {
  const wall = kitchen.walls[0];
  const room = kitchen.room ?? { width: 4200, depth: 3200 };
  const mat = kitchen.materials;

  const packed: Packed = {
    v: VERSION,
    r: Math.max(0, ROOMS.indexOf(kitchen.roomKind ?? 'kitchen')),
    s: [Math.round(room.width), Math.round(room.depth)],
    w: Math.round(wall.length),
    b: wall.base.map(packModule),
    u: wall.upper.map(packModule),
    m: [
      Math.max(0, CARCASS_COLORS.findIndex((c) => c.name === mat.carcassColor)),
      Math.max(0, FACADE_COLORS.findIndex((c) => c.name === mat.facade.color)),
      Math.max(0, FACADE_TYPES.indexOf(mat.facade.type)),
      Math.max(0, WORKTOP_TYPES.indexOf(mat.worktop)),
      Math.max(0, OPENINGS.indexOf(mat.opening)),
      Math.max(0, DRAWERS.indexOf(mat.drawers)),
    ],
    f: (kitchen.furnishings ?? []).map((t) => [
      Math.max(0, THINGS.indexOf(t.kind)),
      Math.round(t.x),
      Math.round(t.z),
      Math.round((t.rotation * 180) / Math.PI) % 360,
    ]),
  };

  if (kitchen.door) {
    const door = kitchen.door;
    packed.d = [
      Math.max(0, WALL_SIDES.indexOf(door.side)),
      Math.round(door.x),
      Math.round(door.width),
      Math.round(door.height),
      Math.max(0, HINGES.indexOf(door.hinge)),
      Math.max(0, SWINGS.indexOf(door.swing)),
    ];
  }

  if (kitchen.windows?.length) {
    packed.n = kitchen.windows.map((w) => [
      Math.max(0, WALL_SIDES.indexOf(w.side)),
      Math.round(w.x),
      Math.round(w.width),
      Math.round(w.sill),
      Math.round(w.height),
    ]);
  }

  const finish = packFinish(kitchen.wallFinish);
  if (finish) packed.c = finish;
  if (floorById(kitchen.floorFinish)) packed.fl = kitchen.floorFinish;
  if (room.height !== undefined && room.height !== ROOM.HEIGHT) packed.hh = Math.round(room.height);
  const others = kitchen.walls
    .slice(1)
    .filter((w) => w.base.length || w.upper.length)
    .map((w, i): [number, number, PackedModule[], PackedModule[]] => [
      Math.max(0, WALL_SIDES.indexOf(w.side ?? WALL_SIDES[(i + 1) % WALL_SIDES.length])),
      Math.round(w.length),
      w.base.map(packModule),
      w.upper.map(packModule),
    ]);
  if (others.length) packed.xw = others;

  return toUrlSafe(JSON.stringify(packed));
}

/** Връща проекта от линка, или null, ако записът не се чете. */
export function decodeProject(code: string): Kitchen | null {
  try {
    const p = JSON.parse(fromUrlSafe(code)) as Packed;
    if (p?.v !== VERSION || !Array.isArray(p.b) || !Array.isArray(p.u)) return null;

    const furnishings: Furnishing[] = (p.f ?? []).map((t, i) => ({
      id: `share-${i + 1}`,
      kind: THINGS[t[0]] ?? 'chair',
      x: t[1],
      z: t[2],
      rotation: ((t[3] ?? 0) * Math.PI) / 180,
    }));

    const room = {
      width: clampRoom(p.s?.[0] ?? 4200),
      depth: clampRoom(p.s?.[1] ?? 3200),
      ...(typeof p.hh === 'number' ? { height: clampCeiling(p.hh) } : {}),
    };
    const door: RoomDoor | undefined = p.d
      ? clampDoor(room, {
          side: WALL_SIDES[p.d[0]] ?? 'top',
          x: p.d[1],
          width: p.d[2],
          height: p.d[3],
          hinge: HINGES[p.d[4]] ?? 'left',
          swing: SWINGS[p.d[5]] ?? 'in',
        })
      : undefined;

    const windows: RoomWindow[] = (p.n ?? []).map((w, i) =>
      clampWindow(room, {
        id: `share-win-${i + 1}`,
        side: WALL_SIDES[w[0]] ?? 'top',
        x: w[1],
        width: w[2],
        sill: w[3],
        height: w[4],
      }),
    );

    const wallFinish = unpackFinish(p.c);
    // Непознат под — например от по-нова версия — се отваря като подразбиращия се.
    const floorFinish = floorById(typeof p.fl === 'string' ? p.fl : null)?.id;

    return {
      roomKind: ROOMS[p.r] ?? 'kitchen',
      room,
      ...(door ? { door } : {}),
      ...(windows.length ? { windows } : {}),
      ...(wallFinish ? { wallFinish } : {}),
      ...(floorFinish ? { floorFinish } : {}),
      walls: [
        {
          id: 'share-wall-1',
          side: 'top',
          length: clampWallLength(p.w ?? 3600),
          base: p.b.map((m, i) => unpackModule(m, 'share-b', i)),
          upper: p.u.map((m, i) => unpackModule(m, 'share-u', i)),
        },
        ...(Array.isArray(p.xw) ? p.xw : [])
          .filter((x) => Array.isArray(x) && Array.isArray(x[2]) && Array.isArray(x[3]))
          .map(([side, length, b, u], n) => ({
            id: `share-wall-${n + 2}`,
            side: WALL_SIDES[side] ?? 'right',
            length: clampWallLength(length ?? 3600),
            base: b.map((m, i) => unpackModule(m, `share-${n + 2}b`, i)),
            upper: u.map((m, i) => unpackModule(m, `share-${n + 2}u`, i)),
          })),
      ],
      materials: {
        carcassColor: CARCASS_COLORS[p.m?.[0] ?? 0]?.name ?? DEFAULT_MATERIALS.carcassColor,
        facade: {
          color: FACADE_COLORS[p.m?.[1] ?? 0]?.name ?? DEFAULT_MATERIALS.facade.color,
          type: FACADE_TYPES[p.m?.[2] ?? 0] ?? DEFAULT_MATERIALS.facade.type,
        },
        worktop: WORKTOP_TYPES[p.m?.[3] ?? 0] ?? DEFAULT_MATERIALS.worktop,
        opening: OPENINGS[p.m?.[4] ?? 0] ?? DEFAULT_MATERIALS.opening,
        drawers: DRAWERS[p.m?.[5] ?? 0] ?? DEFAULT_MATERIALS.drawers,
      },
      furnishings,
      rulesVersion: RULES_VERSION,
    };
  } catch {
    // Счупен или чужд линк — по-добре празно, отколкото срив.
    return null;
  }
}

/** Адресът, на който този проект се отваря отново. */
export function projectLink(origin: string, path: string, kitchen: Kitchen): string {
  return `${origin}${path}?p=${encodeProject(kitchen)}`;
}
