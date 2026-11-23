'use client';

/**
 * Малка неподвижна картинка на стая — за готовите стаи.
 *
 * Същата сцена и същите цветове като големия обем, но без въртене,
 * отваряне и бутони: тя се гледа, не се работи в нея. Затова и е лека —
 * осем такива на една страница не тежат.
 */

import { useMemo } from 'react';
import { type Kitchen, computeKitchen, kitchenRoom } from '@/lib/cabinet-rules';
import { finishById } from '@/config/wall-finishes';
import {
  DEFAULT_CAMERA,
  project,
  sceneFor,
  shade,
  tint,
  viewBoxFor,
  visibleFaces,
} from '@/lib/scene3d';
import { finishIdFor, innerWallPlane } from '@/lib/wall-finish';
import { litColor, paletteFor } from '@/components/configurator/Scene3D';
import { WallSurface } from '@/components/configurator/WallSurface';

export function ScenePreview({ kitchen, label }: { kitchen: Kitchen; label: string }) {
  const drawn = useMemo(() => {
    const room = kitchenRoom(kitchen);
    const result = computeKitchen(kitchen);
    const cam = DEFAULT_CAMERA(room);
    const boxes = sceneFor(kitchen, room, result.placed, kitchen.materials.worktop, kitchen.materials.opening);
    return { room, cam, faces: visibleFaces(boxes, cam), viewBox: viewBoxFor(boxes, cam) };
  }, [kitchen]);

  const palette = paletteFor(kitchen);
  const { room, cam, faces, viewBox } = drawn;

  return (
    <svg
      viewBox={viewBox}
      // Без надпис картинката е украса на бутон, който сам казва какво е.
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      className="block h-auto w-full"
    >
      {faces.map((face) => {
        const amount = shade(face.normal);
        const warmth = tint(face.normal);
        const plane = face.role === 'wall' ? innerWallPlane(face.corners, face.normal, room) : null;
        if (plane) {
          const finish = finishById(finishIdFor(kitchen.wallFinish, plane.side));
          return (
            <WallSurface
              key={face.key}
              face={face}
              plane={plane}
              finish={finish}
              cam={cam}
              top={litColor(finish.hex, Math.min(1.2, amount * 1.07), warmth)}
              bottom={litColor(finish.hex, amount * 0.9, warmth)}
              light={(hex) => litColor(hex, amount, warmth)}
            />
          );
        }
        const points = face.corners
          .map((c) => {
            const p = project(c, cam);
            return `${p.x.toFixed(0)},${p.y.toFixed(0)}`;
          })
          .join(' ');
        if (face.role === 'shadow') {
          return <polygon key={face.key} points={points} fill={palette.shadow} opacity={0.12} />;
        }
        const base = face.role === 'handle' ? '#9a968f' : (palette[face.role] ?? palette.carcass);
        return (
          <polygon
            key={face.key}
            points={points}
            fill={litColor(base, amount, warmth)}
            stroke={face.role === 'floor' || face.role === 'wall' ? 'none' : 'rgba(0,0,0,0.12)'}
            strokeWidth={0.6}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}
