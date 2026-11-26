/**
 * Покритията на стените — боя, мазилка, тухла, камък, плочки, дърво,
 * ламинат, тапети, панели. По три от най-търсените във всяка група.
 *
 * Стената не е мебел: не се реже, не се номерира и не влиза в
 * разбивката за цеха. Тя е фонът, на който клиентът вижда мебелта си,
 * и затова тук стои само това, което трябва на картината — име, цвят и
 * как е изградена повърхността.
 *
 * Цветовете са примерни, не са каталожни номера на производител. Когато
 * има доставчик на тапети или плочки, неговите декори влизат тук. Нищо
 * от това не отива в цеха, затова не носи бележка за проверка.
 *
 * Идентификаторите влизат в линка към проекта. Веднъж пуснат, `id` не се
 * сменя и не се преизползва за друго покритие — иначе стар линк отваря
 * друга стена. Нови покрития се добавят свободно.
 */

import type { PatternSpec } from '@/lib/wall-pattern';

export type FinishCategory =
  | 'boya'
  | 'mazilka'
  | 'beton'
  | 'tuhla'
  | 'kamak'
  | 'plochki'
  | 'mozaika'
  | 'mramor'
  | 'darvo'
  | 'laminat'
  | 'tapet'
  | 'paneli';

export interface WallFinish {
  /** Постоянен ключ — влиза в линка. */
  id: string;
  name: string;
  category: FinishCategory;
  /** Основният цвят на повърхността. Шарката се рисува върху него. */
  hex: string;
  pattern: PatternSpec;
}

export const FINISH_CATEGORIES: { id: FinishCategory; name: string }[] = [
  { id: 'boya', name: 'Боя' },
  { id: 'mazilka', name: 'Мазилка' },
  { id: 'beton', name: 'Бетон' },
  { id: 'tuhla', name: 'Тухла' },
  { id: 'kamak', name: 'Камък' },
  { id: 'plochki', name: 'Плочки' },
  { id: 'mozaika', name: 'Мозайка' },
  { id: 'mramor', name: 'Мрамор' },
  { id: 'darvo', name: 'Дърво' },
  { id: 'laminat', name: 'Ламинат' },
  { id: 'tapet', name: 'Тапет' },
  { id: 'paneli', name: 'Панели' },
];

/* --- Цветове ---------------------------------------------------------- */

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Смес на два цвята; `t` = 0 е първият, 1 — вторият. */
export function mix(a: string, b: string, t: number): string {
  const x = channels(a);
  const y = channels(b);
  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

const darker = (hex: string, t: number) => mix(hex, '#000000', t);
const lighter = (hex: string, t: number) => mix(hex, '#ffffff', t);

/** Три близки тона около основния — за тухли, дъски и плочки. */
const tonesOf = (hex: string, spread = 0.1) => [
  darker(hex, spread),
  lighter(hex, spread * 0.8),
  darker(hex, spread * 0.5),
];

/** Фугата е по-тъмна от светла повърхност и по-светла от тъмна. */
function jointFor(hex: string): string {
  const [r, g, b] = channels(hex);
  const light = 0.299 * r + 0.587 * g + 0.114 * b > 120;
  return light ? darker(hex, 0.22) : lighter(hex, 0.28);
}

/* --- Каталогът ---------------------------------------------------------- */

/*
 * По три във всяка група — най-търсените, не всички разновидности.
 * Изборът се прави за секунди, а редкото се поръчва след огледа.
 * Нова мостра се добавя с един ред тук.
 */

const plain = (id: string, name: string, hex: string): WallFinish => ({
  id,
  name,
  category: 'boya',
  hex,
  pattern: { kind: 'plain' },
});

const mottled = (
  id: string,
  name: string,
  category: FinishCategory,
  hex: string,
  scale: number,
  spread: number,
): WallFinish => ({
  id,
  name,
  category,
  hex,
  pattern: { kind: 'mottle', scale, density: 0.6, tones: [darker(hex, spread), lighter(hex, spread)] },
});

const brick = (id: string, name: string, hex: string, mortar: string, spread = 0.12): WallFinish => ({
  id,
  name,
  category: 'tuhla',
  hex,
  pattern: { kind: 'brick', w: 250, h: 75, bond: 'stretcher', mortar, tones: tonesOf(hex, spread) },
});

const stone = (
  id: string,
  name: string,
  hex: string,
  mortar: string,
  size: { course: number; minW: number; maxW: number },
): WallFinish => ({
  id,
  name,
  category: 'kamak',
  hex,
  pattern: { kind: 'stone', ...size, mortar, tones: tonesOf(hex, 0.12) },
});

const tile = (
  id: string,
  name: string,
  category: FinishCategory,
  hex: string,
  t: { w: number; h: number; offset?: number; tones?: string[]; mix?: number },
): WallFinish => ({
  id,
  name,
  category,
  hex,
  pattern: { kind: 'tile', w: t.w, h: t.h, offset: t.offset ?? 0, grout: jointFor(hex), tones: t.tones, mix: t.mix },
});

const marble = (id: string, name: string, hex: string, vein: string, density: number): WallFinish => ({
  id,
  name,
  category: 'mramor',
  hex,
  pattern: { kind: 'marble', vein, density, slab: 600, joint: jointFor(hex) },
});

const planks = (
  id: string,
  name: string,
  category: FinishCategory,
  hex: string,
  p: { w: number; length: number; spread: number },
): WallFinish => ({
  id,
  name,
  category,
  hex,
  pattern: {
    kind: 'planks',
    w: p.w,
    length: p.length,
    dir: 'h',
    gap: darker(hex, 0.35),
    tones: tonesOf(hex, p.spread),
    grain: darker(hex, 0.22),
  },
});

const slats = (id: string, name: string, hex: string): WallFinish => ({
  id,
  name,
  category: 'darvo',
  hex,
  pattern: { kind: 'slats', w: 40, gap: 20, gapColor: '#262422', tones: tonesOf(hex, 0.08) },
});

export const WALL_FINISHES: readonly WallFinish[] = [
  // Боя. Първото е днешната стена — стая без избор изглежда както винаги.
  plain('boya-default', 'Топло бяло', '#ebe7e0'),
  plain('boya-greige', 'Грейж', '#cbc3b6'),
  plain('boya-pearl', 'Перлено сиво', '#dcdcd8'),

  mottled('mazilka-dekor-white', 'Декоративна мазилка бяла', 'mazilka', '#ebe7df', 260, 0.08),
  mottled('mazilka-venec-sand', 'Венецианска мазилка пясъчна', 'mazilka', '#d5c5a8', 420, 0.12),
  mottled('mazilka-micro-grey', 'Микроцимент сив', 'mazilka', '#bcbab4', 340, 0.06),

  {
    id: 'beton-kofraj-light',
    name: 'Кофражен бетон светъл',
    category: 'beton',
    hex: '#c3c1bc',
    pattern: { kind: 'concrete', panelW: 1200, panelH: 600, joint: darker('#c3c1bc', 0.3), tones: tonesOf('#c3c1bc', 0.06) },
  },
  {
    id: 'beton-kofraj-mid',
    name: 'Кофражен бетон среден',
    category: 'beton',
    hex: '#a8a6a1',
    pattern: { kind: 'concrete', panelW: 1200, panelH: 600, joint: darker('#a8a6a1', 0.3), tones: tonesOf('#a8a6a1', 0.06) },
  },
  mottled('beton-gladak-light', 'Шлайфан бетон светъл', 'beton', '#c3c1bc', 300, 0.1),

  brick('tuhla-red-r', 'Червена тухла', '#9c4a36', '#cfc6b8'),
  brick('tuhla-old-r', 'Стара тухла', '#8a5140', '#bdb2a0', 0.18),
  brick('tuhla-white-r', 'Боядисана бяла тухла', '#ece9e3', '#d3cec5', 0.04),

  stone('kamak-travertine-block', 'Травертин', '#d9c7a6', '#c1ad8b', { course: 220, minW: 300, maxW: 640 }),
  stone('kamak-slate-tile', 'Шисти на ивици', '#5f6366', '#3f4244', { course: 80, minW: 180, maxW: 520 }),
  stone('kamak-sandstone-block', 'Пясъчник', '#c7a57c', '#a88a64', { course: 220, minW: 300, maxW: 640 }),

  tile('plochki-metro-white', 'Метро плочки бели', 'plochki', '#f1f0ec', { w: 150, h: 75, offset: 0.5 }),
  tile('plochki-60x30-greige', 'Плочки 60×30 грейж', 'plochki', '#c8bfb2', { w: 600, h: 300, offset: 0.5 }),
  tile('plochki-zellige-white', 'Зелиж бели', 'plochki', '#eeebe3', {
    w: 100,
    h: 100,
    tones: tonesOf('#eeebe3', 0.14),
    mix: 0.7,
  }),

  tile('mozaika-white', 'Мозайка бяла', 'mozaika', '#eeede9', { w: 25, h: 25, tones: ['#e2e1dc', '#f7f6f2'], mix: 0.45 }),
  tile('mozaika-grey', 'Мозайка сива', 'mozaika', '#b9bab7', {
    w: 25,
    h: 25,
    tones: ['#a2a3a0', '#cfd0cd', '#8f908d'],
    mix: 0.45,
  }),
  tile('mozaika-pool', 'Мозайка басейн', 'mozaika', '#7fb4c6', {
    w: 25,
    h: 25,
    tones: ['#5f9ab0', '#a3cbd8', '#4c86a0'],
    mix: 0.45,
  }),

  marble('mramor-carrara', 'Мрамор Карара', '#eeedea', '#9fa3a8', 0.6),
  marble('mramor-calacatta', 'Мрамор Калаката', '#f1eee8', '#a58e6c', 0.4),
  marble('mramor-marquina', 'Мрамор Неро Маркина', '#232324', '#e9e8e4', 0.45),

  slats('darvo-lameli-oak', 'Дъб, ламели', '#c49a6c'),
  slats('darvo-lameli-walnut', 'Орех, ламели', '#6e4b35'),
  planks('darvo-h-oak', 'Дъб, хоризонтална обшивка', 'darvo', '#c49a6c', { w: 140, length: 2000, spread: 0.12 }),

  planks('laminat-natural', 'Ламинат натурален дъб', 'laminat', '#c8a073', { w: 190, length: 1290, spread: 0.09 }),
  planks('laminat-nordic', 'Ламинат скандинавски дъб', 'laminat', '#dcc6a6', { w: 190, length: 1290, spread: 0.09 }),
  planks('laminat-grey-oak', 'Ламинат сив дъб', 'laminat', '#a39c92', { w: 190, length: 1290, spread: 0.09 }),

  {
    id: 'tapet-damask-cream',
    name: 'Тапет: дамаска кремава',
    category: 'tapet',
    hex: '#ece3cf',
    pattern: { kind: 'lattice', step: 220, color: '#cbb995', dot: '#c2ab7f' },
  },
  {
    id: 'tapet-ivici-white-grey',
    name: 'Тапет: ивици бяло и сиво',
    category: 'tapet',
    hex: '#f2f1ed',
    pattern: { kind: 'stripes', widths: [150, 150], colors: ['#cfd0cd', 'none'] },
  },
  {
    id: 'tapet-lista-green-cream',
    name: 'Тапет: листа зелени на кремаво',
    category: 'tapet',
    hex: '#ece3cf',
    pattern: { kind: 'motif', step: 180, color: '#7f9670', size: 48, offset: true },
  },

  {
    id: 'paneli-lamperia-white',
    name: 'Ламперия бяла',
    category: 'paneli',
    hex: '#ebe7e0',
    pattern: { kind: 'wainscot', height: 950, panel: 600, lower: '#f3f1ec', rail: jointFor('#f3f1ec') },
  },
  {
    id: 'paneli-rebra-oak',
    name: 'Ребрест панел дъб',
    category: 'paneli',
    hex: '#c49a6c',
    pattern: { kind: 'fluted', w: 30, light: lighter('#c49a6c', 0.15), dark: darker('#c49a6c', 0.2) },
  },
  {
    id: 'paneli-3d-white',
    name: 'Обемни панели бели',
    category: 'paneli',
    hex: '#eceae5',
    pattern: { kind: 'panels3d', size: 500, light: lighter('#eceae5', 0.18), dark: darker('#eceae5', 0.16) },
  },
];

export const DEFAULT_WALL_FINISH_ID = 'boya-default';

const BY_ID = new Map(WALL_FINISHES.map((f) => [f.id, f]));

/** Покритието по ключ. Непознат ключ — например от бъдещ линк — дава подразбиращото се. */
export function finishById(id: string | undefined): WallFinish {
  return (id && BY_ID.get(id)) || BY_ID.get(DEFAULT_WALL_FINISH_ID)!;
}

export function isKnownFinish(id: string | undefined): boolean {
  return Boolean(id && BY_ID.has(id));
}

/** Покритията в една група, в реда на каталога. */
export function finishesIn(category: FinishCategory): WallFinish[] {
  return WALL_FINISHES.filter((f) => f.category === category);
}

/** Търсене по име, без значение от главни и малки букви. */
/**
 * Търсене по име и група. `prevod` дава името на езика на страницата —
 * търси се и в него, и в българското, за да стига и „brick", и „тухла".
 */
export function searchFinishes(query: string, prevod?: (bg: string) => string): WallFinish[] {
  const low = (s: string) => s.toLocaleLowerCase();
  const words = low(query.trim()).split(/\s+/).filter(Boolean);
  if (!words.length) return [...WALL_FINISHES];
  const both = (bg: string) => (prevod ? `${low(bg)} ${low(prevod(bg))}` : low(bg));
  const groupName = new Map(FINISH_CATEGORIES.map((c) => [c.id, both(c.name)]));
  return WALL_FINISHES.filter((f) => {
    const hay = `${both(f.name)} ${groupName.get(f.category)}`;
    return words.every((w) => hay.includes(w));
  });
}
