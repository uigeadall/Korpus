import { describe, expect, it } from 'vitest';
import {
  type ViewBox,
  closestWidth,
  deltaForScale,
  parseViewBox,
  settle,
  zoomAmount,
  zoomStep,
  zoomedViewBox,
} from './zoom';

const full: ViewBox = [-1000, -500, 2000, 1000];
const min = closestWidth(full);
const at = (x: number, y: number) => ({ x, y });

/** Къде е точката като дял от кадъра. */
function where(vb: string, p: { x: number; y: number }) {
  const [x, y, w, h] = parseViewBox(vb);
  return { fx: (p.x - x) / w, fy: (p.y - y) / h };
}

describe('приближаване към точката под мишката', () => {
  it('точката под мишката остава на мястото си на екрана', () => {
    const p = at(300, 100);
    const before = where(zoomedViewBox(null, full), p);
    let z = null;
    for (let i = 0; i < 5; i++) {
      z = zoomStep(z, { deltaY: -120, at: p, full, minWidth: min });
      const after = where(zoomedViewBox(z, full), p);
      expect(after.fx).toBeCloseTo(before.fx, 6);
      expect(after.fy).toBeCloseTo(before.fy, 6);
    }
  });

  it('не скача между точки: еднакви завъртания дават същото, откъдето и да тръгнеш', () => {
    // Мишката стои над едно място — кадърът само се свива около него,
    // без да тръгне другаде.
    const p = at(-400, 200);
    let z = null;
    const centres: number[] = [];
    for (let i = 0; i < 6; i++) {
      z = zoomStep(z, { deltaY: -120, at: p, full, minWidth: min });
      centres.push(z.cx);
    }
    // Средата се приближава до точката монотонно — без люшкане.
    for (let i = 1; i < centres.length; i++) {
      expect(Math.abs(centres[i] - p.x)).toBeLessThanOrEqual(Math.abs(centres[i - 1] - p.x) + 1e-9);
    }
  });

  it('кадърът не излиза извън стаята, дори мишката да е в ъгъла', () => {
    let z = null;
    for (let i = 0; i < 8; i++) z = zoomStep(z, { deltaY: -150, at: at(-990, -490), full, minWidth: min });
    const [x, y] = parseViewBox(zoomedViewBox(z, full));
    expect(x).toBeGreaterThanOrEqual(full[0] - 1e-6);
    expect(y).toBeGreaterThanOrEqual(full[1] - 1e-6);
  });

  it('най-близкото пружинира и се връща', () => {
    let z = null;
    for (let i = 0; i < 60; i++) z = zoomStep(z, { deltaY: -200, at: at(0, 0), full, minWidth: min });
    expect(z!.width).toBeLessThan(min);
    expect(z!.width).toBeGreaterThanOrEqual(min * 0.8);
    expect(settle(z, full, min)!.width).toBeCloseTo(min, 6);
  });

  it('отвъд цялата стая също пружинира и приближението свършва', () => {
    let z = zoomStep(null, { deltaY: -120, at: at(0, 0), full, minWidth: min });
    for (let i = 0; i < 10; i++) z = zoomStep(z, { deltaY: 300, at: at(0, 0), full, minWidth: min });
    expect(z.width).toBeGreaterThan(full[2]);
    expect(z.width).toBeLessThanOrEqual(full[2] * 1.15);
    expect(settle(z, full, min)).toBeNull();
    expect(zoomedViewBox(null, full)).toBe(full.join(' '));
  });

  it('колко е приближено и щипането с пръсти', () => {
    expect(zoomAmount(null, full[2])).toBe(0);
    const z = zoomStep(null, { deltaY: deltaForScale(2), at: at(0, 0), full, minWidth: 1 });
    expect(z.width).toBeCloseTo(full[2] / 2, 6);
    expect(zoomAmount(z, full[2])).toBeCloseTo(0.5, 6);
    expect(deltaForScale(1)).toBeCloseTo(0, 10);
  });
});
