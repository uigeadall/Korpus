/**
 * Обзавеждането: маси, столове, диван, легло.
 *
 * Това НЕ е корпусна мебел. Нищо тук не се реже от плоскост, не се
 * номерира и не влиза в заявката за цеха — това са готови изделия
 * (бизнес план §3.2, „допълващи продуктови линии"). Стоят в сцената,
 * за да види клиентът дали стаята му работи: минава ли се покрай
 * масата, събира ли се диванът срещу ТВ стената.
 *
 * Ако някога започнат да се поръчват, ще им трябва собствен каталог с
 * доставчик и цена — но пак отделно от разкроя.
 *
 * Размерите са номинални и в милиметри. // ПРОВЕРИ
 */

import type { RoomKind } from './cabinet-rules';

export type FurnishingKind =
  | 'dining-table'
  | 'chair'
  | 'sofa'
  | 'armchair'
  | 'coffee-table'
  | 'bed'
  | 'nightstand';

export type FurnishingRole = 'wood' | 'soft' | 'metal';

export interface FurnishingSpec {
  kind: FurnishingKind;
  label: string;
  /** По широчина, дълбочина и височина, в собствените му оси. */
  width: number;
  depth: number;
  height: number;
  /** В кои стаи се предлага. */
  rooms: RoomKind[];
}

export const FURNISHINGS: Record<FurnishingKind, FurnishingSpec> = {
  'dining-table': {
    kind: 'dining-table',
    label: 'Маса за хранене',
    width: 1600,
    depth: 900,
    height: 750,
    rooms: ['kitchen', 'living'],
  },
  chair: {
    kind: 'chair',
    label: 'Стол',
    width: 450,
    depth: 480,
    height: 880,
    rooms: ['kitchen', 'living'],
  },
  sofa: {
    kind: 'sofa',
    label: 'Диван',
    width: 2200,
    depth: 950,
    height: 850,
    rooms: ['living'],
  },
  armchair: {
    kind: 'armchair',
    label: 'Фотьойл',
    width: 900,
    depth: 880,
    height: 850,
    rooms: ['living'],
  },
  'coffee-table': {
    kind: 'coffee-table',
    label: 'Холна маса',
    width: 1100,
    depth: 600,
    height: 420,
    rooms: ['living'],
  },
  bed: {
    kind: 'bed',
    label: 'Легло',
    width: 1600,
    depth: 2000,
    height: 600,
    rooms: ['bedroom'],
  },
  nightstand: {
    kind: 'nightstand',
    label: 'Нощно шкафче',
    width: 450,
    depth: 400,
    height: 520,
    rooms: ['bedroom'],
  },
};

/** Един поставен предмет: къде стои и накъде гледа. */
export interface Furnishing {
  id: string;
  kind: FurnishingKind;
  /** Центърът му в координатите на стаята. */
  x: number;
  z: number;
  /** Завъртане около отвесната ос, радиани. */
  rotation: number;
}

export function furnishingsFor(room: RoomKind): FurnishingSpec[] {
  return Object.values(FURNISHINGS).filter((f) => f.rooms.includes(room));
}

/** Частите на един предмет, в собствените му оси около центъра (0,0). */
export interface Slab {
  /** Отместване от центъра по широчина и дълбочина. */
  dx: number;
  dz: number;
  /** Долен ръб над пода. */
  y: number;
  width: number;
  depth: number;
  height: number;
  role: FurnishingRole;
}

const LEG = 60;

/** Плот на крака: четирите крака плюс самата плоскост. */
function table(width: number, depth: number, height: number, top = 40): Slab[] {
  const inset = 90;
  const legs: Slab[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      legs.push({
        dx: (sx * (width / 2 - inset - LEG / 2)),
        dz: (sz * (depth / 2 - inset - LEG / 2)),
        y: 0,
        width: LEG,
        depth: LEG,
        height: height - top,
        role: 'wood',
      });
    }
  }
  legs.push({ dx: 0, dz: 0, y: height - top, width, depth, height: top, role: 'wood' });
  return legs;
}

export function slabsOf(kind: FurnishingKind): Slab[] {
  const s = FURNISHINGS[kind];

  switch (kind) {
    case 'dining-table':
    case 'coffee-table':
      return table(s.width, s.depth, s.height, kind === 'coffee-table' ? 30 : 40);

    case 'chair': {
      const seat = 460;
      return [
        ...table(s.width, s.depth, seat, 40).slice(0, 4),
        { dx: 0, dz: 0, y: seat - 40, width: s.width, depth: s.depth, height: 40, role: 'wood' },
        {
          dx: 0,
          dz: s.depth / 2 - 30,
          y: seat,
          width: s.width,
          depth: 40,
          height: s.height - seat,
          role: 'wood',
        },
      ];
    }

    case 'sofa':
    case 'armchair': {
      const arm = 180;
      const seat = 420;
      const backT = 180;
      /*
       * При завъртане 0 диванът гледа към −Z, тоест към стената, до
       * която стои мебелта. Облегалката затова е отзад, към +Z.
       */
      // Колко възглавници: диванът се дели по около метър.
      const seats = Math.max(1, Math.round((s.width - 2 * arm) / 1000));
      const gap = 24;
      const seatWidth = (s.width - 2 * arm - gap * (seats - 1)) / seats;
      const cushions: Slab[] = [];
      for (let i = 0; i < seats; i++) {
        const dx = -(s.width - 2 * arm) / 2 + seatWidth / 2 + i * (seatWidth + gap);
        // седалка
        cushions.push({
          dx,
          dz: -backT / 2,
          y: 0,
          width: seatWidth,
          depth: s.depth - backT,
          height: seat,
          role: 'soft',
        });
        // гръбна възглавница, малко по-напред от облегалката
        cushions.push({
          dx,
          dz: (s.depth - backT) / 2 - 30,
          y: seat - 40,
          width: seatWidth,
          depth: backT - 60,
          height: s.height - seat + 40,
          role: 'soft',
        });
      }

      return [
        ...cushions,
        // облегалка
        {
          dx: 0,
          dz: (s.depth - backT) / 2,
          y: 0,
          width: s.width,
          depth: backT,
          height: s.height,
          role: 'soft',
        },
        // подлакътници
        ...[-1, 1].map((side) => ({
          dx: (side * (s.width - arm)) / 2,
          dz: -backT / 2,
          y: 0,
          width: arm,
          depth: s.depth - backT,
          height: seat + 220,
          role: 'soft' as const,
        })),
      ];
    }

    case 'bed':
      return [
        // матрак на рамка
        { dx: 0, dz: 0, y: 220, width: s.width, depth: s.depth, height: 260, role: 'soft' },
        { dx: 0, dz: 0, y: 0, width: s.width - 80, depth: s.depth - 80, height: 220, role: 'wood' },
        // табла към стената
        {
          dx: 0,
          dz: -(s.depth / 2 + 25),
          y: 0,
          width: s.width,
          depth: 50,
          height: 950,
          role: 'wood',
        },
      ];

    case 'nightstand':
      return [{ dx: 0, dz: 0, y: 0, width: s.width, depth: s.depth, height: s.height, role: 'wood' }];
  }
}

/**
 * Половината от мястото, което предметът заема по осите на стаята.
 *
 * Завъртян правоъгълник заема друг правоъгълник — диван 2200×950 на
 * четвърт оборот иска 950 по ширина и 2200 по дълбочина. Ползва се,
 * за да не излиза извън стаята при влачене.
 */
export function halfExtent(kind: FurnishingKind, rotation: number): { x: number; z: number } {
  const s = FURNISHINGS[kind];
  const cos = Math.abs(Math.cos(rotation));
  const sin = Math.abs(Math.sin(rotation));
  return {
    x: (s.width * cos + s.depth * sin) / 2,
    z: (s.width * sin + s.depth * cos) / 2,
  };
}
