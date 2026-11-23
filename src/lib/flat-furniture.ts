/**
 * Мебелта на обзаведените стаи, сложена в макета на жилището.
 *
 * Дотук макетът показваше само пода и зидовете: човек обзавеждаше шест
 * стаи и се връщаше в празни кутии. Това е другата половина — какво
 * има вътре.
 *
 * Телата тук са нарочно по-прости от тези в изгледа на стаята. Там се
 * гледа една кухня отблизо и всяко чело, панта и дръжка значат нещо;
 * тук се гледа цял апартамент отгоре, където дръжка е под един пиксел.
 * Един шкаф е едно тяло, плотът е една плоча. Така и окото чете
 * разпределението, вместо да се дави в ръбове, и рисуването остава
 * бързо, когато стаите станат дванайсет.
 *
 * Проектът на стаята се пази такъв, какъвто пътува в линк. Разгъва се
 * тук и ако записът е счупен или стаята е от друго време, връща се
 * празно — макет без мебел е по-добър от макет с чужда мебел.
 */

import {
  MODULES,
  WORKTOP_THICKNESS,
  computeKitchen,
  kitchenRoom,
  moduleGeometry,
  wallSide,
} from './cabinet-rules';
import type { FlatRoom } from './flat';
import { type Furnishing, slabsOf } from './furnishings';
import { footprint } from './furniture/room';
import type { Box } from './scene3d';
import { decodeProject } from './share';

/**
 * Какво НЕ влиза в макета.
 *
 * Празнините са мярка за въздух между шкафовете, не изделие — в изгледа
 * на стаята ги няма и тук също няма какво да правят.
 */
const GAPS = new Set(['lgap', 'ugap', 'bgap', 'hgap']);

/** Плотът се вижда само там, където изобщо има плот. */
const WITH_WORKTOP = new Set(['kitchen', 'bath']);

/**
 * Телата на една обзаведена стая, вече преместени в света на жилището.
 *
 * Стаята в проекта започва от нулата; в жилището стои на своето място,
 * затова всичко се отмества с ъгъла ѝ.
 */
export function roomFurniture(room: FlatRoom): Box[] {
  if (!room.project) return [];

  const kitchen = decodeProject(room.project);
  if (!kitchen) return [];

  const geom = kitchenRoom(kitchen);
  const { placed } = computeKitchen(kitchen);
  const boxes: Box[] = [];

  const put = (box: Omit<Box, 'facing'>) => {
    boxes.push({ ...box, x: box.x + room.x, z: box.z + room.y, facing: null });
  };

  kitchen.walls.forEach((wall, index) => {
    const rows = placed[index];
    if (!rows) return;
    const side = wallSide(wall, index);
    const worktop = WITH_WORKTOP.has(kitchen.roomKind ?? 'kitchen')
      ? WORKTOP_THICKNESS[kitchen.materials.worktop]
      : 0;

    for (const row of ['base', 'upper'] as const) {
      for (const m of rows[row]) {
        if (GAPS.has(m.kind)) continue;
        const g = moduleGeometry(m.kind);
        const rect = footprint(geom, side, m.x, m.width, g.depth);

        put({
          x: rect.x,
          y: g.y,
          z: rect.y,
          width: rect.width,
          height: g.height,
          depth: rect.height,
          role: MODULES[m.kind].facade?.style === 'appliance' ? 'appliance' : 'carcass',
          // Редът решава цвета: горните са по-светли, защото са по-близо
          // до светлината и защото така се четат като два пласта.
          code: row,
          moduleId: `${room.id}:${m.id}`,
          key: `f:${room.id}:${m.id}`,
        });

        /*
         * Плотът лежи върху долния ред като една плоча. Прави се на
         * шкаф, не на участък: при този мащаб фугата между две плочи
         * не се вижда, а сливането би искало втора сметка за нищо.
         */
        if (worktop && row === 'base' && g.height > 0) {
          put({
            x: rect.x,
            y: g.y + g.height,
            z: rect.y,
            width: rect.width,
            height: worktop,
            depth: rect.height,
            role: 'worktop',
            code: 'worktop',
            moduleId: `${room.id}:${m.id}`,
            key: `t:${room.id}:${m.id}`,
          });
        }
      }
    }
  });

  for (const f of kitchen.furnishings ?? []) {
    boxes.push(...furnishingBoxes(room, f));
  }

  return boxes;
}

/** Диванът, леглото и масата — това, което прави стаята обитаема. */
function furnishingBoxes(room: FlatRoom, f: Furnishing): Box[] {
  return slabsOf(f.kind).map((slab) => ({
    x: room.x + f.x + slab.dx - slab.width / 2,
    y: slab.y,
    z: room.y + f.z + slab.dz - slab.depth / 2,
    width: slab.width,
    height: slab.height,
    depth: slab.depth,
    role: slab.role === 'soft' ? ('soft' as const) : ('wood' as const),
    facing: null,
    code: slab.role === 'soft' ? 'soft' : 'wood',
    moduleId: `${room.id}:${f.id}`,
    key: `g:${room.id}:${f.id}:${slab.dx},${slab.dz},${slab.y}`,
    /*
     * Завъртането минава през същата сметка, с която се върти врата:
     * върховете и нормалите тръгват заедно, иначе осветяването лъже.
     */
    swing: f.rotation
      ? { pivotX: room.x + f.x, pivotZ: room.y + f.z, angle: f.rotation }
      : undefined,
  }));
}

/** Мебелта на цялото жилище. */
export function flatFurniture(rooms: readonly FlatRoom[]): Box[] {
  return rooms.flatMap(roomFurniture);
}
