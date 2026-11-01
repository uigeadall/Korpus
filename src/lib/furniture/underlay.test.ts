import { describe, expect, it } from 'vitest';
import {
  UNDERLAY,
  calibrate,
  clampOpacity,
  distance,
  fitUnderlay,
  mmPerPixel,
  moveUnderlay,
  scaleUnderlay,
} from './underlay';

const room = { width: 4000, depth: 3000 };

describe('вписване', () => {
  it('широк план се вписва по ширината на стаята и се центрира', () => {
    // 2:1 е по-широко от стаята (4:3)
    expect(fitUnderlay(room, 2)).toEqual({ x: 0, y: 500, width: 4000, height: 2000 });
  });

  it('висок план се вписва по дълбочината', () => {
    expect(fitUnderlay(room, 1)).toEqual({ x: 500, y: 0, width: 3000, height: 3000 });
  });

  it('не слиза под минималната ширина', () => {
    const tiny = fitUnderlay({ width: 1200, depth: 1200 }, 0.1);
    expect(tiny.width).toBe(UNDERLAY.minWidth);
  });
});

describe('местене и мащаб', () => {
  const rect = { x: 100, y: 200, width: 1000, height: 500 };

  it('местенето не пипа размера', () => {
    expect(moveUnderlay(rect, 50, -20)).toEqual({ x: 150, y: 180, width: 1000, height: 500 });
  });

  it('мащабът около точка я оставя на мястото ѝ', () => {
    const about = { x: 100, y: 200 };
    const scaled = scaleUnderlay(rect, 2, about);
    expect(scaled).toEqual({ x: 100, y: 200, width: 2000, height: 1000 });
  });

  it('мащабът около средата разтяга и в двете посоки', () => {
    const about = { x: 600, y: 450 };
    const scaled = scaleUnderlay(rect, 2, about);
    expect(scaled.x).toBe(-400);
    expect(scaled.y).toBe(-50);
    expect(scaled.width).toBe(2000);
  });

  it('не излиза извън границите на ширината', () => {
    expect(scaleUnderlay(rect, 1000, { x: 0, y: 0 }).width).toBe(UNDERLAY.maxWidth);
    expect(scaleUnderlay(rect, 0.0001, { x: 0, y: 0 }).width).toBe(UNDERLAY.minWidth);
  });

  it('пази съотношението на страните при ограничаване', () => {
    const scaled = scaleUnderlay(rect, 1000, { x: 0, y: 0 });
    expect(scaled.width / scaled.height).toBeCloseTo(rect.width / rect.height, 6);
  });
});

describe('калибриране по известен размер', () => {
  const rect = { x: 0, y: 0, width: 1000, height: 500 };

  it('разтяга така, че двете точки да са на казаното разстояние', () => {
    // Две точки на 200 мм една от друга трябва да са 400.
    const after = calibrate(rect, { x: 100, y: 0 }, { x: 300, y: 0 }, 400);
    expect(after.width).toBe(2000);
    // Първата точка остава на мястото си.
    expect(after.x).toBe(-100);
  });

  it('работи и по диагонал', () => {
    const after = calibrate(rect, { x: 0, y: 0 }, { x: 300, y: 400 }, 1000);
    expect(distance({ x: after.x, y: after.y }, { x: 0, y: 0 })).toBe(0);
    expect(after.width).toBe(2000);
  });

  it('не прави нищо при безсмислени стойности', () => {
    expect(calibrate(rect, { x: 10, y: 10 }, { x: 10, y: 10 }, 500)).toBe(rect);
    expect(calibrate(rect, { x: 0, y: 0 }, { x: 100, y: 0 }, 0)).toBe(rect);
  });
});

describe('дребни помощни', () => {
  it('прозрачността стои в границите', () => {
    expect(clampOpacity(5)).toBe(1);
    expect(clampOpacity(0)).toBe(UNDERLAY.minOpacity);
    expect(clampOpacity(0.4)).toBe(0.4);
  });

  it('милиметри на пиксел следват ширината', () => {
    expect(mmPerPixel({ x: 0, y: 0, width: 4000, height: 2000 }, 800)).toBe(5);
    expect(mmPerPixel({ x: 0, y: 0, width: 4000, height: 2000 }, 0)).toBe(0);
  });
});
