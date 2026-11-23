/**
 * Приближаване към точката под мишката.
 *
 * Обемът е SVG и се кадрира с `viewBox`. Приближаването не мести окото —
 * то стеснява кадъра. Затова рисуването, щракането и влаченето работят и
 * отблизо: проекцията е същата, само рамката е по-малка.
 *
 * Точката под мишката остава под мишката. Първият опит теглеше кадъра
 * към средата на посочения шкаф; докато се плъзгаше, под мишката идваше
 * съседният, следващото завъртане теглеше към него и изгледът започваше
 * да се люшка между шкафовете. Така, както приближават картите, няма
 * към какво да се скача — расте това, което сочиш.
 */

export type ViewBox = [x: number, y: number, width: number, height: number];

/** Кадърът при приближение — ширина и среда, в единиците на сцената. */
export interface Zoom {
  width: number;
  cx: number;
  cy: number;
}

export function parseViewBox(value: string): ViewBox {
  const [x, y, w, h] = value.split(/\s+/).map(Number);
  return [x, y, w, h];
}

/** Колко силно реагира колелцето: едно щракване е около 25%. */
const SPEED = 0.0025;
/**
 * Пружината в двата края. Колелцето може да мине малко отвъд — най-
 * близкото или цялата стая — и после `settle` го връща. Твърдото спиране
 * се усеща като заседнало колело.
 */
const GIVE = 0.35;
const OVER_IN = 0.82;
const OVER_OUT = 1.14;

/** Най-близкото: една шеста от цялата стая — колкото да се види шкаф отвътре. */
export function closestWidth(full: ViewBox): number {
  return full[2] / 6;
}

/** Средата никога не изкарва кадъра извън цялата стая. */
function keepInside(z: Zoom, full: ViewBox): Zoom {
  const [fx, fy, fw, fh] = full;
  const h = (z.width * fh) / fw;
  const fit = (c: number, size: number, from: number, span: number) =>
    size >= span ? from + span / 2 : Math.min(from + span - size / 2, Math.max(from + size / 2, c));
  return { width: z.width, cx: fit(z.cx, z.width, fx, fw), cy: fit(z.cy, h, fy, fh) };
}

/**
 * Едно завъртане на колелцето в точка `at` от сцената. `deltaY` < 0
 * приближава. Точката под мишката остава на мястото си на екрана.
 */
export function zoomStep(
  zoom: Zoom | null,
  opts: { deltaY: number; at: { x: number; y: number }; full: ViewBox; minWidth: number },
): Zoom {
  const { deltaY, at, full } = opts;
  const fw = full[2];
  const cur = zoom ?? { width: fw, cx: full[0] + fw / 2, cy: full[1] + full[3] / 2 };
  const minWidth = Math.min(opts.minWidth, fw);
  const raw = cur.width * Math.exp(deltaY * SPEED);
  // Отвъд края колелцето тежи и не стига далеч — пружината се опъва.
  const width =
    raw < minWidth
      ? Math.max(minWidth * OVER_IN, minWidth - (minWidth - raw) * GIVE)
      : raw > fw
        ? Math.min(fw * OVER_OUT, fw + (raw - fw) * GIVE)
        : raw;
  const f = width / cur.width;
  return keepInside({ width, cx: at.x + (cur.cx - at.x) * f, cy: at.y + (cur.cy - at.y) * f }, full);
}

/**
 * Щипане като завъртане на колелцето: пръстите раздалечени двойно
 * приближават толкова, колкото колелцето за същото свиване на кадъра.
 */
export function deltaForScale(scale: number): number {
  return scale > 0 ? -Math.log(scale) / SPEED : 0;
}

/**
 * Пружината се отпуска: кадърът се връща в границите си. Стигнал ли е
 * цялата стая или отвъд, приближението свършва — `null`.
 */
export function settle(zoom: Zoom | null, full: ViewBox, minWidth: number): Zoom | null {
  if (!zoom || zoom.width >= full[2] - 1e-6) return null;
  const floor = Math.min(minWidth, full[2]);
  return zoom.width < floor ? keepInside({ ...zoom, width: floor }, full) : zoom;
}

/** Колко е приближено: 0 е цялата стая, към 1 — съвсем отблизо. */
export function zoomAmount(zoom: Zoom | null, fullWidth: number): number {
  return zoom ? Math.max(0, 1 - zoom.width / fullWidth) : 0;
}

/** Кадърът при това приближение — винаги в границите на цялата стая. */
export function zoomedViewBox(zoom: Zoom | null, full: ViewBox): string {
  if (!zoom) return full.join(' ');
  const z = keepInside(zoom, full);
  const h = (z.width * full[3]) / full[2];
  return `${z.cx - z.width / 2} ${z.cy - h / 2} ${z.width} ${h}`;
}
