import { describe, expect, it } from 'vitest';
import { computeKitchen, emptyKitchen, type Kitchen } from './cabinet-rules';
import { DEFAULT_ROOM_NEEDS, layoutFor } from './autolayout';
import { elevation } from './elevation';

function placedFor(room: Kitchen['roomKind'] & string, length = 3600) {
  const k = emptyKitchen(length);
  const l = layoutFor(room, length, DEFAULT_ROOM_NEEDS);
  return computeKitchen({ ...k, roomKind: room, walls: [{ ...k.walls[0], base: l.base, upper: l.upper }] })
    .placed[0];
}

describe('стената отпред', () => {
  it('всичко стои в стената — между пода и тавана, между двата края', () => {
    const rects = elevation(placedFor('kitchen'), { room: 'kitchen', worktop: 'quartz20', opening: 'handles' });
    expect(rects.length).toBeGreaterThan(20);
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(3600 + 0.5);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.y + r.height).toBeLessThanOrEqual(2600);
    }
  });

  it('плот има само кухнята', () => {
    const k = elevation(placedFor('kitchen'), { room: 'kitchen', worktop: 'laminate38', opening: 'handles' });
    const w = elevation(placedFor('bedroom'), { room: 'bedroom', worktop: 'laminate38', opening: 'handles' });
    expect(k.some((r) => r.role === 'worktop')).toBe(true);
    expect(w.some((r) => r.role === 'worktop')).toBe(false);
  });

  it('дръжки има само при „Дръжки" и те са най-отпред', () => {
    const rows = placedFor('kitchen');
    const withHandles = elevation(rows, { room: 'kitchen', worktop: 'laminate38', opening: 'handles' });
    const push = elevation(rows, { room: 'kitchen', worktop: 'laminate38', opening: 'push' });
    expect(push.some((r) => r.role === 'handle')).toBe(false);
    const first = withHandles.findIndex((r) => r.role === 'handle');
    expect(first).toBeGreaterThan(0);
    expect(withHandles.slice(first).every((r) => r.role === 'handle')).toBe(true);
  });

  it('празна стена е празна', () => {
    expect(elevation({ base: [], upper: [] }, { room: 'kitchen', worktop: 'laminate38', opening: 'handles' })).toEqual([]);
  });
});
