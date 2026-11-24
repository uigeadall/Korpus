import { describe, expect, it } from 'vitest';
import { type Kitchen, emptyKitchen } from './cabinet-rules';
import { DEFAULT_ROOM_NEEDS, layoutFor } from './autolayout';
import { decodeProject, encodeProject } from './share';
import { type Flat, type FlatRoom, defaultFlat, placeProject } from './flat';
import {
  fitKitchen,
  fitProject,
  furnitureBoxes,
  projectSize,
  refitKitchen,
  roomOfKey,
} from './flat-furniture';

/** Всекидневна с ТВ стена и маса, столове, холна маса и фотьойл в дъното. */
function living(room = { width: 4800, depth: 3800 }, wall = 3600): Kitchen {
  const k = emptyKitchen(wall);
  const l = layoutFor('living', wall, DEFAULT_ROOM_NEEDS);
  return {
    ...k,
    roomKind: 'living',
    room,
    walls: [{ ...k.walls[0], base: l.base, upper: l.upper }],
    furnishings: [
      { id: 't', kind: 'dining-table', x: room.width - 900, z: 1900, rotation: 0 },
      { id: 'c1', kind: 'chair', x: room.width - 1200, z: 2500, rotation: 0 },
      { id: 'c2', kind: 'chair', x: room.width - 600, z: 2500, rotation: 0 },
      { id: 'k', kind: 'coffee-table', x: 1400, z: room.depth - 900, rotation: 0 },
      { id: 'a', kind: 'armchair', x: 1600, z: room.depth - 450, rotation: 0 },
    ],
  };
}

const inside = (boxes: ReturnType<typeof furnitureBoxes>, room: FlatRoom) => {
  for (const b of boxes) {
    expect(b.x).toBeGreaterThanOrEqual(room.x - 1);
    expect(b.x + b.width).toBeLessThanOrEqual(room.x + room.width + 1);
    expect(b.z).toBeGreaterThanOrEqual(room.y - 1);
    expect(b.z + b.depth).toBeLessThanOrEqual(room.y + room.depth + 1);
  }
};

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

  it('проект за по-голяма стая не излиза през зидовете в макета', () => {
    // Снимката от 24.11.2026: всекидневна 4,80 × 3,80 в начертана 3,60 × 2,00.
    const small: FlatRoom = {
      id: 'l1',
      kind: 'living',
      name: 'Всекидневна',
      x: 2000,
      y: 3000,
      width: 3600,
      depth: 2000,
      project: encodeProject(living()),
    };
    const boxes = furnitureBoxes(small);
    expect(boxes.some((b) => b.role === 'wood')).toBe(true);
    inside(boxes, small);
  });

  it('по ключа се знае на коя стая е обемът', () => {
    const [b] = furnitureBoxes(room);
    expect(roomOfKey(`${b.key}:0`)).toBe('k1');
    expect(roomOfKey('floor:k1:0')).toBeNull();
  });
});

describe('готов проект се пренася в жилището', () => {
  it('заменя стаята от същия вид: на мястото ѝ, с името ѝ, с мерките на проекта', () => {
    const flat = defaultFlat();
    const kitchen = flat.rooms.find((r) => r.kind === 'kitchen')!;
    const { flat: next, id } = placeProject(flat, 'kitchen', { width: 4200, depth: 3200 }, 'КОД', 'new');
    expect(id).toBe(kitchen.id);
    expect(next.rooms).toHaveLength(flat.rooms.length);
    expect(next.rooms.find((r) => r.id === kitchen.id)).toMatchObject({
      x: kitchen.x,
      y: kitchen.y,
      name: kitchen.name,
      width: 4200,
      depth: 3200,
      project: 'КОД',
    });
  });

  it('носи мебелта си непокътната — нищо не се придърпва и не отпада', () => {
    // Готовата кухня от 4,20 не влизаше в начертаната от 3,60 и ставаше
    // нова стая встрани, а начертаната оставаше празна.
    const code = encodeProject(living());
    const flat = defaultFlat();
    const { flat: next, id } = placeProject(flat, 'living', { width: 4800, depth: 3800 }, code, 'new', (r) =>
      fitProject(code, r),
    );
    const room = next.rooms.find((r) => r.id === id)!;
    expect(room.id).toBe('f-living');
    expect(room).toMatchObject({ width: 4800, depth: 3800, project: code });
    inside(furnitureBoxes(room), room);
  });

  it('първо чакащата, после обзаведената от вида', () => {
    const flat: Flat = {
      rooms: [
        { id: 'b1', kind: 'bath', name: 'Баня', x: 0, y: 0, width: 2000, depth: 2000, project: 'СТАРА' },
        { id: 'b2', kind: 'bath', name: 'Тоалетна', x: 2000, y: 0, width: 1500, depth: 1500 },
      ],
    };
    expect(placeProject(flat, 'bath', { width: 2400, depth: 2200 }, 'КОД', 'new').id).toBe('b2');
    const full = { rooms: flat.rooms.map((r) => ({ ...r, project: 'СТАРА' })) };
    const { flat: next, id } = placeProject(full, 'bath', { width: 2400, depth: 2200 }, 'КОД', 'new');
    expect(id).toBe('b1');
    expect(next.rooms).toHaveLength(2);
    expect(next.rooms[0]).toMatchObject({ width: 2400, depth: 2200, project: 'КОД' });
  });

  it('жилище без такава стая получава нова с мерките на проекта', () => {
    const flat: Flat = { rooms: defaultFlat().rooms.filter((r) => r.kind !== 'bath') };
    const { flat: next, id } = placeProject(flat, 'bath', { width: 2400, depth: 2200 }, 'КОД', 'new');
    expect(id).toBe('new');
    expect(next.rooms.find((r) => r.id === 'new')).toMatchObject({
      kind: 'bath',
      width: 2400,
      depth: 2200,
      project: 'КОД',
    });
  });
});

describe('проектът следва мерките на стаята в жилището', () => {
  it('по-малка стая: изделията се придърпват навътре, шкафовете остават', () => {
    const k = living();
    const fitted = fitKitchen(k, { width: 3600, depth: 2000 })!;
    expect(fitted).not.toBeNull();
    expect(fitted.room).toMatchObject({ width: 3600, depth: 2000 });
    expect(fitted.walls[0].base).toEqual(k.walls[0].base);
    for (const f of fitted.furnishings!) {
      expect(f.x).toBeLessThanOrEqual(3600);
      expect(f.z).toBeLessThanOrEqual(2000);
    }
  });

  it('стена, по-къса от реда шкафове, не става', () => {
    expect(fitKitchen(living(), { width: 2400, depth: 3800 })).toBeNull();
    expect(fitProject(encodeProject(living()), { width: 2400, depth: 3800 })).toBeNull();
  });

  it('стената по цялата страна расте и се свива със стаята', () => {
    const k = living({ width: 3600, depth: 3000 }, 3600);
    expect(refitKitchen(k, { width: 4200, depth: 3000 }).walls[0].length).toBe(4200);
    // По-къса от страната си остава колкото е.
    const part = living({ width: 4800, depth: 3000 }, 3600);
    expect(refitKitchen(part, { width: 4200, depth: 3000 }).walls[0].length).toBe(3600);
  });

  it('ред, долепен до ъгъла с ниша, остава в ъгъла', () => {
    const k: Kitchen = {
      ...emptyKitchen(3600),
      room: { width: 3600, depth: 3000 },
      walls: [
        { id: 'w1', side: 'top', length: 3600, base: [], upper: [] },
        {
          id: 'w4',
          side: 'left',
          length: 3000,
          base: [
            { id: 'lead', kind: 'lgap', width: 1400, hingeSide: 'right' },
            { id: 'b1', kind: 'door', width: 800, hingeSide: 'right' },
            { id: 'b2', kind: 'door', width: 800, hingeSide: 'right' },
          ],
          upper: [],
        },
      ],
    };
    const deeper = refitKitchen(k, { width: 3600, depth: 3600 });
    expect(deeper.walls[1].length).toBe(3600);
    expect(deeper.walls[1].base[0]).toMatchObject({ kind: 'lgap', width: 2000 });
    const shallower = fitKitchen(k, { width: 3600, depth: 2000 })!;
    expect(shallower.walls[1].base[0]).toMatchObject({ kind: 'lgap', width: 400 });
  });

  it('същите мерки — същият запис', () => {
    const code = encodeProject(living());
    expect(fitProject(code, { width: 4800, depth: 3800 })).toBe(code);
  });

  it('запис, който не се чете, не се съди', () => {
    expect(fitProject('счупен', { width: 1000, depth: 1000 })).toBe('счупен');
    expect(projectSize('счупен')).toBeNull();
  });

  it('пренесеният запис се отваря с новите мерки', () => {
    const code = fitProject(encodeProject(living()), { width: 3600, depth: 2000 })!;
    expect(projectSize(code)).toEqual({ width: 3600, depth: 2000 });
    expect(decodeProject(code)!.furnishings).toHaveLength(5);
  });
});
