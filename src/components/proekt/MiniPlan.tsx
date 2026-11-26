'use client';

/**
 * Стаята отгоре, на един поглед.
 *
 * Три плъзгача с числа не казват нищо на човек, който не чете чертежи.
 * Същите три числа като правоъгълник с лента по стената се разбират
 * веднага — и се вижда колко от стената остава свободна.
 *
 * Тук се и посочва вратата: пипнеш ли до някой зид, тя отива там. Това
 * е най-прекият начин да се каже „влиза се оттук" — по-кратък от който
 * и да е плъзгач.
 */

import { useRef } from 'react';
import type { Room, RoomDoor, RoomWindow } from '@/lib/cabinet-rules';
import {
  doorPlan,
  doorSpan,
  placeDoorAt,
  placeWindowAt,
  windowSpan,
} from '@/lib/openings';
import { capturePointer } from '@/components/pointer';
import { useEzik, useT } from '@/i18n/client';
import { MERKI, metri } from '@/i18n/chisla';
import { INSTRUMENTI } from '@/i18n/tekstove/instrumenti';

const PAD = 26;

/** Вътрешната рамка, в която се вписва стаята. Постоянна, за да не подскача. */
const BOX_W = 320;
const BOX_H = 190;


export function MiniPlan({
  roomWidth,
  roomDepth,
  wallLength,
  door,
  onDoorChange,
  windows = [],
  onWindowChange,
  /** Кой отвор се мести при влачене: вратата или даден прозорец. */
  moving = 'door',
}: {
  roomWidth: number;
  roomDepth: number;
  wallLength: number;
  door: RoomDoor;
  /** Липсва ли, планът само показва вратата, без да се пипа. */
  onDoorChange?: (door: RoomDoor) => void;
  windows?: RoomWindow[];
  onWindowChange?: (win: RoomWindow) => void;
  moving?: 'door' | string;
}) {
  const ezik = useEzik();
  const t = useT(INSTRUMENTI).miniPlan;
  const metres = (mm: number) => `${metri(mm, ezik)} ${MERKI[ezik].m}`;
  const roomRef = useRef<SVGGElement>(null);
  const dragging = useRef(false);

  const room: Room = { width: roomWidth, depth: roomDepth };
  const scale = Math.min(BOX_W / roomWidth, BOX_H / roomDepth);
  const w = roomWidth * scale;
  const d = roomDepth * scale;
  const run = wallLength * scale;
  const depth = Math.min(d * 0.42, 600 * scale);

  const span = doorSpan(room, door);
  const sym = doorPlan(room, door);
  const from =
    span.axis === 'x' ? { x: span.from, y: span.at } : { x: span.at, y: span.from };
  const to = span.axis === 'x' ? { x: span.to, y: span.at } : { x: span.at, y: span.to };

  /** Екранна точка → милиметри в стаята. */
  const toRoom = (clientX: number, clientY: number) => {
    const ctm = roomRef.current?.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const moved = moving === 'door' ? null : windows.find((w) => w.id === moving);

  /**
   * Пипането мести отвора, който е „на ход". Така един и същ план
   * служи и за вратата, и за всеки прозорец, без да се гадае кое е
   * искал човекът.
   */
  const place = (clientX: number, clientY: number) => {
    const p = toRoom(clientX, clientY);
    if (!p) return;
    if (moved) onWindowChange?.(placeWindowAt(room, moved, p));
    else onDoorChange?.(placeDoorAt(room, door, p));
  };

  const editable = moved ? Boolean(onWindowChange) : Boolean(onDoorChange);

  return (
    <svg
      viewBox={`${-PAD} ${-PAD - 14} ${BOX_W + PAD * 2} ${BOX_H + PAD * 2 + 14}`}
      className={`block h-auto w-full ${editable ? 'cursor-pointer [touch-action:none]' : ''}`}
      role="img"
      aria-label={t.etiket(
        metres(roomWidth),
        metres(roomDepth),
        metres(wallLength),
        t.strana[door.side],
        metres(door.width),
        windows.length,
      )}
      onPointerDown={(e) => {
        if (!editable) return;
        capturePointer(e.currentTarget, e.pointerId);
        dragging.current = true;
        place(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (dragging.current) place(e.clientX, e.clientY);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
    >
      <g ref={roomRef} transform={`scale(${scale})`}>
        {/* подът */}
        <rect x={0} y={0} width={roomWidth} height={roomDepth} fill="var(--surface-sunken)" />

        {/* зидовете */}
        <rect
          x={0}
          y={0}
          width={roomWidth}
          height={roomDepth}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />

        {/* мебелта по горната стена */}
        <rect
          x={0}
          y={0}
          width={wallLength}
          height={depth / scale}
          fill="var(--accent)"
          opacity="0.22"
        />
        <rect
          x={0}
          y={0}
          width={wallLength}
          height={depth / scale}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />

        {/* свободното, което остава по същата стена */}
        {run < w - 1 && (
          <line
            x1={wallLength}
            y1={depth / scale / 2}
            x2={roomWidth}
            y2={depth / scale / 2}
            stroke="var(--muted)"
            strokeWidth="1"
            strokeDasharray="5 4"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* вратата: отворът изяжда зида, крилото мете навътре */}
        <line
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          stroke="var(--surface-sunken)"
          strokeWidth="5"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={`M ${sym.closed.x} ${sym.closed.y} A ${sym.radius} ${sym.radius} 0 0 ${sym.sweep} ${sym.open.x} ${sym.open.y}`}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="1"
          strokeDasharray="5 4"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={sym.hinge.x}
          y1={sym.hinge.y}
          x2={sym.open.x}
          y2={sym.open.y}
          stroke={moved ? 'var(--muted)' : 'var(--foreground)'}
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />

        {/* прозорците: двойна черта в прекъснатия зид */}
        {windows.map((win) => {
          const s = windowSpan(room, win);
          const p = s.axis === 'x' ? { x: s.from, y: s.at } : { x: s.at, y: s.from };
          const q = s.axis === 'x' ? { x: s.to, y: s.at } : { x: s.at, y: s.to };
          const off = s.axis === 'x' ? { x: 0, y: 55 } : { x: 55, y: 0 };
          const live = moved?.id === win.id;
          return (
            <g key={win.id}>
              <line
                x1={p.x}
                y1={p.y}
                x2={q.x}
                y2={q.y}
                stroke="var(--surface-sunken)"
                strokeWidth="5"
                vectorEffect="non-scaling-stroke"
              />
              {[-1, 1].map((dir) => (
                <line
                  key={dir}
                  x1={p.x + off.x * dir}
                  y1={p.y + off.y * dir}
                  x2={q.x + off.x * dir}
                  y2={q.y + off.y * dir}
                  stroke={live ? 'var(--accent)' : 'var(--foreground)'}
                  strokeWidth={live ? 2.5 : 1.5}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          );
        })}
      </g>

      <text
        x={run / 2}
        y={-8}
        textAnchor="middle"
        fontSize="13"
        fill="var(--accent)"
        className="font-mono"
      >
        {metres(wallLength)}
      </text>
      <text
        x={w / 2}
        y={d + 18}
        textAnchor="middle"
        fontSize="12"
        fill="var(--muted)"
        className="font-mono"
      >
        {metres(roomWidth)}
      </text>
      {/* Изправено по стената: хоризонтално излизаше вляво от рамката и
          оставаше само „м". */}
      <text
        x={-12}
        y={d / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="12"
        fill="var(--muted)"
        className="font-mono"
        transform={`rotate(-90 -12 ${d / 2})`}
      >
        {metres(roomDepth)}
      </text>
    </svg>
  );
}
