/**
 * Меката тъмнина там, където две повърхности се срещат.
 *
 * Обемът изглеждаше като хартиен макет и причината е проста: всяка
 * повърхност е осветена равномерно по цялата си площ, а две съседни се
 * срещат по безупречно остра линия. В стаята не е така. В ъгъла между
 * две стени, в основата на зида, под шкафа — там светлината не стига,
 * защото собствените им плоскости си я препречват. Това е В2 в
 * `docs/PLAN.md`.
 *
 * Тук не се смята истинско засенчване. Истинското пита всяка точка
 * каква част от небето вижда и струва обход на сцената за всяка от
 * стотиците точки при всяко завъртане на камерата. Вместо това се
 * ползва това, което вече знаем: КЪДЕ са срещите. Те са малко,
 * известни са от геометрията на стаята и по тях се полага ивица, която
 * тъмнее към ръба.
 *
 * Чиста геометрия без React и без камера: излизат четириъгълници в
 * стаята, а рисуването ги проектира като всичко останало.
 */

import type { Room, WallSide } from './furniture/room';
import type { Box, Vec3 } from './scene3d';

/**
 * Докъде стига тъмнината, мм.
 *
 * Мерена е на око срещу снимки на интериор: под две педи ивицата се
 * чете като мръсотия по ръба, над половин метър — като сянка от нещо,
 * което го няма.
 */
export const BAND = 210;

/** Колко тъмно е при самия ръб. Над това започва да изглежда мокро. */
export const STRENGTH = 0.26;

/** По-слабо в основата на шкаф: там вече има и хвърлена сянка. */
const BASE_STRENGTH = 0.2;
const BASE_BAND = 150;

export interface Contact {
  /** Устойчив ключ — рисуването прави по една преливка на ивица. */
  key: string;
  /**
   * Четирите ъгъла. ПЪРВИТЕ ДВА са тъмният ръб, вторите два — светлият.
   * Редът не е украса: по него се определя накъде гасне преливката.
   */
  corners: [Vec3, Vec3, Vec3, Vec3];
  /** Непрозрачност при тъмния ръб. */
  strength: number;
}

const at = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

/*
 * Ивицата се вдига на косъм над повърхността, върху която ляга.
 * Съвпаднали равнини при рисуване по реда на бояджията трептят: при
 * едно завъртане ивицата е отгоре, при следващото — отдолу.
 */
const LIFT = 0.5;

/* --- Подът до зида --------------------------------------------------- */

/**
 * Четирите ивици по пода, по една до всяка стена.
 *
 * Връщат се всички, а не само видимите: кои се виждат решава
 * рисуването, както решава и за самите зидове.
 */
export function floorContacts(room: Room): Contact[] {
  const { width: w, depth: d } = room;
  const b = Math.min(BAND, Math.min(w, d) / 2);
  const y = LIFT;

  return [
    {
      key: 'ao-floor-top',
      corners: [at(0, y, 0), at(w, y, 0), at(w, y, b), at(0, y, b)],
      strength: STRENGTH,
    },
    {
      key: 'ao-floor-bottom',
      corners: [at(0, y, d), at(w, y, d), at(w, y, d - b), at(0, y, d - b)],
      strength: STRENGTH,
    },
    {
      key: 'ao-floor-left',
      corners: [at(0, y, 0), at(0, y, d), at(b, y, d), at(b, y, 0)],
      strength: STRENGTH,
    },
    {
      key: 'ao-floor-right',
      corners: [at(w, y, 0), at(w, y, d), at(w - b, y, d), at(w - b, y, 0)],
      strength: STRENGTH,
    },
  ];
}

/* --- Зидът до пода и до съседния зид --------------------------------- */

/** Докъде се развива стената и как точка по нея се връща в стаята. */
function wallAxis(room: Room, side: WallSide) {
  const lift = LIFT;
  switch (side) {
    case 'top':
      return { span: room.width, point: (u: number, v: number) => at(u, v, lift) };
    case 'bottom':
      return { span: room.width, point: (u: number, v: number) => at(u, v, room.depth - lift) };
    case 'left':
      return { span: room.depth, point: (u: number, v: number) => at(lift, v, u) };
    case 'right':
      return { span: room.depth, point: (u: number, v: number) => at(room.width - lift, v, u) };
  }
}

/**
 * Ивиците по една стена: една в основата ѝ и по една във всеки от
 * двата ѝ края, където се среща със съседната.
 */
export function wallContacts(room: Room, side: WallSide): Contact[] {
  const { span, point } = wallAxis(room, side);
  const height = room.height ?? 2600;
  const b = Math.min(BAND, span / 2);
  const bv = Math.min(BAND, height / 2);
  const P = (u: number, v: number) => point(u, v);

  return [
    {
      key: `ao-wall-${side}-floor`,
      corners: [P(0, 0), P(span, 0), P(span, bv), P(0, bv)],
      strength: STRENGTH,
    },
    {
      key: `ao-wall-${side}-start`,
      corners: [P(0, 0), P(0, height), P(b, height), P(b, 0)],
      strength: STRENGTH,
    },
    {
      key: `ao-wall-${side}-end`,
      corners: [P(span, 0), P(span, height), P(span - b, height), P(span - b, 0)],
      strength: STRENGTH,
    },
  ];
}

/* --- Подът около мебелта --------------------------------------------- */

/**
 * Ивица по пода пред всеки долен шкаф.
 *
 * Хвърлената сянка вече я има, но тя е насочена: идва от един
 * светилник и оставя основата на шкафа светла от другата си страна.
 * Мебелта обаче пипа пода по цялата си дължина и точно там е най-тъмно
 * — иначе шкафът изглежда закачен на сантиметър над паркета.
 *
 * Иска се обемът да СТОИ на пода: вдигнатите шкафове нямат такава
 * среща. Отрязва се и по стаята — ивица извън нея би легнала върху
 * нищо.
 */
export function baseContacts(boxes: Box[], room: Room): Contact[] {
  const out: Contact[] = [];
  const clampX = (v: number) => Math.max(0, Math.min(room.width, v));
  const clampZ = (v: number) => Math.max(0, Math.min(room.depth, v));

  for (const box of boxes) {
    if (box.shape || box.swing) continue;
    // Стои ли на пода: цокълът и долните корпуси започват от нулата.
    if (box.y > 2 || box.height < 50) continue;
    if (box.role !== 'plinth' && box.role !== 'carcass' && box.role !== 'appliance') continue;

    const b = Math.min(BASE_BAND, Math.max(box.width, box.depth));
    const y = LIFT;
    const x0 = clampX(box.x);
    const x1 = clampX(box.x + box.width);
    const z0 = clampZ(box.z);
    const z1 = clampZ(box.z + box.depth);
    if (x1 - x0 < 1 || z1 - z0 < 1) continue;

    /*
     * Ивица по четирите страни на отпечатъка. Тези, които опират в
     * зида, си остават — там зидът и без това е тъмен и ивицата не се
     * вижда, а да се познае коя страна опира иска знание за стената,
     * каквото обемът няма.
     */
    const key = box.key ?? `${box.x},${box.z}`;
    out.push(
      {
        key: `ao-base-${key}-n`,
        corners: [at(x0, y, z0), at(x1, y, z0), at(x1, y, clampZ(z0 - b)), at(x0, y, clampZ(z0 - b))],
        strength: BASE_STRENGTH,
      },
      {
        key: `ao-base-${key}-s`,
        corners: [at(x0, y, z1), at(x1, y, z1), at(x1, y, clampZ(z1 + b)), at(x0, y, clampZ(z1 + b))],
        strength: BASE_STRENGTH,
      },
      {
        key: `ao-base-${key}-w`,
        corners: [at(x0, y, z0), at(x0, y, z1), at(clampX(x0 - b), y, z1), at(clampX(x0 - b), y, z0)],
        strength: BASE_STRENGTH,
      },
      {
        key: `ao-base-${key}-e`,
        corners: [at(x1, y, z0), at(x1, y, z1), at(clampX(x1 + b), y, z1), at(clampX(x1 + b), y, z0)],
        strength: BASE_STRENGTH,
      },
    );
  }

  return out.filter(hasArea);
}

/** Ивица, свита до нищо от отрязването, не се рисува. */
function hasArea(c: Contact): boolean {
  const [a, , , d] = c.corners;
  return Math.hypot(a.x - d.x, a.y - d.y, a.z - d.z) > 1;
}

/* --- Какво се пише в документа --------------------------------------- */

/** Средата на тъмния и на светлия ръб — по тях върви преливката. */
export function gradientEnds(c: Contact): { dark: Vec3; light: Vec3 } {
  const [a, b, cc, d] = c.corners;
  return {
    dark: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 },
    light: { x: (cc.x + d.x) / 2, y: (cc.y + d.y) / 2, z: (cc.z + d.z) / 2 },
  };
}

/** Цветът на тъмнината. Същият, с който се рисуват и сенките на пода. */
export const AO_INK = '#241f18';
