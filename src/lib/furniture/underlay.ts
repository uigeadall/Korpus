/**
 * Подложка под плана: снимка или скан на архитектурния план, върху
 * който се обрисува стаята.
 *
 * Тук е само математиката — вписване, калибриране по известен размер,
 * местене и мащаб. Самият файл стои в браузъра на клиента; този файл
 * не знае нищо за него освен съотношението на страните.
 *
 * Координатите са в милиметри, в системата на стаята.
 */

import type { Room } from './room';

export interface UnderlayRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export const UNDERLAY = {
  /** По-малко от това не се вижда, повече не е план на жилище. */
  minWidth: 500,
  maxWidth: 60_000,
  minOpacity: 0.05,
  maxOpacity: 1,
} as const;

function clampWidth(width: number): number {
  return Math.min(UNDERLAY.maxWidth, Math.max(UNDERLAY.minWidth, width));
}

export function clampOpacity(value: number): number {
  return Math.min(UNDERLAY.maxOpacity, Math.max(UNDERLAY.minOpacity, value));
}

/**
 * Първо поставяне: планът се вписва в стаята, центриран, без да се
 * реже. `aspect` е ширина/височина на изображението.
 */
export function fitUnderlay(room: Room, aspect: number): UnderlayRect {
  const byWidth = aspect >= room.width / room.depth;
  const width = clampWidth(byWidth ? room.width : room.depth * aspect);
  const height = width / aspect;
  return {
    x: (room.width - width) / 2,
    y: (room.depth - height) / 2,
    width,
    height,
  };
}

export function moveUnderlay(rect: UnderlayRect, dx: number, dy: number): UnderlayRect {
  return { ...rect, x: rect.x + dx, y: rect.y + dy };
}

/** Мащабиране около точка, която остава на мястото си. */
export function scaleUnderlay(rect: UnderlayRect, factor: number, about: Point): UnderlayRect {
  const width = clampWidth(rect.width * factor);
  // Прилага се действителният коефициент след ограничението.
  const k = width / rect.width;
  return {
    x: about.x - (about.x - rect.x) * k,
    y: about.y - (about.y - rect.y) * k,
    width,
    height: rect.height * k,
  };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Калибриране: посочват се две точки върху подложката и се казва колко
 * мм са в действителност. Подложката се разтяга така, че разстоянието
 * между тях да стане точно толкова; първата точка остава на място.
 */
export function calibrate(
  rect: UnderlayRect,
  a: Point,
  b: Point,
  realMm: number,
): UnderlayRect {
  const measured = distance(a, b);
  if (measured <= 0 || realMm <= 0) return rect;
  return scaleUnderlay(rect, realMm / measured, a);
}

/** Колко милиметра от стаята се падат на един пиксел от файла. */
export function mmPerPixel(rect: UnderlayRect, naturalWidthPx: number): number {
  return naturalWidthPx > 0 ? rect.width / naturalWidthPx : 0;
}
