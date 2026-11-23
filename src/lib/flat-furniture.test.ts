import { describe, expect, it } from 'vitest';
import { emptyKitchen } from './cabinet-rules';
import { DEFAULT_ROOM_NEEDS, layoutFor } from './autolayout';
import { encodeProject } from './share';
import { defaultFlat, placeProject, type FlatRoom } from './flat';
import { furnitureBoxes, roomOfKey } from './flat-furniture';

function kitchenCode() {
  const k = emptyKitchen(3600);
  const l = layoutFor('kitchen', 3600, DEFAULT_ROOM_NEEDS);
  return encodeProject({
    ...k,
    room: { width: 3600, depth: 3000 },
    walls: [{ ...k.walls[0], base: l.base, upper: l.upper }],
    floorFinish: 'pod-laminat-natural',
  });
}

describe('мебелта на готовите стаи в макета', () => {
  const room: FlatRoom = {
    id: 'k1',
    kind: 'kitchen',
    name: 'Кухня',
    x: 5000,
    y: 2000,
    width: 3600,
    depth: 3000,
    project: kitchenCode(),
  };

  it('стая без проект няма мебел', () => {
    expect(furnitureBoxes({ ...room, project: undefined })).toEqual([]);
    expect(furnitureBoxes({ ...room, project: 'счупен' })).toEqual([]);
  });

  it('мебелта стои вътре в стаята, на нейното място в жилището', () => {
    const boxes = furnitureBoxes(room);
    expect(boxes.length).toBeGreaterThan(10);
    for (const b of boxes) {
      expect(b.x).toBeGreaterThanOrEqual(room.x - 1);
      expect(b.x + b.width).toBeLessThanOrEqual(room.x + room.width + 1);
      expect(b.z).toBeGreaterThanOrEqual(room.y - 1);
      expect(b.z + b.depth).toBeLessThanOrEqual(room.y + room.depth + 1);
    }
  });

  it('носи само мебел — без зидове, под и сенки, и без да се хваща', () => {
    const roles = new Set(furnitureBoxes(room).map((b) => b.role));
    for (const r of ['floor', 'wall', 'shadow', 'seam', 'doorway']) expect(roles.has(r as never)).toBe(false);
    expect(roles.has('carcass')).toBe(true);
    expect(furnitureBoxes(room).every((b) => b.moduleId === undefined)).toBe(true);
  });

  it('по ключа се знае на коя стая е обемът', () => {
    const [b] = furnitureBoxes(room);
    expect(roomOfKey(`${b.key}:0`)).toBe('k1');
    expect(roomOfKey('floor:k1:0')).toBeNull();
  });
});

describe('готов проект се пренася в жилището', () => {
  it('отива в чакащата кухня, ако има такава', () => {
    const flat = defaultFlat();
    const waiting = flat.rooms.find((r) => r.kind === 'kitchen' && !r.project)!;
    const { flat: next, id } = placeProject(flat, 'kitchen', { width: 4200, depth: 3200 }, 'КОД', 'new');
    expect(id).toBe(waiting.id);
    expect(next.rooms).toHaveLength(flat.rooms.length);
    expect(next.rooms.find((r) => r.id === waiting.id)!.project).toBe('КОД');
  });

  it('иначе жилището получава нова стая с мерките на проекта', () => {
    // Банята вече е обзаведена — втората баня е нова стая.
    const first = placeProject(defaultFlat(), 'bath', { width: 2200, depth: 1800 }, 'ПЪРВА', 'x').flat;
    const { flat: next, id } = placeProject(first, 'bath', { width: 2400, depth: 2200 }, 'КОД', 'new');
    expect(id).toBe('new');
    const added = next.rooms.find((r) => r.id === 'new')!;
    expect(added).toMatchObject({ kind: 'bath', width: 2400, depth: 2200, project: 'КОД' });
  });

  it('чакаща стая, по-тясна от стената с мебелта, не става — влиза нова', () => {
    const flat = defaultFlat();
    const kitchen = flat.rooms.find((r) => r.kind === 'kitchen')!;
    const { id } = placeProject(flat, 'kitchen', { width: 6000, depth: 3200 }, 'КОД', 'new', kitchen.width + 600);
    expect(id).toBe('new');
  });
});
