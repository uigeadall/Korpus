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
import type { Room } from './furniture/room';
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

export function gradientsFor(
  faces: Face[],
  palette: Record<string, string>,
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
    defs.set(id, {
      id,
      top: litColor(base, Math.min(1.2, amount * 1.07), warmth),
      bottom: litColor(base, amount * 0.9, warmth),
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

  const top = litColor(finish.hex, Math.min(1.2, amount * 1.07), warmth);
  const bottom = litColor(finish.hex, amount * 0.9, warmth);

  return (
    `<defs><linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/>` +
    `</linearGradient><clipPath id="${id}-c"><polygon points="${points}"/></clipPath></defs>` +
    `<polygon points="${points}" fill="url(#${id}-g)"/>` +
    (fills || lines ? `<g clip-path="url(#${id}-c)">${fills}${lines}</g>` : '')
  );
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
  const viewBox = viewBoxFor(boxes, cam, padding, aspect);
  const [, , vw, vh] = viewBox.split(' ').map(Number);
  const height = Math.round((width * vh) / Math.max(1, vw));

  const palette = paletteFor(kitchen);
  const gradients = gradientsFor(faces, palette);
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
        return `<polygon points="${points(face)}" fill="${palette.shadow}" opacity="0.17"/>`;
      }

      /*
       * Зидът и подът носят покритие — тухла, плочки, паркет. Рисуват се
       * със същата сметка като на екрана; иначе изнесената картинка
       * показва плосък цвят там, където човек вижда шарка.
       */
      const floor = floorById(kitchen.floorFinish);
      // Без избрана настилка подът си остава какъвто е бил — рисува се
      // като всяко друго лице, с цвета от палитрата.
      if (floor && isFloorTop(face.role, face.normal)) {
        return surfaceMarkup(face, floorSurface(face.corners), floor, cam, `s${i}`);
      }
      const plane = room && face.role === 'wall'
        ? innerWallPlane(face.corners, face.normal, room)
        : null;
      if (plane) {
        const finish = finishById(finishIdFor(kitchen.wallFinish, plane.side));
        return surfaceMarkup(face, wallSurface(plane, face.corners), finish, cam, `s${i}`);
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
      ? `<defs>${gradients.defs
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
