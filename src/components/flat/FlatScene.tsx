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

function litColor(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) =>
    Math.max(0, Math.min(255, Math.round(((n >> shift) & 255) * amount)));
  const to2 = (v: number) => v.toString(16).padStart(2, '0');
  return `#${to2(channel(16))}${to2(channel(8))}${to2(channel(0))}`;
}

function fillOf(face: Face): string {
  if (face.role === 'wall') return litColor(WALL_COLOR, shade(face.normal));
  if (face.code === 'current') return litColor(HERE, shade(face.normal));

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

export function FlatScene({ flat, currentId }: { flat: Flat; currentId: string | null }) {
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

  const boxes = flatScene(flat, currentId);
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
            ? `Макет на жилището. Сега сте в: ${roomName(current)}.`
            : 'Макет на жилището отгоре.'
        }
      >
        {faces.map((face) => (
          <polygon
            key={face.key}
            points={face.corners
              .map((corner) => {
                const p = project(corner, camera);
                return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
              })
              .join(' ')}
            fill={fillOf(face)}
            stroke={face.role === 'wall' ? 'none' : 'rgba(0,0,0,0.07)'}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
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
        <span>Зидовете са снижени, за да се вижда вътре.</span>
      </figcaption>
    </figure>
  );
}
