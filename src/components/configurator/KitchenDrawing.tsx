'use client';

/**
 * Фронтален изглед на кухнята — чертеж, не илюстрация.
 *
 * Всичко е в милиметри в SVG координати. Линиите са hairline чрез
 * non-scaling-stroke, а размерите се мащабират така, че да останат четими
 * и на телефон (виж `fontSizeMm`).
 */

import { useEzik, useT } from '@/i18n/client';
import { kod, prevedi } from '@/i18n/rechnik';
import { INSTRUMENTI } from '@/i18n/tekstove/instrumenti';
import { useEffect, useRef, useState } from 'react';
import { useElementWidth } from './useElementWidth';
import {
  DIM,
  MODULES,
  type ModuleKind,
  clampWallLength,
  type PlacedModule,
  toOtherRow,
  type RowId,
  type RowStatus,
  WORKTOP_THICKNESS,
  moduleGeometry,
  type Wall,
  type WallOpening,
  type WorktopType,
} from '@/lib/cabinet-rules';
import {
  type ChainSegment,
  type ViewBox,
  FLOOR_T,
  WALL_T,
  chainForModules,
  contentTopOf,
  dropIndex,
  insertIndexAt,
  facadeRects,
  rowAtHeight,
  fontSizeMm,
  formatMm,
  heightMarks,
  moduleBox,
  type OpeningBox,
  openingBox,
  toSvgY,
  viewBoxFor,
} from '@/lib/drawing';

interface Props {
  wall: Wall;
/**
   * Отворите на тази стена — вратата и прозорците на стаята, слети със
   * собствените ѝ. Идват готови, защото ги знае стаята, не стената.
   */
  openings?: WallOpening[];
  placed: { base: PlacedModule[]; upper: PlacedModule[] };
  status: { base: RowStatus; upper: RowStatus };
  worktop: WorktopType;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Преподреждане чрез влачене или стрелки. Без него чертежът е само за гледане. */
  /** Разместване с една стъпка: стрелките и лентата на шкафа. */
  onReorder?: (id: string, toIndex: number) => void;
  /**
   * Плъзгане с влачене: шкафът ляга там, където го пуснеш, по решетка,
   * а празното пред него става ниша. Същото, което прави и влаченето в
   * обема — един жест, един отговор в двата изгледа.
   *
   * Подава се желаният ляв ръб; прилепването го вършат правилата
   * (`lib/slide.ts`), за да е едно и също и от двата изгледа.
   */
  onSlide?: (id: string, left: number) => void;
  /** Опъване на стената от чертежа. */
  onWallLength?: (value: number) => void;
  /** Преместване в другия ред. */
  onMoveToRow?: (id: string, toIndex: number) => void;
  /* --- Лентата върху избрания шкаф ---------------------------------
   * Редактира се там, където се гледа. Без тези подавки чертежът си
   * остава както преди — лентата просто не се показва.
   */
  /**
   * Модул, довлечен от палитрата. Докато го има, чертежът следи
   * показалеца и показва къде ще влезе.
   */
  dropKind?: ModuleKind | null;
  onDropModule?: (kind: ModuleKind, row: RowId, index: number) => void;
  onDropCancel?: () => void;
  onNudgeWidth?: (id: string, dir: -1 | 1) => void;
  onHinge?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onRemove?: (id: string) => void;
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
      /** Последното подадено навън място — за да не се повтаря. */
      lastLeft?: number;
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

/** Клиентска точка → милиметри в координатите на чертежа. */
function toPoint(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

export function KitchenDrawing({
  wall,
  openings,
  dropKind = null,
  onDropModule,
  onDropCancel,
  placed,
  status,
  worktop,
  selectedId,
  onSelect,
  onReorder,
  onSlide,
  onWallLength,
  onMoveToRow,
  onNudgeWidth,
  onHinge,
  onDuplicate,
  onRemove,
}: Props) {
  const ti = useT(INSTRUMENTI).chertej;
  const { ref, width: pxWidth } = useElementWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  // При надвишаване чертежът се разширява, за да се види колко излиза.
  const contentRight = Math.max(
    wall.length,
    ...placed.base.map((m) => m.x + m.width),
    ...placed.upper.map((m) => m.x + m.width),
  );
  // Рамката расте и нагоре: антресолът над гардероба стига 2600, а
  // ръстът на кухнята е 2320 — без това го режеше.
  const view = viewBoxFor(
    wall.length,
    contentRight,
    contentTopOf([...placed.base, ...placed.upper]),
  );
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
    const { x } = toPoint(svgRef.current, e.clientX, e.clientY);
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

    const point = toPoint(svgRef.current, e.clientX, e.clientY);
    const left = point.x - drag.grab;
    const row = placed[drag.row];
    const dragged = row.find((m) => m.id === drag.id);
    if (!dragged) return;

    const moved = drag.moved || Math.abs(left - dragged.x) > DRAG_THRESHOLD;
    setDrag({ ...drag, x: left, moved });
    if (!moved) return;

    // Спира маркирането, което в Safari боядисва целия чертеж.
    e.preventDefault();
    window.getSelection()?.removeAllRanges();

    // Пуснато в другия ред? Ако модулът има аналог там, минава в него.
    const targetRow = rowAtHeight(view.floorY - point.y);
    if (targetRow !== drag.row && onMoveToRow && toOtherRow(dragged)) {
      const to = dropIndex(placed[targetRow], drag.id, left);
      onMoveToRow(drag.id, to);
      setDrag({ ...drag, row: targetRow, x: left, moved: true });
      return;
    }

    /*
     * Плъзгане, не размяна. Обажда се само когато желаното място се е
     * сменило с цял милиметър: иначе всяко трепване на показалеца
     * пращаше заявка и нишите се правеха наново по шейсет пъти в
     * секунда.
     */
    const wanted = Math.max(0, Math.round(left));
    if (wanted !== drag.lastLeft) {
      setDrag({ ...drag, x: left, moved: true, lastLeft: wanted });
      onSlide?.(drag.id, wanted);
    }
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

  /*
   * Пускане от палитрата. Влаченето започва извън чертежа, затова
   * показалецът се следи на прозореца — pointer capture върху <svg>
   * хваща само това, което е тръгнало от него.
   */
  const [dropAt, setDropAt] = useState<{ row: RowId; index: number; x: number } | null>(null);

  useEffect(() => {
    // Без вдигнат модул няма какво да се следи. Старото място остава
    // в състоянието, но не се рисува — маркерът иска и двете.
    if (!dropKind) return;

    const where = (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return null;
      const box = svg.getBoundingClientRect();
      const inside =
        clientX >= box.left && clientX <= box.right && clientY >= box.top && clientY <= box.bottom;
      if (!inside) return null;

      const point = toPoint(svg, clientX, clientY);
      // Редът на модула решава къде може да влезе — горен шкаф не
      // отива долу, колкото и ниско да е пуснат.
      const row = MODULES[dropKind].row;
      const index = insertIndexAt(placed[row], point.x);
      const list = placed[row];
      const edge =
        index === 0
          ? (list[0]?.x ?? 0)
          : (list[index - 1]?.x ?? 0) + (list[index - 1]?.width ?? 0);
      return { row, index, x: edge };
    };

    const onMove = (e: PointerEvent) => setDropAt(where(e.clientX, e.clientY));
    const onUp = (e: PointerEvent) => {
      const at = where(e.clientX, e.clientY);
      if (at) onDropModule?.(dropKind, at.row, at.index);
      else onDropCancel?.();
      setDropAt(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dropKind, placed, onDropModule, onDropCancel]);

  /** Стрелки на клавиатурата — същото преподреждане без мишка. */
  const onModuleKeyDown = (m: PlacedModule, row: RowId, e: React.KeyboardEvent) => {
    const index = placed[row].indexOf(m);
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      onReorder?.(m.id, index - 1);
    } else if (e.key === 'ArrowRight' && index < placed[row].length - 1) {
      e.preventDefault();
      onReorder?.(m.id, index + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const wantsUpper = e.key === 'ArrowUp';
      if (wantsUpper === (row === 'upper') || !toOtherRow(m)) return;
      e.preventDefault();
      onMoveToRow?.(m.id, index);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(m.id);
    }
  };

  const moduleDrag = drag?.kind === 'module' ? drag : undefined;
  const dragged = moduleDrag ? placed[moduleDrag.row].find((m) => m.id === moduleDrag.id) : undefined;
  const resizing = drag?.kind === 'wall';

  // Избраният модул и редът му — за лентата, която стои върху него.
  const selectedRow: RowId | null = placed.base.some((m) => m.id === selectedId)
    ? 'base'
    : placed.upper.some((m) => m.id === selectedId)
      ? 'upper'
      : null;
  const selected = selectedRow ? placed[selectedRow].find((m) => m.id === selectedId) : undefined;
  const toolbarFor = drag ? undefined : selected;

  return (
    <div ref={ref} className="relative w-full overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={view.value}
        // touch-action важи само за самия <svg>, не за групите вътре в него
        className={`block w-full h-auto select-none [touch-action:pan-y] [-webkit-tap-highlight-color:transparent] ${
          moduleDrag?.moved ? 'cursor-grabbing' : resizing ? 'cursor-ew-resize' : ''
        }`}
        // без нативното влачене на SVG като картинка — Safari оцветява целия чертеж
        onDragStart={(e) => e.preventDefault()}
        // „group", не „img": вътре има модули и дръжка на стената, които се
        // хващат с Tab. При role="img" четецът скрива съдържанието им.
        role="group"
        aria-label={ti.etiket(formatMm(wall.length))}
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

        {/* врати и прозорци — зад мебелта, за да личи, че тя ги заобикаля */}
        {(openings ?? wall.openings ?? []).map((o) => (
          <Opening key={o.id} box={openingBox(view, o)} fs={fs} />
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
          y={toSvgY(view, Math.max(DIM.UPPER_BOTTOM + DIM.UPPER_H, contentTopOf(placed.upper))) - 110}
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

        {/*
          Къде ще влезе довлеченият модул. Черта на фугата плюс сянка
          на самия шкаф — иначе човек не вижда дали ще е преди или
          след съседа.
        */}
        {dropAt && dropKind && (
          <g style={{ pointerEvents: 'none' }}>
            <rect
              x={dropAt.x}
              y={toSvgY(view, moduleGeometry(dropKind).y + moduleGeometry(dropKind).height)}
              width={MODULES[dropKind].widths.includes(600) ? 600 : MODULES[dropKind].widths[0]}
              height={moduleGeometry(dropKind).height}
              fill="var(--accent)"
              opacity="0.16"
            />
            <line
              x1={dropAt.x}
              y1={toSvgY(view, moduleGeometry(dropKind).y + moduleGeometry(dropKind).height) - 80}
              x2={dropAt.x}
              y2={toSvgY(view, moduleGeometry(dropKind).y) + 80}
              stroke="var(--accent)"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )}

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

      {toolbarFor && selectedRow && (
        <ModuleToolbar
          view={view}
          m={toolbarFor}
          row={selectedRow}
          // На тесен екран лентата не се побира над шкафа и се реже в ръба
          // на чертежа — там застава под него, на цял ред.
          anchored={pxWidth >= 720}
          index={placed[selectedRow].indexOf(toolbarFor)}
          count={placed[selectedRow].length}
          onNudgeWidth={onNudgeWidth}
          onHinge={onHinge}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
          onReorder={onReorder}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Лентата над избрания шкаф: ширина, панти, местене, копие, изтриване.
 *
 * Стои като HTML над SVG-то, защото копчета в `foreignObject` се
 * мащабират заедно с чертежа и стават нечетими при дълга стена. SVG-то
 * е `width:100%; height:auto`, тоест viewBox се изобразява линейно —
 * проценти по двете оси стигат, за да стои лентата залепена за шкафа.
 */
function ModuleToolbar({
  view,
  m,
  row,
  anchored,
  index,
  count,
  onNudgeWidth,
  onHinge,
  onDuplicate,
  onRemove,
  onReorder,
}: {
  view: ViewBox;
  m: PlacedModule;
  row: RowId;
  anchored: boolean;
  index: number;
  count: number;
  onNudgeWidth?: (id: string, dir: -1 | 1) => void;
  onHinge?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onRemove?: (id: string) => void;
  onReorder?: (id: string, toIndex: number) => void;
}) {
  const ezik = useEzik();
  const ti = useT(INSTRUMENTI).chertej;
  const box = moduleBox(view, m);
  const widths = MODULES[m.kind].widths;
  const at = widths.indexOf(m.width);
  const hinged = m.width <= 600 && ['door', 'sink', 'upper', 'column'].includes(m.kind);

  const left = ((m.x + m.width / 2 - view.x) / view.width) * 100;
  // Горният ред опира в тавана на чертежа — там лентата пада под шкафа.
  const above = row === 'base';
  const anchorY = above ? box.y : box.y + box.height;
  const top = ((anchorY - view.y) / view.height) * 100;

  return (
    <div
      // Центрирането е само в inline `transform`. Класът `-translate-x-1/2`
      // тук би се събрал с него: Tailwind 4 пише в свойството `translate`,
      // което е отделно от `transform`, и лентата отскача с цяла ширина.
      className={
        anchored
          ? 'pointer-events-none absolute z-10 flex justify-center'
          : 'mt-2 flex justify-center'
      }
      style={
        anchored
          ? {
              left: `${Math.min(88, Math.max(12, left))}%`,
              top: `${top}%`,
              transform: `translate(-50%, ${above ? '-115%' : '15%'})`,
            }
          : undefined
      }
    >
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-pill bg-surface p-1 shadow-[0_2px_16px_rgba(0,0,0,0.14)] ring-1 ring-border">
        <span className="px-1.5 font-mono text-[11px] text-muted">{m.code && kod(m.code, ezik)}</span>

        <TinyButton
          label={ti.poTesen}
          disabled={at <= 0}
          onClick={() => onNudgeWidth?.(m.id, -1)}
        >
          −
        </TinyButton>
        <span className="min-w-[3.25rem] text-center font-mono text-[11px] tabular-nums">
          {m.width}
        </span>
        <TinyButton
          label={ti.poShirok}
          disabled={at < 0 || at >= widths.length - 1}
          onClick={() => onNudgeWidth?.(m.id, 1)}
        >
          +
        </TinyButton>

        <span className="mx-0.5 h-5 w-px bg-border" />

        <TinyButton
          label={ti.nalyavo}
          disabled={index <= 0}
          onClick={() => onReorder?.(m.id, index - 1)}
        >
          ←
        </TinyButton>
        <TinyButton
          label={ti.nadyasno}
          disabled={index < 0 || index >= count - 1}
          onClick={() => onReorder?.(m.id, index + 1)}
        >
          →
        </TinyButton>

        {hinged && (
          <TinyButton
            label={ti.panti(m.hingeSide === 'left')}
            onClick={() => onHinge?.(m.id)}
          >
            {m.hingeSide === 'left' ? '◀' : '▶'}
          </TinyButton>
        )}

        <span className="mx-0.5 h-5 w-px bg-border" />

        <TinyButton label={ti.kopie} onClick={() => onDuplicate?.(m.id)}>
          ⧉
        </TinyButton>
        <TinyButton label={ti.premahni} danger onClick={() => onRemove?.(m.id)}>
          ×
        </TinyButton>
      </div>
    </div>
  );
}

function TinyButton({
  children,
  label,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`h-7 w-7 rounded-full text-xs leading-none transition-colors disabled:opacity-25 ${
        danger ? 'hover:bg-danger hover:text-accent-contrast' : 'hover:bg-surface-sunken'
      }`}
    >
      {children}
    </button>
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
  const ti = useT(INSTRUMENTI).chertej;
  // Стената стига до върха на рамката, а не до кухненския ръст: иначе
  // свършва под антресола, когато той е по-висок.
  const top = 0;
  const wallH = view.floorY;
  const gripY = view.floorY / 2;
  const color = resizing ? 'var(--accent)' : 'var(--foreground)';

  return (
    <g
      onPointerDown={resizable ? onGrab : undefined}
      onKeyDown={resizable ? onKeyDown : undefined}
      tabIndex={resizable ? 0 : undefined}
      className={resizable ? 'cursor-ew-resize' : undefined}
      role={resizable ? 'slider' : undefined}
      aria-label={resizable ? ti.dalzhina : undefined}
      aria-valuenow={resizable ? length : undefined}
      aria-valuemin={resizable ? DIM.WALL_MIN : undefined}
      aria-valuemax={resizable ? DIM.WALL_MAX : undefined}
      aria-valuetext={resizable && length ? ti.mm(formatMm(length)) : undefined}
    >
      <rect x={x} y={top} width={WALL_T} height={wallH} fill="url(#hatch)" opacity="0.7" />
      <rect
        x={x}
        y={top}
        width={WALL_T}
        height={wallH}
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

/** Врата или прозорец: отвор в зида, с парапет при прозореца. */
function Opening({ box, fs }: { box: OpeningBox; fs: (px: number) => number }) {
  const ezik = useEzik();
  return (
    <g>
      <rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        fill="var(--background)"
        stroke="var(--muted)"
        strokeWidth="1.5"
        strokeDasharray="40 24"
        vectorEffect="non-scaling-stroke"
      />
      {box.sillY !== null && (
        <line
          x1={box.x}
          y1={box.sillY}
          x2={box.x + box.width}
          y2={box.sillY}
          stroke="var(--muted)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {/* надписът е в средата на отвора — горе се бие с размерната верига */}
      <text
        x={box.x + box.width / 2}
        y={box.y + box.height / 2 + fs(4)}
        textAnchor="middle"
        fontSize={fs(10)}
        fill="var(--muted)"
        className="font-mono"
      >
        {box.label.replace(/^\S+/, (w) => prevedi(w, ezik))}
      </text>
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
  const ezik = useEzik();
  const ti = useT(INSTRUMENTI).chertej;
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
          ? ti.modul(kod(m.code, ezik), prevedi(box.label, ezik), formatMm(m.width), Boolean(draggable))
          : prevedi(box.label, ezik)
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
          {kod(box.code, ezik)}
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
