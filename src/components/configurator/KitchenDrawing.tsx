'use client';

/**
 * Фронтален изглед на кухнята — чертеж, не илюстрация.
 *
 * Всичко е в милиметри в SVG координати. Линиите са hairline чрез
 * non-scaling-stroke, а размерите се мащабират така, че да останат четими
 * и на телефон (виж `fontSizeMm`).
 */

import { useEffect, useRef, useState } from 'react';
import {
  DIM,
  type PlacedModule,
  type RowStatus,
  WORKTOP_THICKNESS,
  type Wall,
  type WorktopType,
} from '@/lib/cabinet-rules';
import {
  type ChainSegment,
  DRAW_H,
  FLOOR_T,
  WALL_T,
  chainForModules,
  facadeRects,
  fontSizeMm,
  formatMm,
  heightMarks,
  moduleBox,
  toSvgY,
  viewBoxFor,
} from '@/lib/drawing';

interface Props {
  wall: Wall;
  placed: { base: PlacedModule[]; upper: PlacedModule[] };
  status: { base: RowStatus; upper: RowStatus };
  worktop: WorktopType;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

/** Ширината на контейнера в пиксели — за мащаба на шрифта. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}

export function KitchenDrawing({ wall, placed, status, worktop, selectedId, onSelect }: Props) {
  const { ref, width: pxWidth } = useWidth<HTMLDivElement>();
  // При надвишаване чертежът се разширява, за да се види колко излиза.
  const contentRight = Math.max(
    wall.length,
    ...placed.base.map((m) => m.x + m.width),
    ...placed.upper.map((m) => m.x + m.width),
  );
  const view = viewBoxFor(wall.length, contentRight);
  const fs = (px: number) => fontSizeMm(view, pxWidth, px);

  const worktopT = WORKTOP_THICKNESS[worktop];
  const baseChain = chainForModules(placed.base, wall.length);
  const upperChain = chainForModules(placed.upper, wall.length);
  const marks = heightMarks(worktopT);

  const overflow = {
    base: status.base.state === 'over',
    upper: status.upper.state === 'over',
  };

  /** Непрекъснатите участъци долен ред, върху които стъпва плотът. */
  const worktopRuns: { x: number; width: number }[] = [];
  for (const m of placed.base) {
    if (m.kind === 'column' || m.kind === 'lgap') continue;
    const last = worktopRuns.at(-1);
    if (last && last.x + last.width === m.x) last.width += m.width;
    else worktopRuns.push({ x: m.x, width: m.width });
  }

  /** Цокълът минава по долния ред без нишите. */
  const plinthRuns: { x: number; width: number }[] = [];
  for (const m of placed.base) {
    if (m.kind === 'lgap') continue;
    const last = plinthRuns.at(-1);
    if (last && last.x + last.width === m.x) last.width += m.width;
    else plinthRuns.push({ x: m.x, width: m.width });
  }

  return (
    <div ref={ref} className="w-full overflow-hidden">
      <svg
        viewBox={view.value}
        className="block w-full h-auto"
        role="img"
        aria-label={`Фронтален чертеж на кухня, стена ${formatMm(wall.length)} мм`}
      >
        <defs>
          <pattern id="mmgrid" width="100" height="100" patternUnits="userSpaceOnUse">
            <path
              d="M 100 0 L 0 0 0 100"
              fill="none"
              stroke="var(--grid-line)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </pattern>
          <pattern
            id="hatch"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
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

        {/* милиметрова хартия */}
        <rect
          x={view.x}
          y={view.y}
          width={view.width}
          height={view.height}
          fill="url(#mmgrid)"
        />

        {/* под в разрез */}
        <g>
          <rect
            x={-WALL_T}
            y={view.floorY}
            width={wall.length + 2 * WALL_T}
            height={FLOOR_T}
            fill="url(#hatch)"
            opacity="0.7"
          />
          <line
            x1={view.x + 40}
            y1={view.floorY}
            x2={view.x + view.width - 40}
            y2={view.floorY}
            stroke="var(--foreground)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </g>

        {/* стени в разрез */}
        {[-WALL_T, wall.length].map((x) => (
          <g key={x}>
            <rect
              x={x}
              y={toSvgY(view, DRAW_H)}
              width={WALL_T}
              height={DRAW_H}
              fill="url(#hatch)"
              opacity="0.7"
            />
            <rect
              x={x}
              y={toSvgY(view, DRAW_H)}
              width={WALL_T}
              height={DRAW_H}
              fill="none"
              stroke="var(--foreground)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}

        {/* цокъл */}
        {plinthRuns.map((r) => (
          <rect
            key={`plinth-${r.x}`}
            x={r.x}
            y={toSvgY(view, DIM.LEG)}
            width={r.width}
            height={DIM.LEG}
            fill="var(--surface-sunken)"
            stroke="var(--muted)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* плот */}
        {worktopRuns.map((r) => (
          <rect
            key={`wt-${r.x}`}
            x={r.x - 4}
            y={toSvgY(view, DIM.LEG + DIM.BASE_H + worktopT)}
            width={r.width + 8}
            height={worktopT}
            fill="var(--surface-sunken)"
            stroke="var(--foreground)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* модули */}
        {(['base', 'upper'] as const).map((row) =>
          placed[row].map((m) => (
            <Module
              key={m.id}
              view={view}
              m={m}
              fs={fs}
              selected={selectedId === m.id}
              over={overflow[row] && m.x + m.width > wall.length}
              onSelect={onSelect}
            />
          )),
        )}

        {/* вериги */}
        <Chain
          segments={upperChain}
          y={toSvgY(view, DIM.UPPER_BOTTOM + DIM.UPPER_H) - 110}
          fs={fs}
          labelAbove
          danger={overflow.upper}
        />
        <Chain segments={baseChain} y={view.floorY + FLOOR_T + 130} fs={fs} danger={overflow.base} />
        <Chain
          segments={[
            {
              x: 0,
              width: wall.length,
              label: formatMm(wall.length),
              center: wall.length / 2,
              gap: false,
            },
          ]}
          y={view.floorY + FLOOR_T + 330}
          fs={fs}
          strong
        />

        {/* височини вляво */}
        <g>
          <line
            x1={-180}
            y1={toSvgY(view, 0)}
            x2={-180}
            y2={toSvgY(view, DIM.UPPER_BOTTOM + DIM.UPPER_H)}
            stroke="var(--accent)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          {marks.map((mk) => (
            <g key={mk.h}>
              <line
                x1={-200}
                y1={toSvgY(view, mk.h)}
                x2={mk.minor ? -160 : -40}
                y2={toSvgY(view, mk.h)}
                stroke="var(--accent)"
                strokeWidth="1"
                strokeDasharray={mk.minor ? undefined : '24 18'}
                vectorEffect="non-scaling-stroke"
                opacity={mk.minor ? 0.9 : 0.45}
              />
              <text
                x={-210}
                y={toSvgY(view, mk.h) - fs(3)}
                textAnchor="end"
                fontSize={fs(mk.minor ? 9 : 11)}
                fill="var(--accent)"
                className="font-mono"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {mk.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Module({
  view,
  m,
  fs,
  selected,
  over,
  onSelect,
}: {
  view: ReturnType<typeof viewBoxFor>;
  m: PlacedModule;
  fs: (px: number) => number;
  selected: boolean;
  over: boolean;
  onSelect?: (id: string) => void;
}) {
  const box = moduleBox(view, m);
  const stroke = over ? 'var(--danger)' : 'var(--foreground)';
  const facades = facadeRects(view, m);
  const interactive = Boolean(onSelect);

  return (
    <g
      onClick={interactive ? () => onSelect?.(m.id) : undefined}
      className={interactive ? 'cursor-pointer' : undefined}
      role={interactive ? 'button' : undefined}
      aria-label={m.code ? `${m.code} ${box.label} ${formatMm(m.width)}` : box.label}
    >
      <rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        fill={
          selected
            ? 'color-mix(in srgb, var(--accent) 14%, transparent)'
            : box.empty
              ? 'transparent'
              : 'var(--surface)'
        }
        stroke={stroke}
        strokeWidth={selected ? 2.5 : box.empty ? 1 : 1.5}
        strokeDasharray={box.empty ? '30 22' : undefined}
        vectorEffect="non-scaling-stroke"
      />

      {facades.map((f, i) => (
        <g key={i}>
          <rect
            x={f.x}
            y={f.y}
            width={f.width}
            height={f.height}
            fill="none"
            stroke={stroke}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            opacity="0.75"
          />
          {f.swing && (
            <polyline
              points={f.swing.points}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1"
              strokeDasharray="26 20"
              vectorEffect="non-scaling-stroke"
              opacity="0.8"
            />
          )}
        </g>
      ))}

      {box.code && (
        <text
          x={box.x + box.width / 2}
          y={box.y + box.height / 2 + fs(4)}
          textAnchor="middle"
          fontSize={fs(11)}
          fill={over ? 'var(--danger)' : 'var(--muted)'}
          className="font-mono"
          style={{ pointerEvents: 'none' }}
        >
          {box.code}
        </text>
      )}
    </g>
  );
}

function Chain({
  segments,
  y,
  fs,
  labelAbove = false,
  strong = false,
  danger = false,
}: {
  segments: ChainSegment[];
  y: number;
  fs: (px: number) => number;
  labelAbove?: boolean;
  strong?: boolean;
  danger?: boolean;
}) {
  if (!segments.length) return null;
  const color = danger ? 'var(--danger)' : 'var(--accent)';
  const end = segments.at(-1)!;
  const total = end.x + end.width;
  const tick = 34;

  return (
    <g>
      <line
        x1={0}
        y1={y}
        x2={total}
        y2={y}
        stroke={color}
        strokeWidth={strong ? 1.5 : 1}
        vectorEffect="non-scaling-stroke"
      />
      {[0, ...segments.map((s) => s.x + s.width)].map((x) => (
        <line
          key={x}
          x1={x - tick / 2}
          y1={y + tick / 2}
          x2={x + tick / 2}
          y2={y - tick / 2}
          stroke={color}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {segments.map((s) => (
        <text
          key={`${s.x}-${s.width}`}
          x={s.center}
          y={labelAbove ? y - fs(6) : y + fs(14)}
          textAnchor="middle"
          fontSize={fs(strong ? 12 : 10)}
          fill={color}
          opacity={s.gap ? 0.5 : 1}
          className="font-mono"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {s.label}
        </text>
      ))}
    </g>
  );
}
