/**
 * Сцената като готова картинка — и в трите ѝ прочита.
 *
 * Дотук обемът живееше само на екрана: нищо не излизаше от браузъра
 * освен PDF с чертежа. Това е първото звено към визуализация с модел
 * (`docs/PLAN.md`, Е) и върши работа и само по себе си — картинка за
 * имейл и за Viber.
 *
 * Три прочита на един и същи кадър:
 *
 *   материали — това, което човек вижда на екрана, едно към едно
 *   дълбочина — сиво по разстояние: близкото бяло, далечното черно
 *   части     — плосък цвят по роля: зид, под, плот, фасада, уред
 *
 * Последните две са това, което кара модела да нарисува ТАЗИ кухня, а
 * не някаква. Чужд софтуер ги гадае от снимка; тук са сметнати, защото
 * сцената не е снимана, а построена.
 *
 * Тук няма React. Влизат обеми и камера, излиза низ — затова се
 * проверява с тест, а не с око.
 */

import type { Kitchen, WorktopType } from './cabinet-rules';
import { CARCASS_COLORS, FACADE_COLORS, swatch } from '@/config/materials';
import { finishById } from '@/config/wall-finishes';
import { floorById } from '@/config/floor-finishes';
import {
  type Surface,
  finishIdFor,
  floorSurface,
  innerWallPlane,
  isFloorTop,
  wallSurface,
} from './wall-finish';
import { type Pt, wallMarks } from './wall-pattern';
import { WALL_SIDES, type Room, type WallSide } from './furniture/room';
import { dressFace, faceSurface, glossByRole, povarhnostFor } from './povarhnost';
import { AO_INK, type Contact, baseContacts, floorContacts, gradientEnds, wallContacts } from './ao';
import {
  type Box,
  type BoxRole,
  type Camera,
  type Face,
  project,
  shade,
  tint,
  viewBoxFor,
  visibleFaces,
} from './scene3d';

const WORKTOP_COLOR: Record<WorktopType, string> = {
  laminate38: '#6f6a62',
  quartz20: '#d9d6cf',
  sintered12: '#3b3a38',
  granite30: '#53514d',
};

/** Цвят на всяка роля според избраните материали. */
export function paletteFor(kitchen: Kitchen): Record<string, string> {
  const carcass = swatch(CARCASS_COLORS, kitchen.materials.carcassColor)?.hex ?? '#efece6';
  const facade =
    FACADE_COLORS.find((s) => s.name.startsWith(kitchen.materials.facade.color))?.hex ?? '#f1ece4';
  return {
    // Подът е топъл, зидът — по-светъл от мебелта. Светла фасада върху
    // зид от същата стойност се слива с него и шкафовете престават да
    // са предмети; стената трябва да е фон, не съсед.
    floor: '#cfc6b7',
    // Общото покритие на стените; без избор е топлото бяло отпреди.
    wall: finishById(kitchen.wallFinish?.all).hex,
    carcass,
    facade,
    worktop: WORKTOP_COLOR[kitchen.materials.worktop],
    plinth: '#45433f',
    appliance: '#8d9399',
    handle: '#8e8a84',
    // Сянката е тъмна и леко топла; светло петно върху светъл под не се чете.
    shadow: '#241f18',
    // Вътрешността е от същата плоскост като корпуса.
    shelf: carcass,
    rod: '#9a968f',
    seam: '#9d9284',
    // Съседната стая не се вижда — през отвора се гледа в полумрак.
    doorway: '#2a2621',
    // Каса и крило: бели, както е в почти всяко жилище. // ПРОВЕРИ
    casing: '#f3f1ed',
    door: '#eceae5',
    // Денят отвън. Светло петно върху зида казва „прозорец" по-ясно от
    // истинска прозрачност, зад която и без това няма какво да се види.
    glass: '#dce7ef',
    // Обзавеждането е чуждо изделие и нарочно е в други цветове.
    wood: '#8a6a4a',
    soft: '#6e7378',
  };
}

/** Светлината в шестнайсетичен цвят, с топлия или студения ѝ отенък. */
export function litColor(hex: string, amount: number, warmth = { r: 1, g: 1, b: 1 }): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number, k: number) =>
    Math.max(0, Math.min(255, Math.round(((n >> shift) & 255) * amount * k)));
  const to2 = (v: number) => v.toString(16).padStart(2, '0');
  return `#${to2(channel(16, warmth.r))}${to2(channel(8, warmth.g))}${to2(channel(0, warmth.b))}`;
}

/**
 * Всяка повърхност прелива отгоре надолу — истинските не са еднакво
 * осветени по цялата си височина. Преливките се правят наготово за
 * няколко степени яркост и се ползват повторно; иначе всяко от стотиците
 * лица иска свое определение и рисуването се скапва.
 */
const STEPS = 18;

/** Степените на осветяване. Ползва се и от самия изглед. */
export const SHADE_STEPS = STEPS;

export interface Shaded {
  id: string;
  top: string;
  bottom: string;
}

/**
 * Колко се разтяга преливката по едно лице според блясъка.
 *
 * Матовото разсейва светлината равномерно и почти няма разлика между
 * горния и долния си край. Гланцовото отразява: горе — тавана, долу —
 * пода, затова горният му край е светъл, а долният пада. Това е цялата
 * разлика, която окото търси, и се прави с две числа вместо с
 * отражение, което при един кадър и без това би лъгало.
 */
export function glossSpread(gloss: number): { hi: number; lo: number } {
  const g = Math.max(0, Math.min(1, gloss));
  return { hi: 1 + 0.22 * g, lo: 1 - 0.3 * g };
}

export function gradientsFor(
  faces: Face[],
  palette: Record<string, string>,
  /** Колко лъщи ролята: 0 мат, 1 огледало. Без това — както преди. */
  glossOf?: (role: BoxRole) => number,
): { defs: Shaded[]; idOf: (face: Face) => string } {
  const defs = new Map<string, Shaded>();

  const key = (face: Face) => {
    const step = Math.max(0, Math.min(STEPS, Math.round(shade(face.normal) * STEPS)));
    return `${face.role}-${step}`;
  };

  for (const face of faces) {
    const id = key(face);
    if (defs.has(id)) continue;
    const base = palette[face.role] ?? palette.carcass;
    const amount = Math.round(shade(face.normal) * STEPS) / STEPS;
    const warmth = tint(face.normal);
    // 0.33 възпроизвежда разтягането отпреди блясъка: ×1.07 / ×0.90.
    const { hi, lo } = glossSpread(glossOf?.(face.role) ?? 0.33);
    defs.set(id, {
      id,
      top: litColor(base, Math.min(1.25, amount * hi), warmth),
      bottom: litColor(base, amount * lo, warmth),
    });
  }

  return { defs: [...defs.values()], idOf: key };
}

/* --- Прочитите --------------------------------------------------- */

export type Pass = 'material' | 'depth' | 'parts';

/**
 * Цветовете на картата на частите.
 *
 * Плоски и нарочно далечни един от друг: това не е картина, а карта —
 * чете се от машина, която различава области, не отсенки. Затова и
 * никакво осветяване: сянка върху зида би я направила втора област.
 */
export const PART_COLOR: Record<BoxRole, string> = {
  floor: '#804000',
  wall: '#c0c0c0',
  carcass: '#0000ff',
  facade: '#00a0ff',
  worktop: '#ff00ff',
  plinth: '#004080',
  appliance: '#808080',
  handle: '#ffff00',
  shadow: '#000000',
  shelf: '#0060c0',
  rod: '#c0c000',
  seam: '#906030',
  doorway: '#202020',
  casing: '#00ff00',
  door: '#008000',
  glass: '#00ffff',
  wood: '#ff8000',
  soft: '#ff0000',
};

/**
 * Докъде стига сцената от окото.
 *
 * Сивото се разтяга между най-близкото и най-далечното видимо: карта с
 * един и същ обхват за всички стаи би направила малката стая равномерно
 * сива и формите в нея биха изчезнали.
 */
export function depthRange(faces: Face[], cam: Camera): { near: number; far: number } {
  let near = Infinity;
  let far = -Infinity;
  for (const face of faces) {
    for (const corner of face.corners) {
      const d = project(corner, cam).depth;
      if (d < near) near = d;
      if (d > far) far = d;
    }
  }
  return Number.isFinite(near) ? { near, far } : { near: 0, far: 1 };
}

/** Сиво по разстояние: близкото бяло, далечното черно. */
export function depthColor(face: Face, cam: Camera, range: { near: number; far: number }): string {
  const mid =
    face.corners.reduce((s, c) => s + project(c, cam).depth, 0) / Math.max(1, face.corners.length);
  const span = Math.max(1, range.far - range.near);
  const t = Math.max(0, Math.min(1, 1 - (mid - range.near) / span));
  const v = Math.round(t * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${v}${v}${v}`;
}

/* --- Готовият документ ------------------------------------------- */

function escapeXml(text: string): string {
  return text.replace(/[<>&"]/g, (c) => `&${{ '<': 'lt', '>': 'gt', '&': 'amp', '"': 'quot' }[c]};`);
}

/**
 * Лице с покритие — зид с тухли, под с паркет.
 *
 * Същата сметка, с която рисува и екранът (`WallSurface`): шарката се
 * прави по самата стена и тук само се пренася в перспектива. Вторият
 * път би се разминал с първия и износът щеше да лъже.
 */
function surfaceMarkup(
  face: Face,
  surface: Surface,
  finish: { id: string; hex: string; pattern: Parameters<typeof wallMarks>[0] },
  cam: Camera,
  id: string,
  gloss = 0.33,
): string {
  const amount = Math.round(shade(face.normal) * STEPS) / STEPS;
  const warmth = tint(face.normal);
  const light = (hex: string) => litColor(hex, amount, warmth);

  const at = ([u, v]: Pt) => {
    const p = project(surface.at(u, v), cam);
    return `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  };
  const points = face.corners
    .map((c) => {
      const p = project(c, cam);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');

  const marks = wallMarks(finish.pattern, surface.area, surface.seed);
  const fills = marks.fills
    .map(
      (layer) =>
        `<path d="${layer.polys.map((poly) => `M${poly.map(at).join('L')}Z`).join('')}"` +
        ` fill="${light(layer.color)}" fill-opacity="${layer.opacity}"/>`,
    )
    .join('');
  const lines = marks.lines
    .map(
      (layer) =>
        `<path d="${layer.segs.map(([a, b]) => `M${at(a)}L${at(b)}`).join('')}"` +
        ` fill="none" stroke="${light(layer.color)}" stroke-opacity="${layer.opacity}"` +
        ` stroke-width="${layer.width}" vector-effect="non-scaling-stroke" stroke-linecap="square"/>`,
    )
    .join('');

  const { hi, lo } = glossSpread(gloss);
  const top = litColor(finish.hex, Math.min(1.25, amount * hi), warmth);
  const bottom = litColor(finish.hex, amount * lo, warmth);

  return (
    `<defs><linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/>` +
    `</linearGradient><clipPath id="${id}-c"><polygon points="${points}"/></clipPath></defs>` +
    `<polygon points="${points}" fill="url(#${id}-g)"/>` +
    (fills || lines ? `<g clip-path="url(#${id}-c)">${fills}${lines}</g>` : '')
  );
}

/**
 * Меката тъмнина в една среща — ивица, която гасне навътре.
 *
 * Преливката върви в екранни координати от средата на тъмния ръб до
 * средата на светлия. `userSpaceOnUse` е задължително: ивицата е
 * произволен четириъгълник в перспектива и преливка по рамката му би
 * сочила накъдето ѝ хрумне.
 */
function contactMarkup(c: Contact, cam: Camera, id: string): string {
  const points = c.corners
    .map((p) => {
      const q = project(p, cam);
      return `${q.x.toFixed(1)},${q.y.toFixed(1)}`;
    })
    .join(' ');
  const ends = gradientEnds(c);
  const a = project(ends.dark, cam);
  const b = project(ends.light, cam);

  return (
    `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse"` +
    ` x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}">` +
    `<stop offset="0" stop-color="${AO_INK}" stop-opacity="${c.strength}"/>` +
    `<stop offset="1" stop-color="${AO_INK}" stop-opacity="0"/>` +
    `</linearGradient></defs>` +
    `<polygon points="${points}" fill="url(#${id})"/>`
  );
}

/**
 * Ивиците, отрязани по лицето, върху което лежат.
 *
 * Отрязването не е спретнатост. Зид с врата се рисува на парчета и
 * ивицата в ъгъла му се простира по цялата височина на стаята — без
 * отрязване тя ляга и върху отвора, в който няма зид.
 */
function clippedContacts(list: Contact[], cam: Camera, face: Face, id: string): string {
  if (!list.length) return '';
  const clip = face.corners
    .map((p) => {
      const q = project(p, cam);
      return `${q.x.toFixed(1)},${q.y.toFixed(1)}`;
    })
    .join(' ');

  return (
    `<defs><clipPath id="${id}-c"><polygon points="${clip}"/></clipPath></defs>` +
    `<g clip-path="url(#${id}-c)">` +
    list.map((c, n) => contactMarkup(c, cam, `${id}-${n}`)).join('') +
    `</g>`
  );
}


/**
 * Меките срещи, подредени по повърхността, върху която лежат.
 *
 * Правят се веднъж на кадър. Без стая срещи няма: те се знаят от
 * геометрията ѝ, а изглед без стая е гол обем на бял фон.
 */
function contactsFor(
  boxes: Box[],
  room: Room | undefined,
  cam: Camera,
  pass: Pass,
): {
  onFloor: (face: Face, i: number) => string;
  onWall: (side: WallSide, face: Face, i: number) => string;
} {
  // Картата на дълбочината и картата на частите са за машина: там
  // тъмнината в ъгъла е втора област, не сянка.
  if (!room || pass !== 'material') return { onFloor: () => '', onWall: () => '' };

  const floor = [...floorContacts(room), ...baseContacts(boxes, room)];
  const byWall = new Map<WallSide, Contact[]>();
  for (const side of WALL_SIDES) byWall.set(side, wallContacts(room, side));

  return {
    onFloor: (face, i) => clippedContacts(floor, cam, face, `aof${i}`),
    onWall: (side, face, i) => clippedContacts(byWall.get(side) ?? [], cam, face, `aow${i}`),
  };
}

export interface RenderOptions {
  /** Ширина в пиксели. Височината следва формата на кадъра. */
  width?: number;
  pass?: Pass;
  padding?: number;
  aspect?: number;
  /** Какво да се чуе, ако някой отвори картинката с четец. */
  title?: string;
  /**
   * Стаята — нужна е, за да се познае коя стена е коя и да се сложи
   * нейното покритие. Без нея всички зидове излизат с общото.
   */
  room?: Room;
  /**
   * Готов кадър вместо сметнатия по подразбиране — `tightViewBox` за
   * картината, която отива при AI модела.
   */
  viewBox?: string;
}

/**
 * Кадър плътно около нарисуваното — за картината, която отива при AI.
 *
 * Кадърът на екрана е с постоянна форма и кадрира само по неподвижното,
 * затова около стаята остава много бяло. Моделът го „дорисува" като
 * още стая, а вратата излиза дребна и той я мести. Проверено на живо на
 * 24.11.2026: със същия модел и същите думи, изрязан плътно, кадърът
 * пази вратата на мястото ѝ; с бялото около нея — не.
 *
 * Тук влиза всичко, което се вижда, и зидовете: отрязан зид моделът
 * би дорисувал наново.
 */
export function tightViewBox(boxes: Box[], cam: Camera, padding = 60): string {
  const points = visibleFaces(boxes, cam).flatMap((f) => f.corners.map((c) => project(c, cam)));
  if (!points.length) return viewBoxFor(boxes, cam);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs) - padding;
  const minY = Math.min(...ys) - padding;
  const width = Math.max(...xs) - Math.min(...xs) + padding * 2;
  const height = Math.max(...ys) - Math.min(...ys) + padding * 2;
  return `${minX} ${minY} ${width} ${height}`;
}

export interface Rendered {
  svg: string;
  width: number;
  height: number;
}

/**
 * Целият кадър като самостоятелен SVG документ.
 *
 * Самостоятелен значи: с `xmlns`, с мерки в пиксели и без нито един
 * цвят от променлива на темата. Браузърът рисува такъв низ в платно;
 * низ с `var(--accent)` вътре би излязъл черен, защото откъснатата
 * картинка не вижда страницата.
 */
export function renderScene(
  boxes: Box[],
  cam: Camera,
  kitchen: Kitchen,
  options: RenderOptions = {},
): Rendered {
  const { width = 1600, pass = 'material', padding = 220, aspect, title, room } = options;

  const faces = visibleFaces(boxes, cam);
  const viewBox = options.viewBox ?? viewBoxFor(boxes, cam, padding, aspect);
  const [, , vw, vh] = viewBox.split(' ').map(Number);
  const height = Math.round((width * vh) / Math.max(1, vw));

  const palette = paletteFor(kitchen);
  /*
   * Блясъкът на всяка роля се пита веднъж: той зависи от избраните
   * материали, не от лицето, и не бива да се смята при всяко от
   * стотиците лица.
   */
  const glossOf = glossByRole(kitchen.materials, palette);
  const gradients = gradientsFor(faces, palette, glossOf);

  /*
   * Меките срещи се рисуват върху своята повърхност, веднага след нея.
   * Подреждането по дълбочина не ги подрежда: те лежат В равнината на
   * пода и на зида, а равни дълбочини се разменят при всяко завъртане.
   */
  const ao = contactsFor(boxes, room, cam, pass);
  const range = pass === 'depth' ? depthRange(faces, cam) : { near: 0, far: 1 };

  const points = (face: Face) =>
    face.corners
      .map((c) => {
        const p = project(c, cam);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      })
      .join(' ');

  const body = faces
    .map((face, i) => {
      if (pass === 'depth') {
        // Сянката е петно на пода, не тяло: в карта на дълбочината тя
        // би изрязала дупка там, където подът е цял.
        if (face.role === 'shadow') return '';
        return `<polygon points="${points(face)}" fill="${depthColor(face, cam, range)}"/>`;
      }
      if (pass === 'parts') {
        if (face.role === 'shadow') return '';
        return `<polygon points="${points(face)}" fill="${PART_COLOR[face.role] ?? '#ffffff'}"/>`;
      }
      if (face.role === 'shadow') {
        /*
         * Размазана, не изрязана с ножица — както е и на екрана.
         * Дотук износът я рисуваше с остър ръб и картинката, която
         * тръгва по пощата, показваше друго от това, което човекът е
         * видял.
         */
        return `<polygon points="${points(face)}" fill="${palette.shadow}" opacity="0.17" filter="url(#f-shadow)"/>`;
      }

      /*
       * Зидът и подът носят покритие — тухла, плочки, паркет. Рисуват се
       * със същата сметка като на екрана; иначе изнесената картинка
       * показва плосък цвят там, където човек вижда шарка.
       */
      const floor = floorById(kitchen.floorFinish);
      if (isFloorTop(face.role, face.normal)) {
        // Без избрана настилка подът си остава какъвто е бил — рисува се
        // като всяко друго лице, с цвета от палитрата. Срещите му със
        // зида и с мебелта са там и в двата случая.
        const body = floor
          ? surfaceMarkup(face, floorSurface(face.corners), floor, cam, `s${i}`)
          : `<polygon points="${points(face)}" fill="url(#g-${gradients.idOf(face)})"/>`;
        return body + ao.onFloor(face, i);
      }
      const plane = room && face.role === 'wall'
        ? innerWallPlane(face.corners, face.normal, room)
        : null;
      if (plane) {
        const finish = finishById(finishIdFor(kitchen.wallFinish, plane.side));
        return (
          surfaceMarkup(face, wallSurface(plane, face.corners), finish, cam, `s${i}`) +
          ao.onWall(plane.side, face, i)
        );
      }

      /*
       * Мебелта също има материал: фладер по декора, зърно по гранита.
       * Същата сметка като на екрана — иначе изнесената картинка показва
       * плосък цвят там, където човек вижда дърво.
       */
      if (dressFace(face)) {
        const p = povarhnostFor(face.role, kitchen.materials, palette);
        if (p && p.pattern.kind !== 'plain') {
          const surface = faceSurface(face);
          if (surface) {
            return surfaceMarkup(
              face,
              surface,
              { id: p.id, hex: palette[face.role] ?? palette.carcass, pattern: p.pattern },
              cam,
              `s${i}`,
              glossOf(face.role),
            );
          }
        }
      }

      const fill =
        face.role === 'handle' ? palette.handle : `url(#g-${gradients.idOf(face)})`;
      return `<polygon points="${points(face)}" fill="${fill}"/>`;
    })
    .filter(Boolean)
    .join('');

  /*
   * Фонът е плътен, не прозрачен. Прозрачната картинка става черна в
   * пощенска програма и в повечето чатове — а това е най-честият ѝ път
   * навън.
   */
  const background = pass === 'material' ? '#ffffff' : pass === 'parts' ? '#000000' : '#000000';

  const defs =
    pass === 'material'
      ? `<defs><filter id="f-shadow" x="-30%" y="-30%" width="160%" height="160%">` +
        `<feGaussianBlur stdDeviation="11"/></filter>${gradients.defs
          .map(
            (g) =>
              `<linearGradient id="g-${g.id}" x1="0" y1="0" x2="0" y2="1">` +
              `<stop offset="0" stop-color="${g.top}"/>` +
              `<stop offset="1" stop-color="${g.bottom}"/>` +
              `</linearGradient>`,
          )
          .join('')}</defs>`
      : '';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"` +
    ` viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">` +
    (title ? `<title>${escapeXml(title)}</title>` : '') +
    `<rect x="-100000" y="-100000" width="200000" height="200000" fill="${background}"/>` +
    defs +
    body +
    `</svg>`;

  return { svg, width, height };
}
