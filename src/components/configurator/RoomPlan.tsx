'use client';

/**
 * Планът на стаята — поглед отгоре.
 *
 * Стаята е правоъгълник с вътрешни размери; по страните ѝ вървят
 * стените с мебелта. Долните модули са плътни, горните — с прекъсната
 * линия, защото са над тях. Стената се избира с мишка, пръст или Tab
 * и Enter; избраната е тази, която се чертае отпред отдолу.
 *
 * Всичко е в милиметри в SVG координати, както и фронталният чертеж.
 */

import { useRef, useState } from 'react';
import type { ModuleKind, PlanWall, Room, RowId, Wall } from '@/lib/cabinet-rules';
import { WALL_SIDE_LABEL, cornerClashes, sideLength } from '@/lib/cabinet-rules';
import type { Point, UnderlayRect } from '@/lib/furniture/underlay';
import { formatMm } from '@/lib/drawing';
import { useElementWidth } from './useElementWidth';

/** Дебелина на зида в разрез и отстояние на размерните линии. */
const WALL_T = 120;
const MARGIN = 700;

export type PlanMode = 'select' | 'calibrate' | 'move';

export interface PlanUnderlay {
  src: string;
  rect: UnderlayRect;
  opacity: number;
}

interface Props {
  room: Room;
  walls: Wall[];
  plan: PlanWall<ModuleKind, RowId>[];
  activeWallId?: string;
  onSelect: (wallId: string) => void;
  /** Подложка с план на жилището, ако клиентът е качил такъв. */
  underlay?: PlanUnderlay | null;
  mode?: PlanMode;
  /** Точките, посочени при калибриране. */
  points?: Point[];
  onPickPoint?: (p: Point) => void;
  onMoveUnderlay?: (dx: number, dy: number) => void;
}

/** Екранна точка → милиметри в координатите на плана. */
function toPoint(svg: SVGSVGElement, clientX: number, clientY: number): Point {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

export function RoomPlan({
  room,
  walls,
  plan,
  activeWallId,
  onSelect,
  underlay = null,
  mode = 'select',
  points = [],
  onPickPoint,
  onMoveUnderlay,
}: Props) {
  const { ref, width: pxWidth } = useElementWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const dragFrom = useRef<Point | null>(null);
  const [dragging, setDragging] = useState(false);
  const clashes = cornerClashes(plan);
  const viewW = room.width + 2 * MARGIN;
  const viewH = room.depth + 2 * MARGIN;
  const fs = (px: number) => (pxWidth ? (px * viewW) / pxWidth : px * 3);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const p = toPoint(svgRef.current, e.clientX, e.clientY);
    if (mode === 'calibrate') {
      onPickPoint?.(p);
      return;
    }
    if (mode === 'move' && underlay) {
      svgRef.current.setPointerCapture(e.pointerId);
      dragFrom.current = p;
      setDragging(true);
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragFrom.current || !svgRef.current) return;
    const p = toPoint(svgRef.current, e.clientX, e.clientY);
    onMoveUnderlay?.(p.x - dragFrom.current.x, p.y - dragFrom.current.y);
    dragFrom.current = p;
  };

  const endDrag = () => {
    dragFrom.current = null;
    setDragging(false);
  };

  return (
    <div ref={ref} className="w-full overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`${-MARGIN} ${-MARGIN} ${viewW} ${viewH}`}
        className={`block h-auto w-full select-none ${
          mode === 'calibrate' ? 'cursor-crosshair' : mode === 'move' ? 'cursor-grab' : ''
        } ${dragging ? '[touch-action:none]' : ''}`}
        role="group"
        aria-label={`План на стаята ${formatMm(room.width)} на ${formatMm(room.depth)} мм`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <defs>
          <pattern id="planHatch" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="40"
              stroke="var(--muted)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </pattern>
        </defs>

        {/* зидовете в разрез по контура на стаята */}
        <rect
          x={-WALL_T}
          y={-WALL_T}
          width={room.width + 2 * WALL_T}
          height={room.depth + 2 * WALL_T}
          fill="url(#planHatch)"
          opacity="0.6"
        />
        <rect
          x={0}
          y={0}
          width={room.width}
          height={room.depth}
          fill="var(--background)"
          stroke="var(--foreground)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />

        {/* планът на жилището — върху пода, под мебелта. Файлът стои
            само в браузъра и не се качва никъде. */}
        {underlay && (
          <image
            href={underlay.src}
            x={underlay.rect.x}
            y={underlay.rect.y}
            width={underlay.rect.width}
            height={underlay.rect.height}
            opacity={underlay.opacity}
            preserveAspectRatio="none"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* размерите на стаята */}
        <text
          x={room.width / 2}
          y={-WALL_T - fs(6)}
          textAnchor="middle"
          fontSize={fs(11)}
          fill="var(--accent)"
          className="font-mono"
        >
          {formatMm(room.width)}
        </text>
        <text
          x={-WALL_T - fs(6)}
          y={room.depth / 2}
          textAnchor="middle"
          fontSize={fs(11)}
          fill="var(--accent)"
          className="font-mono"
          transform={`rotate(-90 ${-WALL_T - fs(6)} ${room.depth / 2})`}
        >
          {formatMm(room.depth)}
        </text>

        {walls.map((wall, i) => {
          const pw = plan[i];
          if (!pw) return null;
          const active = wall.id === activeWallId;
          const count = wall.base.length + wall.upper.length;
          // Надписът в чертежа трябва да е част от името за екранния
          // четец — иначе гласовото управление не намира стената.
          const visible = `${WALL_SIDE_LABEL[pw.side]} · ${formatMm(wall.length)}`;
          const label = `${visible} мм — стена с ${count} модула`;

          return (
            <g
              key={wall.id ?? i}
              role="button"
              tabIndex={0}
              aria-label={label}
              aria-pressed={active}
              className="cursor-pointer"
              // При калибриране и местене кликът е за подложката, не за стената.
              style={mode === 'select' ? undefined : { pointerEvents: 'none' }}
              onClick={() => wall.id && onSelect(wall.id)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                if (wall.id) onSelect(wall.id);
              }}
            >
              {/* прозрачна лента за хващане по цялата стена */}
              <line
                x1={pw.run.x1}
                y1={pw.run.y1}
                x2={pw.run.x2}
                y2={pw.run.y2}
                stroke="transparent"
                strokeWidth={WALL_T * 2}
                strokeLinecap="square"
              />
              <line
                x1={pw.run.x1}
                y1={pw.run.y1}
                x2={pw.run.x2}
                y2={pw.run.y2}
                stroke={pw.tooLong ? 'var(--danger)' : active ? 'var(--accent)' : 'var(--muted)'}
                strokeWidth={active ? 4 : 2.5}
                vectorEffect="non-scaling-stroke"
              />

              {pw.modules.base.map(({ module, rect }) => (
                <rect
                  key={module.id}
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  fill={active ? 'color-mix(in srgb, var(--accent) 10%, var(--surface))' : 'var(--surface)'}
                  stroke={active ? 'var(--accent)' : 'var(--foreground)'}
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {/* отворите прекъсват линията на стената */}
              {pw.openings.map(({ opening, segment }) => (
                <g key={opening.id}>
                  <line
                    x1={segment.x1}
                    y1={segment.y1}
                    x2={segment.x2}
                    y2={segment.y2}
                    stroke="var(--background)"
                    strokeWidth={active ? 5 : 3.5}
                    vectorEffect="non-scaling-stroke"
                  />
                  <line
                    x1={segment.x1}
                    y1={segment.y1}
                    x2={segment.x2}
                    y2={segment.y2}
                    stroke="var(--muted)"
                    strokeWidth="1"
                    strokeDasharray={opening.kind === 'window' ? undefined : '24 18'}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              ))}

              {pw.modules.upper.map(({ module, rect }) => (
                <rect
                  key={module.id}
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  fill="none"
                  stroke={active ? 'var(--accent)' : 'var(--muted)'}
                  strokeWidth="1"
                  strokeDasharray="30 22"
                  vectorEffect="non-scaling-stroke"
                  opacity="0.9"
                />
              ))}

              <WallLabel plan={pw} room={room} fs={fs} active={active} text={visible} />
            </g>
          );
        })}
        {/* точките за калибриране и отсечката между тях */}
        {points.length === 2 && (
          <line
            x1={points[0].x}
            y1={points[0].y}
            x2={points[1].x}
            y2={points[1].y}
            stroke="var(--accent)"
            strokeWidth="2"
            strokeDasharray="30 20"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {points.map((p, i) => (
          <g key={`${p.x}-${p.y}-${i}`} style={{ pointerEvents: 'none' }}>
            <circle cx={p.x} cy={p.y} r={60} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            <line x1={p.x - 100} y1={p.y} x2={p.x + 100} y2={p.y} stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <line x1={p.x} y1={p.y - 100} x2={p.x} y2={p.y + 100} stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </g>
        ))}
      </svg>

      {plan.some((p) => p.tooLong) && (
        <p role="alert" className="mt-2 text-xs text-danger">
          Участък е по-дълъг от страната на стаята. Увеличете стаята или скъсете стената.
        </p>
      )}

      {clashes.length > 0 && (
        <p role="alert" className="mt-2 text-xs text-danger">
          В ъгъла се застъпват {clashes.length === 1 ? 'два модула' : `${clashes.length} двойки модули`}:{' '}
          {clashes
            .slice(0, 3)
            .map((c) => `${c.a.code ?? '—'} и ${c.b.code ?? '—'}`)
            .join(', ')}
          . Ъгловите шкафове идват по-късно; дотогава оставете разстояние между стените.
        </p>
      )}
    </div>
  );
}

/** Надписът стои навътре в стаята, успоредно на своята стена. */
function WallLabel({
  plan,
  room,
  fs,
  active,
  text,
}: {
  plan: PlanWall<ModuleKind, RowId>;
  room: Room;
  fs: (px: number) => number;
  active: boolean;
  text: string;
}) {
  const inset = 220;
  const mid = (plan.length || sideLength(room, plan.side)) / 2;
  const pos = {
    top: { x: mid, y: inset, rotate: 0 },
    bottom: { x: room.width - mid, y: room.depth - inset, rotate: 0 },
    left: { x: inset, y: room.depth - mid, rotate: -90 },
    right: { x: room.width - inset, y: mid, rotate: -90 },
  }[plan.side];

  return (
    <text
      x={pos.x}
      y={pos.y}
      textAnchor="middle"
      fontSize={fs(10)}
      fill={active ? 'var(--accent)' : 'var(--muted)'}
      className="font-mono"
      transform={pos.rotate ? `rotate(${pos.rotate} ${pos.x} ${pos.y})` : undefined}
    >
      {text}
    </text>
  );
}
