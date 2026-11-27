/**
 * Чертежът за PDF.
 *
 * Същата геометрия като на екрана, но с примитиви, които PDF рендерът
 * поддържа: без patterns и без non-scaling-stroke. Дебелините и шрифтовете
 * се пресмятат от мащаба, за да излязат в точки на листа.
 */

import { G, Line, Polyline, Rect, Svg, Text } from '@react-pdf/renderer';
import {
  DIM,
  type PlacedModule,
  WORKTOP_THICKNESS,
  type Wall,
  type WallOpening,
  type WorktopType,
} from '@/lib/cabinet-rules';
import {
  FLOOR_T,
  WALL_T,
  chainForModules,
  facadeRects,
  formatMm,
  hatchLines,
  heightMarks,
  contentTopOf,
  moduleBox,
  openingBox,
  toSvgY,
  viewBoxFor,
} from '@/lib/drawing';

const INK = '#23211e';
const ACCENT = '#1c5873';
const MUTED = '#6f6a62';
const SUNKEN = '#efede8';

interface Props {
  wall: Wall;
  /** Отворите на тази стена — вратата и прозорците на стаята. */
  openings?: WallOpening[];
  placed: { base: PlacedModule[]; upper: PlacedModule[] };
  worktop: WorktopType;
  /** Най-много колко място има чертежът върху листа, в точки. */
  maxWidthPt: number;
  maxHeightPt: number;
}

export function PdfDrawing({ wall, openings, placed, worktop, maxWidthPt, maxHeightPt }: Props) {
  const contentRight = Math.max(
    wall.length,
    ...placed.base.map((m) => m.x + m.width),
    ...placed.upper.map((m) => m.x + m.width),
  );
  const view = viewBoxFor(
    wall.length,
    contentRight,
    contentTopOf([...placed.base, ...placed.upper]),
  );

  // Чертежът се вписва в даденото място, без да се реже.
  const ratio = view.width / view.height;
  const widthPt = Math.min(maxWidthPt, maxHeightPt * ratio);
  const heightPt = widthPt / ratio;

  /** Точки на милиметър. */
  const k = widthPt / view.width;
  /** Дебелина в милиметри, за да излезе `pt` точки на листа. */
  const w = (pt: number) => pt / k;
  /** Големина на шрифта в милиметри. */
  const fs = (pt: number) => pt / k;

  const worktopT = WORKTOP_THICKNESS[worktop];
  const hatch = (x: number, y: number, width: number, height: number) =>
    hatchLines(x, y, width, height, 55).map((s, i) => (
      <Line
        key={i}
        x1={s.x1}
        y1={s.y1}
        x2={s.x2}
        y2={s.y2}
        stroke={MUTED}
        strokeWidth={w(0.35)}
      />
    ));

  const runs = (skip: (m: PlacedModule) => boolean) => {
    const out: { x: number; width: number }[] = [];
    for (const m of placed.base) {
      if (skip(m)) continue;
      const last = out.at(-1);
      if (last && last.x + last.width === m.x) last.width += m.width;
      else out.push({ x: m.x, width: m.width });
    }
    return out;
  };

  const floorY = view.floorY;

  return (
    <Svg
      viewBox={view.value}
      width={widthPt}
      height={heightPt}
    >
      {/* под */}
      <G>
        {hatch(-WALL_T, floorY, wall.length + 2 * WALL_T, FLOOR_T)}
        <Line
          x1={view.x + 40}
          y1={floorY}
          x2={view.x + view.width - 40}
          y2={floorY}
          stroke={INK}
          strokeWidth={w(0.8)}
        />
      </G>

      {/* стени в разрез — до върха на рамката, за да не свършват под
          антресола, когато той е по-висок от кухненския ръст */}
      {[-WALL_T, wall.length].map((x) => (
        <G key={x}>
          {hatch(x, 0, WALL_T, floorY)}
          <Rect
            x={x}
            y={0}
            width={WALL_T}
            height={floorY}
            fill="none"
            stroke={INK}
            strokeWidth={w(0.5)}
          />
        </G>
      ))}

      {/* врати и прозорци, заедно с вратата на стаята */}
      {(openings ?? wall.openings ?? []).map((o) => {
        const box = openingBox(view, o);
        return (
          <G key={o.id}>
            <Rect
              x={box.x}
              y={box.y}
              width={box.width}
              height={box.height}
              fill="none"
              stroke={MUTED}
              strokeWidth={w(0.6)}
              strokeDasharray={`${w(4)} ${w(2.5)}`}
            />
            {box.sillY !== null && (
              <Line
                x1={box.x}
                y1={box.sillY}
                x2={box.x + box.width}
                y2={box.sillY}
                stroke={MUTED}
                strokeWidth={w(0.8)}
              />
            )}
            <Text
              x={box.x + box.width / 2}
              y={box.y + box.height / 2 + fs(3)}
              style={{ fontSize: fs(7), fill: MUTED, textAnchor: 'middle' }}
            >
              {box.label}
            </Text>
          </G>
        );
      })}

      {/* цокъл */}
      {runs((m) => m.kind === 'lgap').map((r) => (
        <Rect
          key={`p${r.x}`}
          x={r.x}
          y={toSvgY(view, DIM.LEG)}
          width={r.width}
          height={DIM.LEG}
          fill={SUNKEN}
          stroke={MUTED}
          strokeWidth={w(0.4)}
        />
      ))}

      {/* плот */}
      {runs((m) => m.kind === 'lgap' || m.kind === 'column').map((r) => (
        <Rect
          key={`w${r.x}`}
          x={r.x - 4}
          y={toSvgY(view, DIM.LEG + DIM.BASE_H + worktopT)}
          width={r.width + 8}
          height={worktopT}
          fill={SUNKEN}
          stroke={INK}
          strokeWidth={w(0.8)}
        />
      ))}

      {/* модули */}
      {[...placed.base, ...placed.upper].map((m) => {
        const box = moduleBox(view, m);
        const empty = box.empty;
        return (
          <G key={m.id}>
            <Rect
              x={box.x}
              y={box.y}
              width={box.width}
              height={box.height}
              fill={empty ? 'none' : '#ffffff'}
              stroke={INK}
              strokeWidth={w(empty ? 0.4 : 0.8)}
              strokeDasharray={empty ? `${w(6)} ${w(4)}` : undefined}
            />
            {facadeRects(view, m).map((f, i) => (
              <G key={i}>
                <Rect
                  x={f.x}
                  y={f.y}
                  width={f.width}
                  height={f.height}
                  fill="none"
                  stroke={INK}
                  strokeWidth={w(0.3)}
                />
                {f.swing && (
                  <Polyline
                    points={f.swing.points}
                    fill="none"
                    stroke={ACCENT}
                    strokeWidth={w(0.3)}
                    strokeDasharray={`${w(5)} ${w(4)}`}
                  />
                )}
              </G>
            ))}
            {box.code && (
              <Text
                x={box.x + box.width / 2}
                y={box.y + box.height / 2 + fs(3)}
                textAnchor="middle"
                style={{ fontSize: fs(7), fontFamily: 'KorpusMono' }}
                fill={MUTED}
              >
                {box.code}
              </Text>
            )}
          </G>
        );
      })}

      {/* вериги */}
      {/*
        Веригата стои над най-високия шкаф в реда, не над височината на
        кухненския горен ред: антресолът стига 2600 и фиксираното число
        падаше вътре в него.
      */}
      <Chain
        segments={chainForModules(placed.upper, wall.length)}
        y={toSvgY(view, Math.max(DIM.UPPER_BOTTOM + DIM.UPPER_H, contentTopOf(placed.upper))) - 110}
        above
        w={w}
        fs={fs}
      />
      <Chain
        segments={chainForModules(placed.base, wall.length)}
        y={floorY + FLOOR_T + 130}
        w={w}
        fs={fs}
      />
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
        y={floorY + FLOOR_T + 330}
        strong
        w={w}
        fs={fs}
      />

      {/* височини */}
      <G>
        <Line
          x1={-180}
          y1={toSvgY(view, 0)}
          x2={-180}
          y2={toSvgY(view, DIM.UPPER_BOTTOM + DIM.UPPER_H)}
          stroke={ACCENT}
          strokeWidth={w(0.4)}
        />
        {heightMarks(worktopT).map((mk) => (
          <G key={mk.h}>
            <Line
              x1={-200}
              y1={toSvgY(view, mk.h)}
              x2={mk.minor ? -160 : -40}
              y2={toSvgY(view, mk.h)}
              stroke={ACCENT}
              strokeWidth={w(0.4)}
              strokeDasharray={mk.minor ? undefined : `${w(5)} ${w(4)}`}
            />
            <Text
              x={-210}
              y={toSvgY(view, mk.h) - fs(2)}
              textAnchor="end"
              style={{ fontSize: fs(mk.minor ? 6 : 7), fontFamily: 'KorpusMono' }}
              fill={ACCENT}
            >
              {mk.label}
            </Text>
          </G>
        ))}
      </G>
    </Svg>
  );
}

function Chain({
  segments,
  y,
  above = false,
  strong = false,
  w,
  fs,
}: {
  segments: { x: number; width: number; label: string; center: number; gap: boolean }[];
  y: number;
  above?: boolean;
  strong?: boolean;
  w: (pt: number) => number;
  fs: (pt: number) => number;
}) {
  if (!segments.length) return null;
  const end = segments.at(-1)!;
  const total = end.x + end.width;
  const tick = 34;

  return (
    <G>
      <Line x1={0} y1={y} x2={total} y2={y} stroke={ACCENT} strokeWidth={w(strong ? 0.6 : 0.4)} />
      {[0, ...segments.map((s) => s.x + s.width)].map((x) => (
        <Line
          key={x}
          x1={x - tick / 2}
          y1={y + tick / 2}
          x2={x + tick / 2}
          y2={y - tick / 2}
          stroke={ACCENT}
          strokeWidth={w(0.4)}
        />
      ))}
      {segments.map((s) => (
        <Text
          key={`${s.x}-${s.width}`}
          x={s.center}
          y={above ? y - fs(4) : y + fs(9)}
          textAnchor="middle"
          style={{ fontSize: fs(strong ? 8 : 6.5), fontFamily: 'KorpusMono' }}
          fill={ACCENT}
        >
          {s.label}
        </Text>
      ))}
    </G>
  );
}
