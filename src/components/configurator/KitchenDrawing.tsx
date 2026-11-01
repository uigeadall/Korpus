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
  clampWallLength,
  type PlacedModule,
  type RowId,
  type RowStatus,
  WORKTOP_THICKNESS,
  type Wall,
  type WorktopType,
} from '@/lib/cabinet-rules';
import {
  type ChainSegment,
  type ViewBox,
  DRAW_H,
  FLOOR_T,
  WALL_T,
  chainForModules,
  dropIndex,
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
  /** Преподреждане чрез влачене или стрелки. Без него чертежът е само за гледане. */
  onReorder?: (id: string, toIndex: number) => void;
  /** Опъване на стената от чертежа. */
  onWallLength?: (value: number) => void;
}

/** Какво се влачи в момента. */
type Drag =
  | {
      kind: 'module';
      id: string;
      row: RowId;
      /** Разстояние от показалеца до левия ръб на модула, мм */
      grab: number;
      /** Текущ ляв ръб под показалеца, мм */
      x: number;
      /** Влачено ли е достатъчно, за да не брои за клик */
      moved: boolean;
    }
  | {
      kind: 'wall';
      /** Екранно X в началото на влаченето */
      startClientX: number;
      /** Дължината на стената в началото */
      startLength: number;
      /**
       * Милиметри на пиксел, заснети в началото. Чертежът се побира по
       * ширина, така че докато стената расте, мащабът се мени; ако смятаме
       * от текущия мащаб, стената избягва до максимума от едно движение.
       */
      mmPerPx: number;
    };

/** Колко мм трябва да се помръдне, преди да се смята за влачене, а не клик. */
const DRAG_THRESHOLD = 15;

/** Клиентски X → милиметри в координатите на чертежа. */
function toMm(svg: SVGSVGElement, clientX: number, clientY: number): number {
  const ctm = svg.getScreenCTM();
  if (!ctm) return 0;
  return new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse()).x;
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

export function KitchenDrawing({
  wall,
  placed,
  status,
  worktop,
  selectedId,
  onSelect,
  onReorder,
  onWallLength,
}: Props) {
  const { ref, width: pxWidth } = useWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
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

  const startDrag = (m: PlacedModule, row: RowId, e: React.PointerEvent) => {
    // Натискането избира. Не разчитаме на click: pointer capture върху
    // <svg> пренасочва клика към него и групата не го получава.
    onSelect?.(m.id);
    if (!onReorder || !svgRef.current) return;
    const x = toMm(svgRef.current, e.clientX, e.clientY);
    svgRef.current.setPointerCapture(e.pointerId);
    setDrag({ kind: 'module', id: m.id, row, grab: x - m.x, x: m.x, moved: false });
  };

  const startWallDrag = (e: React.PointerEvent) => {
    if (!onWallLength || !svgRef.current) return;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm?.a) return;
    svgRef.current.setPointerCapture(e.pointerId);
    setDrag({
      kind: 'wall',
      startClientX: e.clientX,
      startLength: wall.length,
      mmPerPx: 1 / ctm.a,
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag || !svgRef.current) return;
    if (drag.kind === 'wall') {
      e.preventDefault();
      const delta = (e.clientX - drag.startClientX) * drag.mmPerPx;
      onWallLength?.(clampWallLength(drag.startLength + delta));
      return;
    }

    const left = toMm(svgRef.current, e.clientX, e.clientY) - drag.grab;
    const row = placed[drag.row];
    const dragged = row.find((m) => m.id === drag.id);
    if (!dragged) return;

    const moved = drag.moved || Math.abs(left - dragged.x) > DRAG_THRESHOLD;
    setDrag({ ...drag, x: left, moved });
    if (!moved) return;

    // Спира маркирането, което в Safari боядисва целия чертеж.
    e.preventDefault();
    window.getSelection()?.removeAllRanges();
    const to = dropIndex(row, drag.id, left);
    if (to !== row.indexOf(dragged)) onReorder?.(drag.id, to);
  };

  /** Стрелки върху дръжката на стената: 10 мм, с Shift — 100 мм. */
  const onWallKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 100 : DIM.WALL_STEP;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onWallLength?.(clampWallLength(wall.length - step));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onWallLength?.(clampWallLength(wall.length + step));
    }
  };

  const endDrag = () => setDrag(null);

  /** Стрелки на клавиатурата — същото преподреждане без мишка. */
  const onModuleKeyDown = (m: PlacedModule, row: RowId, e: React.KeyboardEvent) => {
    const index = placed[row].indexOf(m);
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      onReorder?.(m.id, index - 1);
    } else if (e.key === 'ArrowRight' && index < placed[row].length - 1) {
      e.preventDefault();
      onReorder?.(m.id, index + 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(m.id);
    }
  };

  const moduleDrag = drag?.kind === 'module' ? drag : undefined;
  const dragged = moduleDrag ? placed[moduleDrag.row].find((m) => m.id === moduleDrag.id) : undefined;
  const resizing = drag?.kind === 'wall';

  return (
    <div ref={ref} className="w-full overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={view.value}
        // touch-action важи само за самия <svg>, не за групите вътре в него
        className={`block w-full h-auto select-none [touch-action:pan-y] [-webkit-tap-highlight-color:transparent] ${
          moduleDrag?.moved ? 'cursor-grabbing' : resizing ? 'cursor-ew-resize' : ''
        }`}
        // без нативното влачене на SVG като картинка — Safari оцветява целия чертеж
        onDragStart={(e) => e.preventDefault()}
        role="img"
        aria-label={`Фронтален чертеж на кухня, стена ${formatMm(wall.length)} мм`}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
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

        {/* стени в разрез; дясната се хваща и опъва */}
        <Wall x={-WALL_T} view={view} />
        <Wall
          x={wall.length}
          view={view}
          resizable={Boolean(onWallLength)}
          resizing={resizing}
          length={wall.length}
          fs={fs}
          onGrab={startWallDrag}
          onKeyDown={onWallKeyDown}
        />

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
          placed[row].map((m) =>
            // Модулът се вади от реда чак когато наистина се влачи: ако го
            // заменим още на pointerdown, DOM възелът се сменя между
            // натискане и пускане и кликът за избор не се случва.
            m.id === moduleDrag?.id && moduleDrag.moved ? null : (
              <Module
                key={m.id}
                view={view}
                m={m}
                fs={fs}
                selected={selectedId === m.id}
                over={overflow[row] && m.x + m.width > wall.length}
                draggable={Boolean(onReorder)}
                onSelect={onSelect}
                onGrab={(e) => startDrag(m, row, e)}
                onKeyDown={(e) => onModuleKeyDown(m, row, e)}
              />
            ),
          ),
        )}

        {/* влаченият модул: мястото му и самият той, нарисуван отгоре */}
        {moduleDrag?.moved && dragged && (
          <>
            <rect
              x={dragged.x}
              y={moduleBox(view, dragged).y}
              width={dragged.width}
              height={moduleBox(view, dragged).height}
              fill="color-mix(in srgb, var(--accent) 8%, transparent)"
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeDasharray="30 22"
              vectorEffect="non-scaling-stroke"
            />
            <Module
              view={view}
              m={dragged}
              fs={fs}
              selected
              over={overflow[moduleDrag.row] && dragged.x + dragged.width > wall.length}
              draggable
              dragging
              offsetX={moduleDrag.x - dragged.x}
              onSelect={onSelect}
              onGrab={(e) => startDrag(dragged, moduleDrag.row, e)}
              onKeyDown={(e) => onModuleKeyDown(dragged, moduleDrag.row, e)}
            />
          </>
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

/**
 * Стена в разрез. Дясната носи дръжка — хваща се и се опъва, за да се
 * смени дължината на стената направо от чертежа.
 */
function Wall({
  x,
  view,
  resizable = false,
  resizing = false,
  length,
  fs,
  onGrab,
  onKeyDown,
}: {
  x: number;
  view: ViewBox;
  resizable?: boolean;
  resizing?: boolean;
  length?: number;
  fs?: (px: number) => number;
  onGrab?: (e: React.PointerEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  const top = toSvgY(view, DRAW_H);
  const gripY = toSvgY(view, DRAW_H / 2);
  const color = resizing ? 'var(--accent)' : 'var(--foreground)';

  return (
    <g
      onPointerDown={resizable ? onGrab : undefined}
      onKeyDown={resizable ? onKeyDown : undefined}
      tabIndex={resizable ? 0 : undefined}
      className={resizable ? 'cursor-ew-resize' : undefined}
      role={resizable ? 'slider' : undefined}
      aria-label={resizable ? 'Дължина на стената, стрелките я променят' : undefined}
      aria-valuenow={resizable ? length : undefined}
      aria-valuemin={resizable ? DIM.WALL_MIN : undefined}
      aria-valuemax={resizable ? DIM.WALL_MAX : undefined}
      aria-valuetext={resizable && length ? `${formatMm(length)} мм` : undefined}
    >
      <rect x={x} y={top} width={WALL_T} height={DRAW_H} fill="url(#hatch)" opacity="0.7" />
      <rect
        x={x}
        y={top}
        width={WALL_T}
        height={DRAW_H}
        fill={resizing ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'none'}
        stroke={color}
        strokeWidth={resizing ? 2 : 1}
        vectorEffect="non-scaling-stroke"
      />

      {resizable && (
        <g pointerEvents="none">
          {/* рифел по средата на стената */}
          {[-18, 0, 18].map((d) => (
            <line
              key={d}
              x1={x + WALL_T / 2 + d}
              y1={gripY - 130}
              x2={x + WALL_T / 2 + d}
              y2={gripY + 130}
              stroke="var(--accent)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              opacity={resizing ? 1 : 0.8}
            />
          ))}
          {fs && (
            <text
              x={x + WALL_T / 2}
              y={gripY - 180}
              textAnchor="middle"
              fontSize={fs(10)}
              fill="var(--accent)"
              className="font-mono"
            >
              ↔
            </text>
          )}
        </g>
      )}
    </g>
  );
}

function Module({
  view,
  m,
  fs,
  selected,
  over,
  draggable = false,
  dragging = false,
  offsetX = 0,
  onSelect,
  onGrab,
  onKeyDown,
}: {
  view: ReturnType<typeof viewBoxFor>;
  m: PlacedModule;
  fs: (px: number) => number;
  selected: boolean;
  over: boolean;
  draggable?: boolean;
  dragging?: boolean;
  offsetX?: number;
  onSelect?: (id: string) => void;
  onGrab?: (e: React.PointerEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  const box = moduleBox(view, m);
  const stroke = over ? 'var(--danger)' : dragging ? 'var(--accent)' : 'var(--foreground)';
  const facades = facadeRects(view, m);
  const interactive = Boolean(onSelect);

  return (
    <g
      transform={offsetX ? `translate(${offsetX},0)` : undefined}
      onClick={interactive ? () => onSelect?.(m.id) : undefined}
      onPointerDown={onGrab}
      onKeyDown={onKeyDown}
      tabIndex={interactive ? 0 : undefined}
      className={
        draggable
          ? dragging
            ? 'cursor-grabbing'
            : 'cursor-grab'
          : interactive
            ? 'cursor-pointer'
            : undefined
      }
      role={interactive ? 'button' : undefined}
      aria-label={
        m.code
          ? `${m.code} ${box.label} ${formatMm(m.width)} мм${draggable ? ', стрелките местят' : ''}`
          : box.label
      }
      opacity={dragging ? 0.95 : undefined}
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
