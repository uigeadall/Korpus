'use client';

/**
 * Лице с покритие — стена с тухли, плочки, тапет, или под с ламинат,
 * паркет, килим.
 *
 * Шарката е смятана по самата стена (`lib/wall-pattern`) и тук само се
 * пренася в перспектива. Перспективата пази правите прави, затова всяка
 * фуга е точно отсечка между две проектирани точки — без апроксимация.
 * По ръба на лицето шарката се отрязва; парчетата зид около вратата и
 * прозореца я продължават, защото тя е закотвена за ъгъла на стаята.
 */

import { useId } from 'react';
import { type Camera, type Face, project } from '@/lib/scene3d';
import type { Surface } from '@/lib/wall-finish';
import { type PatternSpec, type Pt, type WallMarks, wallMarks } from '@/lib/wall-pattern';

/*
 * Шарката зависи само от покритието и от парчето стена — не и от
 * камерата. Пази се готова, за да не се смята наново при всеки кадър от
 * въртенето; пресмята се отново само проекцията.
 */
const cache = new Map<string, WallMarks>();
const CACHE_LIMIT = 300;

function marksFor(finish: { id: string; pattern: PatternSpec }, surface: Surface): WallMarks {
  const { area } = surface;
  const key = `${finish.id}|${surface.key}|${Math.round(area.u0)}|${Math.round(area.u1)}|${Math.round(
    area.v0,
  )}|${Math.round(area.v1)}`;
  let marks = cache.get(key);
  if (!marks) {
    if (cache.size >= CACHE_LIMIT) cache.clear();
    marks = wallMarks(finish.pattern, area, surface.seed);
    cache.set(key, marks);
  }
  return marks;
}

export function WallSurface({
  face,
  surface,
  finish,
  cam,
  top,
  bottom,
  light,
}: {
  face: Face;
  surface: Surface;
  finish: { id: string; pattern: PatternSpec };
  cam: Camera;
  /** Основният цвят, осветен горе и долу — както при останалите лица. */
  top: string;
  bottom: string;
  /** Осветява цвят на шарката със светлината на това лице. */
  light: (hex: string) => string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const at = ([u, v]: Pt) => {
    const p = project(surface.at(u, v), cam);
    return `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  };

  const points = face.corners
    .map((c) => {
      const p = project(c, cam);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');

  const marks = marksFor(finish, surface);

  return (
    <g
      data-role={face.role}
      {...(face.role === 'wall' ? { 'data-wall': surface.key } : { 'data-floor': finish.id })}
    >
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
        <clipPath id={`${uid}-c`}>
          <polygon points={points} />
        </clipPath>
      </defs>
      <polygon points={points} data-role={face.role} fill={`url(#${uid}-g)`} stroke="none" />
      {(marks.fills.length > 0 || marks.lines.length > 0) && (
        <g clipPath={`url(#${uid}-c)`} pointerEvents="none">
          {marks.fills.map((layer, i) => (
            <path
              key={`f${i}`}
              d={layer.polys.map((poly) => `M${poly.map(at).join('L')}Z`).join('')}
              fill={light(layer.color)}
              fillOpacity={layer.opacity}
            />
          ))}
          {marks.lines.map((layer, i) => (
            <path
              key={`l${i}`}
              d={layer.segs.map(([a, b]) => `M${at(a)}L${at(b)}`).join('')}
              fill="none"
              stroke={light(layer.color)}
              strokeOpacity={layer.opacity}
              strokeWidth={layer.width}
              vectorEffect="non-scaling-stroke"
              strokeLinecap="square"
            />
          ))}
        </g>
      )}
    </g>
  );
}
