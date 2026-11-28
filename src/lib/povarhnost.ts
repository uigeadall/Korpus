/**
 * От какво е направена мебелта — за окото, не за цеха.
 *
 * Досега всяко лице в обема беше плътен цвят. Светъл дъб и бяло ПДЧ се
 * различаваха само по отсянка; гланцова врата изглеждаше като матова;
 * гранитният плот — като сив картон. Това е В1 в `docs/PLAN.md` и е
 * най-голямата разлика за окото при най-малко работа: материалът се
 * познава по шарката и по блясъка, не по цвета.
 *
 * Тук няма React и няма камера. Влиза роля и избрани материали, излиза
 * описание на повърхността — същата азбука, с която се описват стените
 * (`wall-pattern.ts`). Правило №6: шарка се смята на едно място и то не
 * е тук; тук се казва КОЯ шарка.
 *
 * Какво нарочно не се прави: истинско отражение. Гланцът отразява
 * стаята, а стаята е построена и можеше да се отрази. Но отражение,
 * което лъже с един кадър, е по-лошо от честен отблясък — и струва
 * втори обход на сцената при всяко завъртане.
 */

import type { BoxRole, Face, Vec3 } from './scene3d';
import type { FacadeType, Materials, WorktopType } from './cabinet-rules';
import { isWoodColor } from '@/config/materials';
import type { PatternSpec } from './wall-pattern';
import type { Surface } from './wall-finish';

/** Повърхност: каква е на пипане и колко лъщи. */
export interface Povarhnost {
  /** За паметта на готовите шарки. */
  id: string;
  pattern: PatternSpec;
  /**
   * Колко лъщи: 0 мат, 1 огледало.
   *
   * Не е отражение, а размах на преливката по лицето. Матовото е почти
   * равно; гланцът има светъл горен край и тъмен долен, защото отразява
   * тавана горе и пода долу. Това е цялата разлика, която окото търси.
   */
  gloss: number;
}

/* --- Какво е кое ---------------------------------------------------- */

/**
 * Дървесен ли е този декор.
 *
 * Пита каталога, не името. Първият опит гадаеше по дума в името и
 * „RAL 6013 тръстика" мина за дърво — защото „тръстика" съдържа „тик".
 * Зелена боя получаваше фладер. Каталогът го казва изрично.
 */
export function isWood(colorName: string): boolean {
  return isWoodColor(colorName);
}

/** По-тъмна отсянка на цвета — за влакното по него. */
export function darker(hex: string, amount = 0.72): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => Math.round(((n >> shift) & 255) * amount);
  const to2 = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
  return `#${to2(ch(16))}${to2(ch(8))}${to2(ch(0))}`;
}

/**
 * Фладер по лице на едно парче: врата от декор, рафт от ПДЧ дъб.
 *
 * Стъпката е едра, а извивката — широка. При ситни и почти прави
 * линии декорът заприличва на гофрирана ламарина: окото чете равен
 * ритъм, а дървото няма равен ритъм. Стъпка 92 на врата от 600 дава
 * шест-седем влакна — толкова се броят и на истинска врата.
 *
 * Възлите са редки. При всяко десето влакно вратите се покриват с
 * тъмни петна и декорът заприличва на чамова дъска; на поръчковия
 * декор има по един възел на няколко врати, ако изобщо има.
 */
export function woodGrain(hex: string, dir: 'h' | 'v' = 'v'): PatternSpec {
  return { kind: 'grain', dir, color: darker(hex, 0.55), step: 92, wave: 30, knots: 0.06 };
}

/* --- Фасадата ------------------------------------------------------- */

/**
 * Колко лъщи фасадата.
 *
 * Боядисаният МДФ се прави и мат, и гланц; работната стойност е
 * копринен мат, какъвто се поръчва най-често. // ПРОВЕРИ
 * Декорът от ПДЧ е мат по своята природа — той е хартия под лак.
 */
const FACADE_GLOSS: Record<FacadeType, number> = {
  'mdf-painted': 0.45,
  'mdf-milled': 0.3,
  'pdch-decor': 0.18,
};

export function facadePovarhnost(materials: Materials, hex: string): Povarhnost {
  const type = materials.facade.type;
  const wood = type === 'pdch-decor' && isWood(materials.facade.color);
  return {
    id: `facade:${type}:${wood ? 'wood' : 'plain'}:${hex}`,
    pattern: wood ? woodGrain(hex) : { kind: 'plain' },
    gloss: FACADE_GLOSS[type],
  };
}

export function carcassPovarhnost(colorName: string, hex: string): Povarhnost {
  const wood = isWood(colorName);
  return {
    id: `carcass:${wood ? 'wood' : 'plain'}:${hex}`,
    // Корпусът се вижда отвътре и отстрани; влакното му върви нагоре,
    // както е нарязана плочата.
    pattern: wood ? woodGrain(hex) : { kind: 'plain' },
    gloss: 0.15,
  };
}

/* --- Плотът --------------------------------------------------------- */

/**
 * Камъкът на плота.
 *
 * Трите каменни плота се различават по това, което окото търси пръв:
 * кварцът е ситно зърно, гранитът — едро и пъстро, синтерованият —
 * жилка. Ламинатът е хартия и няма шарка; той е единственият, на
 * който плоско е вярно.
 */
export function worktopPovarhnost(worktop: WorktopType, hex: string): Povarhnost {
  const id = `worktop:${worktop}:${hex}`;
  switch (worktop) {
    case 'laminate38':
      return { id, pattern: { kind: 'plain' }, gloss: 0.22 };
    case 'quartz20':
      return {
        id,
        /*
         * Зърното е ситно и тоновете са близо до основния. Едри петна в
         * далечен тон изглеждат като натрошено стъкло — кварцът е лят и
         * от крачка разстояние е почти равен.
         */
        pattern: {
          kind: 'mottle',
          scale: 11,
          tones: [darker(hex, 0.93), darker(hex, 1.05)],
          density: 0.55,
        },
        gloss: 0.55,
      };
    case 'granite30':
      return {
        id,
        // По-едро и по-пъстро от кварца — това е разликата, която се вижда.
        pattern: {
          kind: 'mottle',
          scale: 15,
          tones: [darker(hex, 0.78), darker(hex, 1.16), darker(hex, 0.92)],
          density: 0.7,
        },
        gloss: 0.6,
      };
    case 'sintered12':
      return {
        id,
        /*
         * Синтерованият се прави по образец на мрамора — затова жилка.
         * Плочата е една: фуга през плот няма, а стъпката е по мярка на
         * плота, не на стена, иначе жилката излиза извън него от първата
         * си крачка.
         */
        pattern: {
          kind: 'marble',
          vein: darker(hex, 2.1),
          density: 0.45,
          slab: 620,
          joint: hex,
          joints: false,
        },
        gloss: 0.7,
      };
  }
}

/* --- Кое лице какво носи -------------------------------------------- */

/**
 * Ролите с материал. Останалите — зид, под, сянка, стъкло — или вече
 * си имат покритие, или нямат какво да покажат.
 */
const DRESSED: ReadonlySet<BoxRole> = new Set<BoxRole>([
  'facade',
  'carcass',
  'shelf',
  'worktop',
  'door',
  'wood',
]);

export function hasPovarhnost(role: BoxRole): boolean {
  return DRESSED.has(role);
}

/**
 * Струва ли си шарка точно на това лице.
 *
 * Не на всяко. Шарката е стотици отсечки и ако легне на шестте лица на
 * всеки шкаф, въртенето на камерата започва да заяжда — а пет от шест
 * не се виждат или се виждат като косъм. Рисува се там, където окото
 * наистина чете материала:
 *
 *   фасада и врата — лицето им, обърнатото навън
 *   плот и рафт    — горната страна, по която се гледа отгоре
 *   обзавеждане    — лицето и горната страна
 *
 * Корпусът остава без: той стои зад фасадата, а от него се вижда ръб.
 */
export function dressFace(face: Face): boolean {
  if (!hasPovarhnost(face.role)) return false;
  const up = face.normal.y > 0.9;
  switch (face.role) {
    case 'facade':
    case 'door':
      return face.front;
    case 'worktop':
    case 'shelf':
      return up;
    case 'wood':
      return up || face.front;
    default:
      return false;
  }
}

/**
 * Повърхността на едно лице.
 *
 * `palette` е същата, с която се оцветява сцената — цветът идва оттам,
 * за да няма две места, които знаят какъв е дъбът.
 */
export function povarhnostFor(
  role: BoxRole,
  materials: Materials,
  palette: Record<string, string>,
): Povarhnost | null {
  switch (role) {
    case 'facade':
      return facadePovarhnost(materials, palette.facade);
    case 'carcass':
    case 'shelf':
      return carcassPovarhnost(materials.carcassColor, palette.carcass);
    case 'worktop':
      return worktopPovarhnost(materials.worktop, palette.worktop);
    case 'door':
      // Вратата на стаята е боядисана, не декор.
      return { id: 'door', pattern: { kind: 'plain' }, gloss: 0.3 };
    case 'wood':
      // Обзавеждането е чуждо изделие: дърво без избор.
      return { id: `wood:${palette.wood}`, pattern: woodGrain(palette.wood, 'h'), gloss: 0.2 };
    default:
      return null;
  }
}

/**
 * Блясъкът на всяка роля, сметнат веднъж.
 *
 * Зависи от избраните материали, не от лицето, а лицата са стотици.
 * Ролите без повърхност получават това, което беше и преди блясъка —
 * зидът не бива да се промени, защото мебелта до него е научила да
 * лъщи.
 */
export const DEFAULT_GLOSS = 0.33;

export function glossByRole(
  materials: Materials,
  palette: Record<string, string>,
): (role: BoxRole) => number {
  const cache = new Map<BoxRole, number>();
  return (role) => {
    let g = cache.get(role);
    if (g === undefined) {
      g = povarhnostFor(role, materials, palette)?.gloss ?? DEFAULT_GLOSS;
      cache.set(role, g);
    }
    return g;
  };
}

/* --- Как шарката ляга върху лицето ---------------------------------- */

const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const len = (v: Vec3): number => Math.hypot(v.x, v.y, v.z);

/**
 * Различно число за всяко лице, но винаги същото за него.
 *
 * Без това всички врати получават един и същ фладер — с възела на едно
 * и също място — и кухнята заприличва на тапет. Числото идва от ключа
 * на лицето, затова преживява завъртането на камерата: шарка, която се
 * преправя при всяко движение, мига.
 */
export function seedOf(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100000;
}

/**
 * Повърхност върху лице на кутия.
 *
 * Лицето е плосък четириъгълник; шарката ляга по двете му страни.
 * Точката се връща в стаята с двойна линейна смес на четирите ъгъла —
 * затова работи и за отворена врата, която е завъртяна и вече не е
 * успоредна на осите. Правоъгълник в собствените си мерки: `u` по
 * ширината в милиметри, `v` по височината.
 *
 * Връща `null` за лице, което няма площ — изродено от закръгляне или
 * от шкаф с нулева ширина.
 */
export function faceSurface(face: Face, seed = seedOf(face.key)): Surface | null {
  const [a, b, c, d] = face.corners;
  if (!a || !b || !c || !d) return null;

  const width = (len(sub(b, a)) + len(sub(c, d))) / 2;
  const height = (len(sub(d, a)) + len(sub(c, b))) / 2;
  if (width < 1 || height < 1) return null;

  /*
   * Влакното на изправено лице трябва да върви нагоре, а ъглите идват
   * в реда, в който са изброени стените на кутията — за долната и
   * горната страна „височината" лежи по пода. Това е вярно за шарката:
   * тя пита за две посоки, не за коя от тях е отвесна.
   */
  return {
    key: face.key,
    seed,
    area: { u0: 0, u1: width, v0: 0, v1: height },
    at: (u, v) => {
      const s = width ? u / width : 0;
      const t = height ? v / height : 0;
      // a—b е долният ръб, d—c горният.
      const lo = { x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s, z: a.z + (b.z - a.z) * s };
      const hi = { x: d.x + (c.x - d.x) * s, y: d.y + (c.y - d.y) * s, z: d.z + (c.z - d.z) * s };
      return { x: lo.x + (hi.x - lo.x) * t, y: lo.y + (hi.y - lo.y) * t, z: lo.z + (hi.z - lo.z) * t };
    },
  };
}
