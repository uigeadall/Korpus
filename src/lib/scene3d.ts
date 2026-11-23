/**
 * Стилизиран обемен изглед — чисти обеми, не фотореализъм.
 *
 * Клиентът не чете чертеж. Иска да види мебелта в стаята си и да каже
 * „да, това е". Затова тук няма текстури, отражения и меки сенки, а
 * плътни обеми с ясни ръбове: същият език като чертежа, само в три
 * измерения. Нищо не се докарва отвън — проекцията е няколко реда
 * тригонометрия, а рисуването е SVG.
 *
 * Координати на света, в милиметри:
 *   X — по ширината на стаята
 *   Y — нагоре от пода
 *   Z — навътре в стаята (същото като `y` в плана отгоре)
 */

import {
  DIM,
  type Kitchen,
  MODULES,
  shelfCount,
  type PlacedModule,
  type OpeningType,
  WORKTOP_THICKNESS,
  type WorktopType,
  moduleGeometry,
} from './cabinet-rules';
import { kitchenDoor, kitchenWindows } from './cabinet-rules';
import { footprint, facingOf, type Rect, type Room, type WallSide } from './furniture/room';
import {
  DOOR,
  WINDOW,
  type OpeningSpan,
  type RoomDoor,
  type RoomWindow,
  doorFreePoint,
  doorHingePoint,
  doorSpan,
  windowSpan,
} from './openings';
import { slabsOf } from './furnishings';
import { facadePanels, handleFor } from './facade';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Правоъгълен обем, подравнен по осите. */
export interface Box {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  /** За какво отговаря обемът — определя цвета. */
  role: BoxRole;
  /** Накъде гледа лицето; null за под, стени и плот. */
  facing: WallSide | null;
  code?: string | null;
  /** Кой модул е това — по него се щрака и се пуска рафт вътре. */
  moduleId?: string;
  /**
   * Устойчива самоличност на обема. Редът на рисуване се пренарежда
   * при всяко движение на камерата; без нея React подменя кой възел
   * какво представлява и фокусът от клавиатурата скача на чужд шкаф.
   */
  key?: string;
  /**
   * Само за стените на стаята: накъде гледат навън. Стена, която е
   * между окото и стаята, не се рисува — иначе зазижда кухнята.
   */
  outward?: Vec3;
  /**
   * Отворена врата: завъртане около отвесна ос през пантите. Единствено
   * тук обемът спира да е успореден на осите.
   */
  swing?: { pivotX: number; pivotZ: number; angle: number };
  /**
   * Готов многоъгълник вместо кутия — за хвърлените сенки, които са
   * произволна форма на пода, а не паралелепипед.
   */
  shape?: Vec3[];
}

export type BoxRole =
  | 'floor'
  | 'wall'
  | 'carcass'
  | 'facade'
  | 'worktop'
  | 'plinth'
  | 'appliance'
  | 'handle'
  | 'shadow'
  | 'shelf'
  | 'rod'
  | 'seam'
  // Вратата на стаята: тъмнината отвъд отвора, касата и крилото.
  | 'doorway'
  | 'casing'
  | 'door'
  | 'glass'
  // Обзавеждане: готови изделия, не корпусна мебел.
  | 'wood'
  | 'soft';

export interface Camera {
  /** Завъртане около вертикалата, радиани. 0 гледа стаята отпред. */
  yaw: number;
  /** Наклон надолу, радиани. */
  pitch: number;
  /** Отдалечаване от центъра на стаята, мм. */
  distance: number;
  target: Vec3;
}

export const DEFAULT_CAMERA = (room: Room): Camera => ({
  yaw: -0.58,
  pitch: 0.26,
  // По-близо значи по-силна перспектива. Отдалечена камера прави
  // картината аксонометрична и тя престава да се чете като обем.
  distance: Math.max(room.width, room.depth) * 1.15 + 1700,
  target: { x: room.width / 2, y: 1050, z: room.depth / 2 },
});

/** Колкото по-голямо, толкова по-плоска перспективата. */
const FOCAL = 1700;

export interface Projected {
  x: number;
  y: number;
  /** Разстояние до камерата; по-голямо значи по-далеч. */
  depth: number;
}

/**
 * Къде стои окото. Камерата обикаля около `target`: `yaw` я върти
 * около стаята, `pitch` я вдига нагоре. При нули тя стои пред стаята,
 * на височината на погледа.
 */
export function eyeOf(cam: Camera): Vec3 {
  const cosP = Math.cos(cam.pitch);
  return {
    x: cam.target.x + Math.sin(cam.yaw) * cosP * cam.distance,
    y: cam.target.y + Math.sin(cam.pitch) * cam.distance,
    z: cam.target.z + Math.cos(cam.yaw) * cosP * cam.distance,
  };
}

export function project(p: Vec3, cam: Camera): Projected {
  const dx = p.x - cam.target.x;
  const dy = p.y - cam.target.y;
  const dz = p.z - cam.target.z;

  const cosY = Math.cos(cam.yaw);
  const sinY = Math.sin(cam.yaw);
  const x1 = dx * cosY - dz * sinY;
  const z1 = dx * sinY + dz * cosY;

  const cosP = Math.cos(cam.pitch);
  const sinP = Math.sin(cam.pitch);
  const y2 = dy * cosP - z1 * sinP;
  const z2 = dy * sinP + z1 * cosP;

  // Окото е пред стаята, затова по-голямото Z е по-близо, а не по-далеч.
  const depth = cam.distance - z2;
  const scale = FOCAL / Math.max(depth, 1);
  return { x: x1 * scale, y: -y2 * scale, depth };
}

/* --- Стените на обема ---------------------------------------------- */

export interface Face {
  corners: Vec3[];
  normal: Vec3;
  role: BoxRole;
  code?: string | null;
  moduleId?: string;
  /** Устойчив ключ: на кой обем и коя негова стена е. */
  key: string;
  /** Лицева ли е стената на шкафа — там се рисуват фугите и дръжките. */
  front: boolean;
}

const NORMALS: Vec3[] = [
  { x: 0, y: 0, z: -1 },
  { x: 0, y: 0, z: 1 },
  { x: -1, y: 0, z: 0 },
  { x: 1, y: 0, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 1, z: 0 },
];

/** Накъде сочи лицето на мебел до тази стена, в посоките на света. */
export function facingNormal(side: WallSide): Vec3 {
  switch (side) {
    case 'top':
      return { x: 0, y: 0, z: 1 };
    case 'bottom':
      return { x: 0, y: 0, z: -1 };
    case 'right':
      return { x: -1, y: 0, z: 0 };
    case 'left':
      return { x: 1, y: 0, z: 0 };
  }
}

export function boxFaces(b: Box): Face[] {
  // Готовата форма е едно лице, гледащо нагоре — сянка на пода.
  if (b.shape) {
    return [
      {
        corners: b.shape,
        normal: { x: 0, y: 1, z: 0 },
        role: b.role,
        moduleId: b.moduleId,
        key: `${b.key ?? b.role}:s`,
        front: false,
      },
    ];
  }

  const { x, y, z, width: w, height: h, depth: d } = b;
  const corner = (i: number, j: number, k: number): Vec3 => ({
    x: x + i * w,
    y: y + j * h,
    z: z + k * d,
  });

  const quads: Vec3[][] = [
    [corner(0, 0, 0), corner(1, 0, 0), corner(1, 1, 0), corner(0, 1, 0)], // -Z
    [corner(1, 0, 1), corner(0, 0, 1), corner(0, 1, 1), corner(1, 1, 1)], // +Z
    [corner(0, 0, 1), corner(0, 0, 0), corner(0, 1, 0), corner(0, 1, 1)], // -X
    [corner(1, 0, 0), corner(1, 0, 1), corner(1, 1, 1), corner(1, 1, 0)], // +X
    [corner(0, 0, 1), corner(1, 0, 1), corner(1, 0, 0), corner(0, 0, 0)], // -Y
    [corner(0, 1, 0), corner(1, 1, 0), corner(1, 1, 1), corner(0, 1, 1)], // +Y
  ];

  const facing = b.facing ? facingNormal(b.facing) : null;
  // Отворената врата се върти около пантите; върховете и нормалите
  // тръгват заедно, иначе осветяването и отрязването на обърнатите
  // стени започват да лъжат.
  const turn = b.swing ? aroundY(b.swing.pivotX, b.swing.pivotZ, b.swing.angle) : null;

  return quads.map((corners, i) => ({
    corners: turn ? corners.map(turn.point) : corners,
    normal: turn ? turn.direction(NORMALS[i]) : NORMALS[i],
    role: b.role,
    code: b.code,
    moduleId: b.moduleId,
    key: `${b.key ?? b.role}:${i}`,
    front:
      facing !== null &&
      NORMALS[i].x === facing.x &&
      NORMALS[i].y === facing.y &&
      NORMALS[i].z === facing.z,
  }));
}

/** Завъртане около отвесна ос през (pivotX, pivotZ). */
function aroundY(pivotX: number, pivotZ: number, angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    point: (p: Vec3): Vec3 => {
      const dx = p.x - pivotX;
      const dz = p.z - pivotZ;
      return { x: pivotX + dx * cos - dz * sin, y: p.y, z: pivotZ + dx * sin + dz * cos };
    },
    direction: (v: Vec3): Vec3 => ({
      x: v.x * cos - v.z * sin,
      y: v.y,
      z: v.x * sin + v.z * cos,
    }),
  };
}

/** Гледа ли стената към камерата. Обърнатите се пропускат. */
export function facesCamera(face: Face, cam: Camera): boolean {
  const centre = centroid(face.corners);
  const eye = eyeOf(cam);
  const view = { x: eye.x - centre.x, y: eye.y - centre.y, z: eye.z - centre.z };
  return face.normal.x * view.x + face.normal.y * view.y + face.normal.z * view.z > 0;
}

export function centroid(points: Vec3[]): Vec3 {
  const n = points.length || 1;
  return {
    x: points.reduce((s, p) => s + p.x, 0) / n,
    y: points.reduce((s, p) => s + p.y, 0) / n,
    z: points.reduce((s, p) => s + p.z, 0) / n,
  };
}

/**
 * Редът на рисуване: отзад напред. При обеми, които не се пресичат,
 * сортирането по средна дълбочина стига — алгоритъмът на бояджията.
 */
export function paintOrder(faces: Face[], cam: Camera): Face[] {
  return faces
    .map((face) => ({
      face,
      depth: project(centroid(face.corners), cam).depth,
    }))
    .sort((a, b) => b.depth - a.depth)
    .map((entry) => entry.face);
}

/**
 * Колко светла е стената.
 *
 * Едно слънце прави страните в сянка еднакво мъртви и телата изглеждат
 * изрязани от хартия. Истинската стая има три неща: главна светлина от
 * прозореца, слаба насрещна от отсрещната стена и разсеяна, която идва
 * отвсякъде. Трите заедно оставят разлика между страните, без някоя да
 * пада в черно.
 */
const KEY = { x: -0.46, y: 0.78, z: 0.43 };
const FILL = { x: 0.72, y: 0.28, z: 0.63 };

function lambert(normal: Vec3, light: Vec3): number {
  return Math.max(0, normal.x * light.x + normal.y * light.y + normal.z * light.z);
}

export function shade(normal: Vec3): number {
  const key = lambert(normal, KEY);
  const fill = lambert(normal, FILL);
  // Подът отскача малко светлина нагоре — затова и долните страни не са черни.
  const bounce = Math.max(0, -normal.y) * 0.08;
  /*
   * Дъното е вдигнато, а разликата между осветено и сенчесто — свита.
   * Стаята се гледа на екран, а не вечер: при 0.42 най-тъмната стена
   * падаше до една трета от цвета си и целият кадър посивяваше, каквито
   * и светли материали да са избрани. Обемът се чете от разликата, не
   * от това колко тъмно е най-тъмното.
   */
  return 0.6 + 0.34 * key + 0.12 * fill + bounce;
}

/**
 * Топло или студено е осветена стената. Главната светлина е топла,
 * насрещната — студена; това разделя страните и без да им мени
 * яркостта. Връща отместване по канали около единицата.
 */
export function tint(normal: Vec3): { r: number; g: number; b: number } {
  const key = lambert(normal, KEY);
  const fill = lambert(normal, FILL);
  const warm = 0.045 * key;
  const cool = 0.05 * fill;
  return { r: 1 + warm - cool * 0.5, g: 1 + warm * 0.5, b: 1 - warm * 0.6 + cool };
}

/* --- Светът ---------------------------------------------------------- */

/** Таванът, когато стаята не казва своя. */
const ROOM_HEIGHT_DEFAULT = 2600;
/** Дебелина на фасадата, която стърчи пред корпуса. */
const FACADE_T = 18;
/** Колко излиза дръжката пред фасадата. */
const HANDLE_OUT = 26;

/**
 * Докъде стига отворената врата. Деветдесет градуса и нагоре изглежда
 * хаотично на плътен ред — съседните врати се застъпват, както би се
 * случило и наистина, ако отвориш всички наведнъж.
 */
/**
 * Посоката, по която падат сенките — отделна от тази, която осветява.
 *
 * Главната светлина трябва да идва отпред, за да са огрени лицата на
 * мебелта. Но мебелта стои до задния зид и сянка отпред пада зад него,
 * където не се вижда. Затова сенките се хвърлят от светилник високо
 * над дъното на стаята: падат напред, върху видимия под.
 *
 * Архитектурните рендери правят същото — светлина за вида и слънце за
 * сенките са два различни източника.
 */
const SHADOW_LIGHT = { x: -0.26, y: 0.88, z: -0.42 };

/**
 * Къде пада точка, ако светлината я свали на пода. Това е истинска
 * хвърлена сянка, а не петно под предмета — формата ѝ издава и
 * силуета, и височината.
 */
export function dropToFloor(p: Vec3): { x: number; z: number } {
  const t = p.y / SHADOW_LIGHT.y;
  return { x: p.x - SHADOW_LIGHT.x * t, z: p.z - SHADOW_LIGHT.z * t };
}

/**
 * Обвивката на точките — най-малкият изпъкнал многоъгълник около тях
 * (обхождане по Андрю). Сянката на кутия е обвивката на осемте ѝ
 * върха, свалени на пода.
 */
export function convexHull(points: { x: number; z: number }[]): { x: number; z: number }[] {
  if (points.length < 3) return points;
  const sorted = [...points].sort((a, b) => a.x - b.x || a.z - b.z);
  const cross = (
    o: { x: number; z: number },
    a: { x: number; z: number },
    b: { x: number; z: number },
  ) => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);

  const half = (list: typeof sorted) => {
    const out: typeof sorted = [];
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };

  return [...half(sorted), ...half([...sorted].reverse())];
}

/** Отрязва изпъкнал многоъгълник по правоъгълника на пода. */
export function clipToRoom(
  polygon: { x: number; z: number }[],
  room: Room,
): { x: number; z: number }[] {
  const edges: { inside: (p: { x: number; z: number }) => boolean; at: (a: { x: number; z: number }, b: { x: number; z: number }) => { x: number; z: number } }[] = [
    { inside: (p) => p.x >= 0, at: (a, b) => ({ x: 0, z: a.z + ((b.z - a.z) * (0 - a.x)) / (b.x - a.x) }) },
    { inside: (p) => p.x <= room.width, at: (a, b) => ({ x: room.width, z: a.z + ((b.z - a.z) * (room.width - a.x)) / (b.x - a.x) }) },
    { inside: (p) => p.z >= 0, at: (a, b) => ({ x: a.x + ((b.x - a.x) * (0 - a.z)) / (b.z - a.z), z: 0 }) },
    { inside: (p) => p.z <= room.depth, at: (a, b) => ({ x: a.x + ((b.x - a.x) * (room.depth - a.z)) / (b.z - a.z), z: room.depth }) },
  ];

  let out = polygon;
  for (const edge of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const a = input[i];
      const b = input[(i + 1) % input.length];
      const aIn = edge.inside(a);
      const bIn = edge.inside(b);
      if (aIn) out.push(a);
      if (aIn !== bIn) out.push(edge.at(a, b));
    }
    if (!out.length) return [];
  }
  return out;
}

/** Хвърлената сянка на едно тяло върху пода. */
export function castShadow(box: Box, room: Room): Vec3[] | null {
  const corners = boxFaces(box).flatMap((f) => f.corners);
  if (!corners.length) return null;
  const hull = clipToRoom(convexHull(corners.map(dropToFloor)), room);
  if (hull.length < 3) return null;
  return hull.map((p) => ({ x: p.x, y: 2, z: p.z }));
}

/**
 * Сянка, подрязана по пода. Петното се разлива по-широко от предмета,
 * за да се види изпод него — но не може да падне извън стаята.
 */
function shadowBox(room: Room, box: Omit<Box, 'role' | 'facing'>): Box {
  const x = Math.max(0, box.x);
  const z = Math.max(0, box.z);
  return {
    ...box,
    x,
    z,
    width: Math.min(room.width, box.x + box.width) - x,
    depth: Math.min(room.depth, box.z + box.depth) - z,
    role: 'shadow',
    facing: null,
  };
}

const DOOR_OPEN = (75 * Math.PI) / 180;

/**
 * Около коя ос и накъде се върти една врата.
 *
 * Пантите са на единия ѝ ръб, но кой е той в координатите на света
 * зависи от стената: по долната и лявата местното ляво е световно
 * дясно. Затова посоката не се предполага, а се смята — избира се
 * знакът, при който свободният ръб тръгва навън, към стаята.
 */
function swingOf(
  side: WallSide,
  rect: Rect,
  panel: { dx: number; width: number; hinge: 'left' | 'right' | null },
  open: number,
): Box['swing'] {
  if (!panel.hinge || open <= 0) return undefined;

  // Пантите и свободният ръб, прекарани през същото преобразуване
  // като самото лице.
  const edge = (dx: number) =>
    frontBox(side, rect, 0, { dx, dy: 0, width: 0, height: 0 }, { from: 0, to: 0 }, 'facade');
  const hingeAt = panel.hinge === 'left' ? panel.dx : panel.dx + panel.width;
  const freeAt = panel.hinge === 'left' ? panel.dx + panel.width : panel.dx;
  const pivot = edge(hingeAt);
  const free = edge(freeAt);

  const arm = { x: free.x - pivot.x, z: free.z - pivot.z };
  const out = facingNormal(side);
  // Завъртането мести свободния ръб по (ŷ × arm); знакът ѝ спрямо
  // лицевата посока казва накъде е „навън".
  const sideways = { x: -arm.z, z: arm.x };
  const outward = sideways.x * out.x + sideways.z * out.z;

  return {
    pivotX: pivot.x,
    pivotZ: pivot.z,
    angle: (outward >= 0 ? 1 : -1) * DOOR_OPEN * open,
  };
}

interface CarcassRun {
  x: number;
  width: number;
  geometry: { y: number; height: number; depth: number };
  /** Кои модули стоят в този участък — слетият корпус носи първия. */
  ids: string[];
}

/**
 * Съседните шкафове с еднаква вертикална геометрия стават един корпус.
 * Колоната и шкафът над аспиратора имат своя височина и затова се
 * отделят сами.
 */
function carcassRuns(modules: PlacedModule[]): CarcassRun[] {
  const runs: CarcassRun[] = [];
  for (const m of modules) {
    const geometry = moduleGeometry(m.kind);
    const last = runs.at(-1);
    const sameShape =
      last &&
      last.x + last.width === m.x &&
      last.geometry.y === geometry.y &&
      last.geometry.height === geometry.height &&
      last.geometry.depth === geometry.depth;
    if (sameShape) {
      last.width += m.width;
      last.ids.push(m.id);
    } else {
      runs.push({ x: m.x, width: m.width, geometry, ids: [m.id] });
    }
  }
  return runs;
}

/**
 * Тяло, залепено за лицето на модул, зададено в неговите собствени
 * координати: `dx` по стената отляво надясно, `dy` нагоре от долния му
 * ръб, а `from`/`to` — колко навътре и навън от лицевата равнина.
 *
 * Стената решава накъде е „навън" и в коя посока расте `dx`: по долната
 * и лявата стена мебелта гледа обратно и местното ляво е световно дясно.
 */
function frontBox(
  side: WallSide,
  rect: Rect,
  baseY: number,
  local: { dx: number; dy: number; width: number; height: number },
  out: { from: number; to: number },
  role: BoxRole,
): Box {
  const common = {
    y: baseY + local.dy,
    height: local.height,
    role,
    facing: side,
  };

  switch (side) {
    case 'top': {
      const face = rect.y + rect.height;
      return {
        ...common,
        x: rect.x + local.dx,
        width: local.width,
        z: face + out.from,
        depth: out.to - out.from,
      };
    }
    case 'bottom': {
      const face = rect.y;
      return {
        ...common,
        x: rect.x + (rect.width - local.dx - local.width),
        width: local.width,
        z: face - out.to,
        depth: out.to - out.from,
      };
    }
    case 'right': {
      const face = rect.x;
      return {
        ...common,
        x: face - out.to,
        width: out.to - out.from,
        z: rect.y + local.dx,
        depth: local.width,
      };
    }
    case 'left': {
      const face = rect.x + rect.width;
      return {
        ...common,
        x: face + out.from,
        width: out.to - out.from,
        z: rect.y + (rect.height - local.dx - local.width),
        depth: local.width,
      };
    }
  }
}

/** Дебелина на зида. */
const WALL_T = 120;

const SHELL_OUTWARD: Record<WallSide, Vec3> = {
  top: { x: 0, y: 0, z: -1 },
  bottom: { x: 0, y: 0, z: 1 },
  left: { x: -1, y: 0, z: 0 },
  right: { x: 1, y: 0, z: 0 },
};

/**
 * Зидът на една стена. Горният и долният се продължават с дебелината на
 * страничните, за да няма процеп в ъглите.
 */
export function shellWall(room: Room, side: WallSide): Box {
  const common = { role: 'wall' as const, facing: null, outward: SHELL_OUTWARD[side] };
  // Зидът стига до тавана на стаята, не до общото 2,60 м.
  const ROOM_H = room.height ?? ROOM_HEIGHT_DEFAULT;
  const long = room.width + 2 * WALL_T;
  switch (side) {
    case 'top':
      return { x: -WALL_T, y: 0, z: -WALL_T, width: long, height: ROOM_H, depth: WALL_T, ...common };
    case 'bottom':
      return { x: -WALL_T, y: 0, z: room.depth, width: long, height: ROOM_H, depth: WALL_T, ...common };
    case 'left':
      return { x: -WALL_T, y: 0, z: 0, width: WALL_T, height: ROOM_H, depth: room.depth, ...common };
    case 'right':
      return { x: room.width, y: 0, z: 0, width: WALL_T, height: ROOM_H, depth: room.depth, ...common };
  }
}

/** Вижда ли се тази стена отвътре при тази камера. */
export function sideVisible(room: Room, side: WallSide, cam: Camera): boolean {
  return !wallInTheWay(shellWall(room, side), cam);
}

/** Ъгъл, от който се вижда вътрешното лице на тази стена. */
const YAW_TO_SEE: Record<WallSide, number> = {
  top: -0.58,
  right: -0.58,
  left: 0.58,
  bottom: Math.PI + 0.58,
};

/** Докъде се вдига камерата, преди изгледът да стане план. */
const LIFT_MAX = 1.45;

/**
 * Камерата, обърната така, че тази стена да се вижда.
 *
 * Сложи ли човек вратата на зид, който стои между окото и стаята, тя
 * изчезва от картината — направил е нещо и нищо не се е случило.
 *
 * Първо се пробва завъртане настрани. То не върши работа за стената,
 * през която се гледа: за да се види тя отстрани, трябва да се обиколи
 * стаята, а тогава мебелта остава с гръб към окото и картината не
 * казва нищо. Затова в този случай камерата се вдига над стаята,
 * както се гледа кукленска къща — отгоре стоят и четирите зида.
 *
 * `keep` е стената, която не бива да се губи — тази с мебелта.
 */
export function cameraFacing(
  room: Room,
  side: WallSide,
  keep: WallSide,
  cam: Camera,
): Camera {
  if (sideVisible(room, side, cam)) return cam;

  const turned = { ...cam, yaw: YAW_TO_SEE[side] };
  if (sideVisible(room, side, turned) && sideVisible(room, keep, turned)) return turned;

  for (let pitch = cam.pitch + 0.02; pitch <= LIFT_MAX; pitch += 0.02) {
    const lifted = { ...cam, pitch };
    if (sideVisible(room, side, lifted) && sideVisible(room, keep, lifted)) return lifted;
  }

  // Стая, по-дълга от обсега на вдигането: по-добре завъртяна, отколкото
  // врата, която я няма никъде.
  return turned;
}

type PlainBox = Omit<Box, 'role' | 'facing'>;

/** Отвор в зид: докъде стига по стената и докъде на височина. */
export interface WallHole {
  from: number;
  to: number;
  bottom: number;
  top: number;
}

/**
 * Зид с отвори: това, което остава от него.
 *
 * Стената се разрязва на ивици по всички ръбове на отворите; във всяка
 * ивица остава зид там, където нито един отвор не стига. Така излизат
 * сами и стълбовете отстрани, и прагът над вратата, и парапетът под
 * прозореца — без отделен случай за всяко от тях. Зид без отвори си
 * остава един обем.
 */
export function wallWithHoles(
  box: PlainBox,
  axis: 'x' | 'z',
  holes: readonly WallHole[],
): PlainBox[] {
  const lo = axis === 'x' ? box.x : box.z;
  const hi = lo + (axis === 'x' ? box.width : box.depth);
  const yLo = box.y;
  const yHi = box.y + box.height;

  const cut = holes
    .map((h) => ({
      from: Math.max(lo, h.from),
      to: Math.min(hi, h.to),
      bottom: Math.max(yLo, h.bottom),
      top: Math.min(yHi, h.top),
    }))
    .filter((h) => h.to > h.from && h.top > h.bottom);
  if (!cut.length) return [box];

  const piece = (a: number, b: number, y: number, height: number): PlainBox =>
    axis === 'x'
      ? { ...box, x: a, width: b - a, y, height }
      : { ...box, z: a, depth: b - a, y, height };

  const edges = [...new Set([lo, hi, ...cut.flatMap((h) => [h.from, h.to])])].sort(
    (a, b) => a - b,
  );

  const out: PlainBox[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const a = edges[i];
    const b = edges[i + 1];
    if (b <= a) continue;

    // Кои отвори минават през тази ивица и докъде по височина.
    const bands = cut
      .filter((h) => h.from < b && a < h.to)
      .map((h) => [h.bottom, h.top] as const)
      .sort((p, q) => p[0] - q[0]);

    if (!bands.length) {
      out.push(piece(a, b, yLo, yHi - yLo));
      continue;
    }

    // Зидът е това, което остава между отворите по височина.
    let y = yLo;
    for (const [bottom, top] of bands) {
      if (bottom > y) out.push(piece(a, b, y, bottom - y));
      y = Math.max(y, top);
    }
    if (yHi > y) out.push(piece(a, b, y, yHi - y));
  }
  return out;
}

/**
 * Касата, тъмнината отвъд и крилото.
 *
 * Строят се в местни мерки на отвора — `a` по стената, `y` нагоре, `n`
 * навътре в зида от вътрешното му лице — и се пренасят в стаята. Така
 * една и съща сметка върши работа и за четирите стени.
 */
/**
 * Местните мерки на един отвор, пренесени в координатите на стаята:
 * `a` върви по стената, `y` нагоре, `n` навътре в зида от вътрешното
 * му лице. Така една и съща сметка върши работа и за четирите стени.
 */
function placerFor(span: OpeningSpan, side: WallSide) {
  const dir = side === 'bottom' || side === 'right' ? 1 : -1;
  return (a0: number, a1: number, y: number, height: number, n0: number, n1: number): PlainBox => {
    const lo = dir > 0 ? span.at + n0 : span.at - n1;
    const thick = n1 - n0;
    return span.axis === 'x'
      ? { x: a0, width: a1 - a0, y, height, z: lo, depth: thick }
      : { x: lo, width: thick, y, height, z: a0, depth: a1 - a0 };
  };
}

function doorBoxes(room: Room, door: RoomDoor, outward: Vec3): Box[] {
  const span = doorSpan(room, door);
  const at = placerFor(span, door.side);

  const { from, to } = span;
  const h = door.height;
  const C = DOOR.CASING;
  const lining = 24;
  const boxes: Box[] = [];

  const add = (role: BoxRole, box: PlainBox) =>
    boxes.push({ ...box, role, facing: null, outward });

  /*
   * Отвъд зида е друга стая — тъмна, за да личи, че отворът е отвор.
   * Стои в самия край на отвора, не зад него: изнесена навън, тя се
   * подава отстрани на зида и стърчи в кадъра като черна перка.
   */
  add('doorway', at(from, to, 0, h, WALL_T - 40, WALL_T));

  // Жамбът: дебелината на зида, видяна през отвора.
  add('casing', at(from, from + lining, 0, h, 0, WALL_T));
  add('casing', at(to - lining, to, 0, h, 0, WALL_T));
  add('casing', at(from, to, h - lining, lining, 0, WALL_T));

  // Касата лежи върху зида около отвора и стърчи малко в стаята.
  add('casing', at(from - C, from, 0, h + C, -20, 0));
  add('casing', at(to, to + C, 0, h + C, -20, 0));
  add('casing', at(from - C, to + C, h, C, -20, 0));

  /*
   * Крилото. Затворено то стои в отвора; завъртането около пантите го
   * отваря навътре в стаята. Знакът на ъгъла не се предполага — взема
   * се този, при който свободният ръб тръгва към стаята, както при
   * вратичките на шкафовете.
   */
  const hinge = doorHingePoint(room, door);
  const free = doorFreePoint(room, door);
  const arm = { x: free.x - hinge.x, z: free.y - hinge.y };
  const into = facingOf(door.side);
  const sideways = { x: -arm.z, z: arm.x };
  const sign = sideways.x * into.dx + sideways.z * into.dy >= 0 ? 1 : -1;

  boxes.push({
    ...at(from + lining, to - lining, 0, h - lining, lining, lining + DOOR.LEAF),
    role: 'door',
    facing: null,
    outward,
    swing: {
      pivotX: hinge.x,
      pivotZ: hinge.y,
      angle: sign * (door.swing === 'in' ? DOOR.OPEN_ANGLE : -DOOR.OPEN_ANGLE),
    },
  });

  return boxes;
}

/**
 * Прозорецът: жамб, рамка, стъкло и перваз.
 *
 * Стъклото не е прозрачно — в стилизиран изглед светлото петно върху
 * тъмния зид казва „прозорец" по-ясно от истинска прозрачност, а и
 * зад него няма какво да се види.
 */
function windowBoxes(room: Room, win: RoomWindow, outward: Vec3): Box[] {
  const span = windowSpan(room, win);
  const at = placerFor(span, win.side);
  const { from, to } = span;
  const bottom = win.sill;
  const top = win.sill + win.height;
  const F = WINDOW.FRAME;
  const lining = 24;
  /** Стъклото стои по средата на зида, както е в масивна стена. */
  const glassAt = WALL_T / 2;

  const boxes: Box[] = [];
  const add = (role: BoxRole, box: PlainBox) =>
    boxes.push({ ...box, role, facing: null, outward });

  // Жамбът — дебелината на зида, видяна през отвора.
  add('casing', at(from, from + lining, bottom, win.height, 0, glassAt));
  add('casing', at(to - lining, to, bottom, win.height, 0, glassAt));
  add('casing', at(from, to, top - lining, lining, 0, glassAt));
  add('casing', at(from, to, bottom, lining, 0, glassAt));

  // Светлото отвън, което прави отвора прозорец.
  add('glass', at(from + F, to - F, bottom + F, win.height - 2 * F, glassAt, glassAt + 20));

  // Рамката около стъклото и вертикалният шпрос при широк прозорец.
  add('casing', at(from, from + F, bottom, win.height, glassAt - 10, glassAt + 30));
  add('casing', at(to - F, to, bottom, win.height, glassAt - 10, glassAt + 30));
  add('casing', at(from, to, top - F, F, glassAt - 10, glassAt + 30));
  add('casing', at(from, to, bottom, F, glassAt - 10, glassAt + 30));
  if (to - from > 1000) {
    const mid = (from + to) / 2;
    add('casing', at(mid - F / 2, mid + F / 2, bottom, win.height, glassAt - 10, glassAt + 30));
  }

  // Первазът стърчи в стаята — по него се познава, че прозорецът е нисък.
  add('casing', at(from - 30, to + 30, bottom - 30, 30, -WINDOW.LEDGE, glassAt));

  return boxes;
}

/**
 * Обемите на цялата кухня в стаята: под, двете видими стени, шкафовете
 * по всички стени, плотовете и цокълът.
 */
export function sceneFor(
  kitchen: Kitchen,
  room: Room,
  placed: { base: PlacedModule[]; upper: PlacedModule[] }[],
  worktop: WorktopType,
  opening: OpeningType = 'handles',
  /**
   * Колко е отворен всеки шкаф. Число = всички еднакво; карта по
   * идентификатор = всеки сам за себе си.
   */
  open: number | Readonly<Record<string, number>> = 0,
): Box[] {
  const openOf = (id: string): number =>
    typeof open === 'number' ? open : (open[id] ?? 0);
  const boxes: Box[] = [];
  const t = WORKTOP_THICKNESS[worktop];

  boxes.push({
    x: 0,
    y: -60,
    z: 0,
    width: room.width,
    height: 60,
    depth: room.depth,
    role: 'floor',
    facing: null,
  });

  /*
   * Фугите между дъските на пода. Най-голямата площ в кадъра е подът и
   * без тях той е просто цветно петно — нищо не казва колко е голяма
   * стаята и накъде гледаш.
   */ // ПРОВЕРИ ширината на дъската
  const PLANK = 190;
  for (let x = PLANK; x < room.width; x += PLANK) {
    boxes.push({
      x: x - 6,
      y: 1,
      z: 0,
      width: 12,
      height: 1,
      depth: room.depth,
      role: 'seam',
      facing: null,
    });
  }

  /*
   * И четирите стени, всяка с посоката си навън. Кои се виждат решава
   * камерата в `visibleFaces`: двете зад кухнята остават, двете пред
   * окото падат, за да гледаш в стаята, а не в гърба ѝ.
   */
  const door = kitchenDoor(kitchen);
  const windows = kitchenWindows(kitchen);
  const walls = (['top', 'bottom', 'left', 'right'] as const).map((side) => {
    const shell = shellWall(room, side);
    // `role` и `facing` се задават наново по-долу, затова кутията минава
    // както е — отвън се ползват само размерите и посоката навън.
    return { side, box: shell as PlainBox, outward: shell.outward as Vec3 };
  });
  for (const wall of walls) {
    /*
     * Зидът не е един обем там, където има врата или прозорец: остават
     * стълбовете отстрани, прагът отгоре и парапетът отдолу. Стена без
     * отвори минава по същия път и си остава цяла.
     */
    const holes: WallHole[] = [];
    if (wall.side === door.side) {
      const span = doorSpan(room, door);
      holes.push({ from: span.from, to: span.to, bottom: 0, top: door.height });
    }
    for (const win of windows) {
      if (win.side !== wall.side) continue;
      const span = windowSpan(room, win);
      holes.push({ from: span.from, to: span.to, bottom: win.sill, top: win.sill + win.height });
    }

    for (const piece of wallWithHoles(wall.box, wall.side === 'top' || wall.side === 'bottom' ? 'x' : 'z', holes)) {
      boxes.push({ ...piece, role: 'wall', facing: null, outward: wall.outward });
    }

    /*
     * Тясна тъмна ивица по дъното на всеки зид. В ъгъла между стена и
     * под светлината не стига и там винаги е по-тъмно; без това стаята
     * изглежда като изрязана от хартия.
     */
    const strip = 260;
    const along = wall.outward.x !== 0;
    boxes.push(
      shadowBox(room, {
        x: along ? (wall.outward.x < 0 ? 0 : room.width - strip) : 0,
        y: 1,
        z: along ? 0 : wall.outward.z < 0 ? 0 : room.depth - strip,
        width: along ? strip : room.width,
        height: 1,
        depth: along ? room.depth : strip,
        outward: wall.outward,
      }),
    );
  }

  boxes.push(...doorBoxes(room, door, walls.find((w) => w.side === door.side)!.outward));
  for (const win of windows) {
    boxes.push(...windowBoxes(room, win, walls.find((w) => w.side === win.side)!.outward));
  }

  kitchen.walls.forEach((wall, index) => {
    const side = wall.side ?? 'top';
    const rows = placed[index];
    if (!rows) return;

    for (const row of ['base', 'upper'] as const) {
      const modules = rows[row].filter((m) => m.kind !== 'lgap' && m.kind !== 'ugap');

      /*
       * Корпусите се сливат на непрекъснати участъци, вместо да са по
       * един на шкаф. Съседните шкафове си допират страниците и тези
       * вътрешни стени никога не се виждат наяве — но в сцената
       * съществуват и подреждането по дълбочина не ги разрешава срещу
       * тялото на съседа. Избиваха като бели и тъмни петна по реда.
       */
      for (const run of carcassRuns(modules)) {
        const rect = footprint(room, side, run.x, run.width, run.geometry.depth);
        boxes.push({
          x: rect.x,
          y: run.geometry.y,
          z: rect.y,
          width: rect.width,
          height: run.geometry.height,
          depth: rect.height,
          role: 'carcass',
          facing: side,
          moduleId: run.ids[0],
        });
      }

      for (const m of modules) {
        const geometry = moduleGeometry(m.kind);
        const rect = footprint(room, side, m.x, m.width, geometry.depth);
        const ajar = openOf(m.id);

        /*
         * Лицата стърчат пред корпуса, както е и в действителност. Без
         * тях шкафът е гола кутия и целият ред се чете като един блок —
         * вратите и челата са това, което го прави мебел.
         */
        /*
         * Вътрешността: рафтовете и лостът. Рисуват се винаги — при
         * затворена врата лицето ги покрива, а при отворена се виждат.
         * Това е целият смисъл на отварянето: клиентът да види какво
         * получава вътре, преди да го поръча.
         */
        const shelves = shelfCount(m);
        const innerHeight = geometry.height - 2 * DIM.T;
        for (let i = 1; i <= shelves; i++) {
          const dy = DIM.T + (innerHeight * i) / (shelves + 1);
          boxes.push(
            frontBox(
              side,
              rect,
              geometry.y,
              { dx: DIM.T, dy, width: m.width - 2 * DIM.T, height: DIM.T },
              { from: -geometry.depth + DIM.BACK, to: -30 },
              'shelf',
            ),
          );
          boxes[boxes.length - 1].moduleId = m.id;
        }

        if (m.kind === 'wardrobe') {
          boxes.push(
            frontBox(
              side,
              rect,
              0,
              { dx: DIM.T, dy: DIM.ROD_HEIGHT, width: m.width - 2 * DIM.T, height: 34 },
              { from: -geometry.depth / 2 - 17, to: -geometry.depth / 2 + 17 },
              'rod',
            ),
          );
          boxes[boxes.length - 1].moduleId = m.id;
        }

        const spec = MODULES[m.kind].facade;
        if (spec?.style === 'open') continue;

        for (const panel of facadePanels(m)) {
          /*
           * Вратата се върти около пантите, чекмеджето се изтегля
           * напред. Уредите и блендите стоят мирно — те не се отварят.
           */
          const pulled =
            panel.kind === 'drawer' ? ajar * Math.min(420, geometry.depth - 120) : 0;

          const face = frontBox(
            side,
            rect,
            geometry.y,
            panel,
            // Половин милиметър навътре, за да не се бие с корпуса.
            { from: -0.5 + pulled, to: FACADE_T + pulled },
            panel.kind === 'appliance' ? 'appliance' : 'facade',
          );
          const swing = panel.hinge ? swingOf(side, rect, panel, ajar) : undefined;
          boxes.push({ ...face, swing, moduleId: m.id });

          // Кутията зад извадено чекмедже — иначе челото лети само.
          if (pulled > 0) {
            boxes.push(
              frontBox(
                side,
                rect,
                geometry.y,
                {
                  dx: panel.dx + DIM.T,
                  dy: panel.dy,
                  width: panel.width - 2 * DIM.T,
                  height: Math.max(60, panel.height - 40),
                },
                { from: -geometry.depth + DIM.BACK + pulled, to: pulled },
                'shelf',
              ),
            );
            boxes[boxes.length - 1].moduleId = m.id;
          }

          if (opening !== 'handles') continue;
          const handle = handleFor(panel);
          if (!handle) continue;
          boxes.push({
            ...frontBox(
              side,
              rect,
              geometry.y,
              handle,
              { from: FACADE_T + pulled, to: FACADE_T + HANDLE_OUT + pulled },
              'handle',
            ),
            swing,
            moduleId: m.id,
          });
        }
      }
    }

    /*
     * Плотът е кухненско понятие. Гардеробът и ТВ композицията нямат
     * такъв — ако се чертае навсякъде, минава пред вратите им.
     */
    if ((kitchen.roomKind ?? 'kitchen') === 'kitchen') {
      const runs: { x: number; width: number }[] = [];
      for (const m of rows.base) {
        if (m.kind === 'column' || m.kind === 'lgap') continue;
        const last = runs.at(-1);
        if (last && last.x + last.width === m.x) last.width += m.width;
        else runs.push({ x: m.x, width: m.width });
      }
      for (const run of runs) {
        const rect = footprint(room, side, run.x, run.width, DIM.BASE_D + 20);
        boxes.push({
          x: rect.x,
          y: DIM.LEG + DIM.BASE_H,
          z: rect.y,
          width: rect.width,
          height: t,
          depth: rect.height,
          role: 'worktop',
          facing: side,
        });
      }
    }

    // Цокълът минава под всичко освен нишите, по мярката на своя ред.
    const plinth: { x: number; width: number; height: number; depth: number }[] = [];
    for (const m of rows.base) {
      if (!MODULES[m.kind].hasCarcass && m.kind !== 'dw') continue;
      const g = moduleGeometry(m.kind);
      const last = plinth.at(-1);
      if (last && last.x + last.width === m.x && last.height === g.y) last.width += m.width;
      else plinth.push({ x: m.x, width: m.width, height: g.y, depth: g.depth - 50 });
    }
    for (const run of plinth) {
      if (run.height <= 0) continue;
      const rect = footprint(room, side, run.x, run.width, run.depth);
      boxes.push({
        x: rect.x,
        y: 0,
        z: rect.y,
        width: rect.width,
        height: run.height,
        depth: rect.height,
        role: 'plinth',
        facing: side,
      });

      /*
       * Петно на пода пред цокъла. Няма меки сенки, а без контакт с
       * пода мебелта изглежда залепена за картинката, а не поставена
       * в стаята — това е най-евтиният признак за обем.
       */
      // Само напред, не настрани: иначе при кухня по цялата стена
      // петното излиза извън стаята.
      const shadow = footprint(room, side, run.x - 120, run.width + 240, run.depth + 430);
      boxes.push(
        shadowBox(room, {
          x: shadow.x,
          y: 1,
          z: shadow.y,
          width: shadow.width,
          height: 1,
          depth: shadow.height,
        }),
      );
    }
  });

  /*
   * Обзавеждането: готови изделия в средата на стаята. Нямат стена, в
   * която да стъпят, и нямат лице — стоят си както са поставени и се
   * въртят около собствения си център.
   */
  for (const f of kitchen.furnishings ?? []) {
    for (const slab of slabsOf(f.kind)) {
      boxes.push({
        x: f.x + slab.dx - slab.width / 2,
        y: slab.y,
        z: f.z + slab.dz - slab.depth / 2,
        width: slab.width,
        height: slab.height,
        depth: slab.depth,
        role: slab.role === 'soft' ? 'soft' : 'wood',
        facing: null,
        moduleId: f.id,
        swing: f.rotation ? { pivotX: f.x, pivotZ: f.z, angle: f.rotation } : undefined,
      });
    }
  }

  /*
   * Хвърлените сенки. Смятат се накрая, когато всички тела са готови,
   * и се добавят отпред в списъка, за да легнат под мебелта.
   *
   * Всяко тяло сваля върховете си по посоката на светлината до пода и
   * сянката му е обвивката им. Така формата ѝ издава и силуета, и
   * височината — петно под предмета не може да го направи.
   */
  const CASTS: ReadonlySet<BoxRole> = new Set<BoxRole>([
    'carcass',
    'facade',
    'appliance',
    'plinth',
    'worktop',
    'wood',
    'soft',
  ]);
  const cast: Box[] = [];
  for (const b of boxes) {
    if (!CASTS.has(b.role)) continue;
    const shape = castShadow(b, room);
    if (shape) {
      // Без `swing`: формата вече е сметната след завъртането и
      // второ завъртане би я отнесло настрани.
      cast.push({
        ...b,
        shape,
        y: 2,
        role: 'shadow',
        facing: null,
        moduleId: undefined,
        swing: undefined,
      });
    }
  }
  boxes.push(...cast);

  /*
   * Всеки обем получава устойчив ключ: вид, модул и пореден номер
   * между еднаквите. Пресмята се тук, защото само тук редът на
   * създаване е постоянен — после сцената се сортира по дълбочина.
   */
  const seen = new Map<string, number>();
  for (const b of boxes) {
    const base = `${b.moduleId ?? '·'}|${b.role}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    b.key = `${base}|${n}`;
  }

  return boxes;
}

/**
 * Стена на стаята, която стои между окото и стаята, се маха. Иначе от
 * всеки ъгъл гледаш в зида отвън вместо в кухнята.
 */
export function wallInTheWay(box: Box, cam: Camera): boolean {
  if (!box.outward) return false;
  const eye = eyeOf(cam);
  const centre = {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
    z: box.z + box.depth / 2,
  };
  const toEye = { x: eye.x - centre.x, y: eye.y - centre.y, z: eye.z - centre.z };
  return box.outward.x * toEye.x + box.outward.y * toEye.y + box.outward.z * toEye.z > 0;
}

/**
 * Слоеве на рисуване, подредени по отстояние от зида: черупка, сянка,
 * тела, лица, дръжки.
 *
 * Вътре във всеки слой решава дълбочината към окото, но между слоевете
 * — не. Сортирането по среден център се чупи, щом едно голямо тяло
 * стои зад няколко малки: слетият корпус е дълъг колкото целия ред и
 * средата му излиза по-близо от лицата в далечния край, та ги зазижда.
 * Подреждането по разстояние от зида е вярно при всеки ъгъл.
 */
const LAYERS: readonly (readonly BoxRole[])[] = [
  // Тъмнината отвъд отвора е най-далеч от окото — зад самия зид.
  ['doorway', 'glass'],
  ['floor', 'wall'],
  ['seam'],
  ['shadow'],
  // Касата лежи върху зида, но под всичко, което стои в стаята.
  ['casing'],
  ['carcass', 'plinth'],
  ['shelf', 'rod'],
  ['facade', 'appliance', 'worktop'],
  ['handle'],
  // Обзавеждането стои в средата на стаята, пред мебелта по стените.
  // Крилото също стърчи навътре и се подрежда наравно с него.
  ['wood', 'soft', 'door'],
];

/**
 * Всички видими стени на сцената, подредени за рисуване.
 *
 * Черупката се рисува първа, независимо от дълбочината. Сортирането по
 * среден център не ѝ върши работа: зид през цялата стая има по-близък
 * център от шкафовете до него и ги зазижда, макар да стои отстрани.
 * Мебелта е вътре в стаята по построение, затова разделянето на два
 * прохода е и по-вярно, и по-евтино от истинско сортиране.
 */
export function visibleFaces(boxes: Box[], cam: Camera): Face[] {
  const kept = boxes.filter((b) => !wallInTheWay(b, cam));
  return LAYERS.flatMap((roles) =>
    paintOrder(
      kept
        .filter((b) => roles.includes(b.role))
        .flatMap(boxFaces)
        .filter((f) => facesCamera(f, cam)),
      cam,
    ),
  );
}

/**
 * Рамка, в която се побира цялата сцена при тази камера. Чертежът се
 * мащабира по нея, за да не изскача мебел извън картината.
 */
/** Постоянна форма на кадъра — виж `viewBoxFor`. */
export const VIEW_ASPECT = 1.75;

/** Какво определя кадъра: само това, което не се движи. */
const FRAME_ON: ReadonlySet<BoxRole> = new Set<BoxRole>([
  'floor',
  'carcass',
  'worktop',
  'plinth',
]);

/**
 * Празна стая се кадрира по самата себе си — под и зидове.
 *
 * По пода сам картината става една плоскост: зидовете падат извън кадъра
 * и не личи нито че стаята има височина, нито къде е стената, до която
 * ще се нареди мебелта. И четирите зида ги има винаги в списъка (кои се
 * виждат решава камерата после), затова кадърът не подскача с ъгъла.
 */
const FRAME_EMPTY: ReadonlySet<BoxRole> = new Set<BoxRole>(['floor', 'wall']);

/**
 * Къде на пода пада дадена точка от картината.
 *
 * Обратната проекция. Трябва, за да може диванът да се влачи там,
 * където е показалецът: екранът е двумерен, подът е равнина y=0 и
 * пресечната им точка е еднозначна.
 */
export function floorPointAt(screenX: number, screenY: number, cam: Camera): Vec3 {
  const dy = -cam.target.y;
  const cosP = Math.cos(cam.pitch);
  const sinP = Math.sin(cam.pitch);

  // Виж `project`: оттам се решава z1, после дълбочината и x1.
  const a = dy * cosP;
  const c = cam.distance - dy * sinP;
  const denominator = FOCAL * sinP + screenY * cosP;
  const z1 = Math.abs(denominator) < 1e-6 ? 0 : (screenY * c + FOCAL * a) / denominator;
  const depth = Math.max(1, c - z1 * cosP);
  const x1 = (screenX * depth) / FOCAL;

  const cosY = Math.cos(cam.yaw);
  const sinY = Math.sin(cam.yaw);
  return {
    x: cam.target.x + x1 * cosY + z1 * sinY,
    y: 0,
    z: cam.target.z - x1 * sinY + z1 * cosY,
  };
}

/**
 * Коя точка от света стои зад дадена точка от картината, на зададена
 * дълбочина.
 *
 * Това е `project` наопаки. Проекцията смалява с `FOCAL/depth`; знае ли
 * се дълбочината, всяко от завъртанията се развърта обратно.
 */
function worldAtDepth(screenX: number, screenY: number, t: number, cam: Camera): Vec3 {
  const x1 = (screenX * t) / FOCAL;
  const y2 = (-screenY * t) / FOCAL;
  const z2 = cam.distance - t;

  const cosP = Math.cos(cam.pitch);
  const sinP = Math.sin(cam.pitch);
  const dy = y2 * cosP + z2 * sinP;
  const z1 = -y2 * sinP + z2 * cosP;

  const cosY = Math.cos(cam.yaw);
  const sinY = Math.sin(cam.yaw);
  return {
    x: cam.target.x + x1 * cosY + z1 * sinY,
    y: cam.target.y + dy,
    z: cam.target.z - x1 * sinY + z1 * cosY,
  };
}

/**
 * Къде лъчът през дадена точка от картината пробожда дадена равнина.
 *
 * Равнината е успоредна на две от осите — такива са и подът, и всеки от
 * четирите зида, а друга не ни трябва. По всяка ос светът е права
 * функция на дълбочината, затова се взимат две дълбочини и се решава
 * едно уравнение.
 *
 * Връща `null`, когато лъчът е успореден на равнината: тогава пробождане
 * няма и всяко число би било измислено.
 */
export function planePointAt(
  screenX: number,
  screenY: number,
  cam: Camera,
  axis: 'x' | 'y' | 'z',
  value: number,
): Vec3 | null {
  const p0 = worldAtDepth(screenX, screenY, 1, cam);
  const p1 = worldAtDepth(screenX, screenY, 2, cam);

  const slope = p1[axis] - p0[axis];
  if (Math.abs(slope) < 1e-9) return null;

  const t = (value - p0[axis]) / slope + 1;
  // Зад окото няма картина; отрицателна дълбочина значи, че равнината
  // е отзад и показалецът сочи към нейното продължение, не към нея.
  if (t <= 0) return null;

  return worldAtDepth(screenX, screenY, t, cam);
}

export function viewBoxFor(
  boxes: Box[],
  cam: Camera,
  padding = 220,
  /**
   * Формата на кадъра. По подразбиране е постоянната за стая; жилището
   * си подава своята, защото планът му не е с формата на кухня.
   */
  aspect: number = VIEW_ASPECT,
): string {
  /*
   * Кадрира се само по неподвижното. Зидовете ту ги има, ту ги няма
   * според ъгъла, а вратите излизат напред, когато се отворят — и в
   * двата случая картината би подскочила без причина.
   */
  const frame = boxes.some((b) => b.role === 'carcass') ? FRAME_ON : FRAME_EMPTY;
  const points = boxes
    .filter((b) => frame.has(b.role))
    .flatMap((b) => boxFaces(b).flatMap((f) => f.corners));
  if (!points.length) return `-500 ${-500 / aspect} 1000 ${1000 / aspect}`;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    const q = project(p, cam);
    if (q.x < minX) minX = q.x;
    if (q.x > maxX) maxX = q.x;
    if (q.y < minY) minY = q.y;
    if (q.y > maxY) maxY = q.y;
  }

  let width = maxX - minX + padding * 2;
  let height = maxY - minY + padding * 2;
  const centreX = (minX + maxX) / 2;
  const centreY = (minY + maxY) / 2;

  /*
   * Кадърът винаги е с една и съща форма. Иначе височината му следва
   * съдържанието: малка кухня в дълбока стая прави висока тясна
   * картина, която изтласква всичко под нея извън екрана.
   */
  if (width / height < aspect) width = height * aspect;
  else height = width / aspect;

  return `${centreX - width / 2} ${centreY - height / 2} ${width} ${height}`;
}

/**
 * Формата, която съдържанието заема само по себе си.
 *
 * Жилището не е с формата на кухня: вкарано в кадъра на стая, то стои
 * като марка насред плик. Затова кадърът му се прави по неговата
 * форма, сметната веднъж от неподвижно око.
 */
export function contentAspect(boxes: Box[], cam: Camera, padding = 220): number {
  const points = boxes
    .filter((b) => FRAME_ON.has(b.role))
    .flatMap((b) => boxFaces(b).flatMap((f) => f.corners))
    .map((p) => project(p, cam));
  if (!points.length) return VIEW_ASPECT;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const width = Math.max(...xs) - Math.min(...xs) + padding * 2;
  const height = Math.max(...ys) - Math.min(...ys) + padding * 2;
  if (height <= 0) return VIEW_ASPECT;
  // Нито прекалено тясно, нито прекалено широко — иначе страницата скача.
  return Math.min(2.2, Math.max(1, Math.round((width / height) * 100) / 100));
}
