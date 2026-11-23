'use client';

/**
 * Жилището в обем — макет с ниски зидове.
 *
 * Рисува се със същите средства като стаята: проекция от няколко реда
 * тригонометрия и SVG. Разликата е в целта — тук се гледа цялото
 * жилище наведнъж, затова зидовете са до кръста и окото стои високо.
 *
 * Ходенето със стрелките мести погледа плавно от стая в стая. Скокът
 * не се чете: човек не разбира коя стая е станала коя.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Flat } from '@/lib/flat';
import { FLAT_ROOM_LABEL, roomName } from '@/lib/flat';
import { flatDistance, flatScene, flatTarget } from '@/lib/flat-scene';
import { furnitureBoxes, roomOfKey, roomProject } from '@/lib/flat-furniture';
import { floorById } from '@/config/floor-finishes';
import { paletteFor } from '@/components/configurator/Scene3D';
import {
  type Camera,
  type Face,
  contentAspect,
  project,
  shade,
  viewBoxFor,
  visibleFaces,
} from '@/lib/scene3d';

/** Цвят на пода по вид помещение. */ // ПРОВЕРИ при дизайнер
const FLOOR: Record<string, string> = {
  kitchen: '#c9c0ae',
  living: '#cdc4b2',
  bedroom: '#c5bcab',
  corridor: '#b9b1a3',
  bath: '#b4b5b2',
  hall: '#bdb5a8',
  other: '#c2bbad',
};

const WALL_COLOR = '#ded9d0';
/** Петното, с което се отбелязва стаята, в която стоиш. */
const HERE = '#9ab7c6';

/**
 * Мебелта в макета.
 *
 * Чувствително по-топла и по-тъмна от зидовете. Първият опит беше
 * близо до тях и шкафовете се сливаха със стената — виждаше се, че
 * нещо стърчи, но не и че е мебел. Макетът е за разпределението:
 * мебелта трябва да личи от пръв поглед.
 *
 * Долният ред е по-тъмен от горния — така двата пласта се четат като
 * два. Плотът е тъмна черта отгоре; при този мащаб тя върши работата
 * на цяла кухня.
 */ // ПРОВЕРИ при дизайнер
const STUFF: Record<string, string> = {
  base: '#b7a993',
  upper: '#c8bda9',
  worktop: '#6f6a62',
  appliance: '#a3a9ad',
  wood: '#a8835f',
  soft: '#8b9298',
};

function litColor(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) =>
    Math.max(0, Math.min(255, Math.round(((n >> shift) & 255) * amount)));
  const to2 = (v: number) => v.toString(16).padStart(2, '0');
  return `#${to2(channel(16))}${to2(channel(8))}${to2(channel(0))}`;
}

/** Цветовете на готовите стаи — от проектите им. */
interface Done {
  palettes: Map<string, Record<string, string>>;
  floors: Map<string, string>;
}

function fillOf(face: Face, rooms: Done): string {
  // Мебелта на готова стая — с цветовете, избрани в проекта ѝ.
  const owner = roomOfKey(face.key);
  const palette = owner ? rooms.palettes.get(owner) : undefined;
  if (palette) {
    const base = face.role === 'handle' ? '#8e8a84' : (palette[face.role] ?? palette.carcass);
    return litColor(base, shade(face.normal));
  }
  if (face.role === 'wall') return litColor(WALL_COLOR, shade(face.normal));
  if (face.code === 'current') return litColor(HERE, shade(face.normal));
  // Подът на готова стая е такъв, какъвто е избран в проекта.
  const floor = face.role === 'floor' && face.moduleId ? rooms.floors.get(face.moduleId) : undefined;
  if (floor) return litColor(floor, shade(face.normal));

  const stuff = face.code ? STUFF[face.code] : undefined;
  if (stuff) return litColor(stuff, shade(face.normal));

  /*
   * Готовата стая е с по-топъл под. Разликата е малка нарочно: тя
   * казва „тази е свършена", без да се бие с петното „тук сте".
   */
  const code = face.code ?? 'other';
  const done = code.startsWith('done:');
  const kind = done ? code.slice(5) : code;
  const base = FLOOR[kind] ?? FLOOR.other;
  return litColor(base, shade(face.normal) * (done ? 1.1 : 1));
}

export function FlatScene({
  flat,
  currentId,
  onPick,
}: {
  flat: Flat;
  currentId: string | null;
  /** Щракване по стая в макета. Без него макетът е само за гледане. */
  onPick?: (id: string) => void;
}) {
  const { x: goalX, z: goalZ } = flatTarget(flat, currentId);
  const whole = flatTarget(flat, null);
  const [eye, setEye] = useState({ x: goalX, z: goalZ });
  const eyeRef = useRef({ x: goalX, z: goalZ });

  /*
   * Погледът догонва стаята, вместо да скача в нея. Кадрите идват от
   * браузъра — върховете на многоъгълник не се анимират със стилове.
   */
  useEffect(() => {
    let frame = 0;
    const step = () => {
      const from = eyeRef.current;
      const dx = goalX - from.x;
      const dz = goalZ - from.z;
      if (Math.abs(dx) < 1 && Math.abs(dz) < 1) {
        eyeRef.current = { x: goalX, z: goalZ };
        setEye({ x: goalX, z: goalZ });
        return;
      }
      const next = { x: from.x + dx * 0.18, z: from.z + dz * 0.18 };
      eyeRef.current = next;
      setEye(next);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [goalX, goalZ]);

  const camera: Camera = {
    yaw: -0.42,
    // Високо око: отгоре се чете целият план, а ниските зидове не пречат.
    pitch: 0.92,
    distance: flatDistance(flat),
    target: { x: eye.x, y: 0, z: eye.z },
  };

  /*
   * Готовите стаи носят мебелта си: проектът се отваря и правилата я
   * нареждат както в самата стая. Смята се при промяна на чертежа, не
   * при всяка стрелка.
   */
  const done = useMemo(() => {
    const palettes = new Map<string, Record<string, string>>();
    const floors = new Map<string, string>();
    const furniture = flat.rooms.flatMap((room) => {
      const kitchen = roomProject(room);
      if (!kitchen) return [];
      palettes.set(room.id, paletteFor(kitchen));
      const floor = floorById(kitchen.floorFinish);
      if (floor) floors.set(room.id, floor.hex);
      return furnitureBoxes(room, kitchen);
    });
    return { palettes, floors, furniture };
  }, [flat]);

  const boxes = [...flatScene(flat, currentId), ...done.furniture];
  const faces = visibleFaces(boxes, camera);
  const current = flat.rooms.find((r) => r.id === currentId);

  /*
   * Формата на кадъра се смята веднъж, от неподвижно око в средата на
   * жилището. Следваше ли подвижното, кутията щеше да мени височината
   * си при всяка стрелка и страницата да подскача.
   */
  const aspect = useMemo(
    () =>
      contentAspect(flatScene(flat), {
        ...camera,
        target: { x: whole.x, y: 0, z: whole.z },
      }),
    // Формата зависи само от чертежа, не от това къде стоиш.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flat],
  );

  if (!flat.rooms.length) {
    return (
      <p className="px-4 py-10 text-center text-sm text-muted">
        Още няма нито едно помещение. Добавете първото отдясно.
      </p>
    );
  }

  return (
    <figure className="m-0">
      <svg
        viewBox={viewBoxFor(boxes, camera, 220, aspect)}
        preserveAspectRatio="xMidYMid meet"
        className="block h-auto w-full"
        style={{ aspectRatio: String(aspect) }}
        role="img"
        aria-label={
          current
            ? `Макет на жилището. Сега сте в: ${roomName(current)}.` +
              (onPick ? ' Щракнете по помещение, за да отидете в него.' : '')
            : 'Макет на жилището отгоре.'
        }
      >
        {faces.map((face) => {
          /*
           * Хваща се подът, не мебелта: тя стърчи над зидовете и крие
           * съседни стаи, а човек сочи стаята, не шкафа в нея.
           */
          const room = face.role === 'floor' ? (face.moduleId ?? null) : null;
          return (
            <polygon
              key={face.key}
              points={face.corners
                .map((corner) => {
                  const p = project(corner, camera);
                  return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                })
                .join(' ')}
              fill={fillOf(face, done)}
              stroke={face.role === 'wall' ? 'none' : 'rgba(0,0,0,0.07)'}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              onClick={room && onPick ? () => onPick(room) : undefined}
              className={room && onPick ? 'cursor-pointer' : undefined}
            />
          );
        })}
      </svg>

      <figcaption className="mt-2 flex flex-wrap items-baseline justify-between gap-2 px-1 text-xs text-muted">
        <span>
          {current
            ? `Тук сте: ${roomName(current)}${
                roomName(current) === FLAT_ROOM_LABEL[current.kind]
                  ? ''
                  : ` (${FLAT_ROOM_LABEL[current.kind].toLowerCase()})`
              }`
            : 'Изберете стая от плана'}
        </span>
        <span>
          Зидовете са снижени, за да се вижда вътре. Готовите стаи са с мебелта си.
          {onPick ? ' Щракнете по помещение, за да отидете в него.' : ''}
        </span>
      </figcaption>
    </figure>
  );
}
