'use client';

/**
 * Планът на жилището — тук се чертае и тук се ходи.
 *
 * Всяка стая е правоъгълник: влачи се с показалеца, опъва се от
 * долния десен ъгъл и се лепи за съседите си. Стрелките не местят —
 * те водят от стая в стая, както човек минава през вратите.
 *
 * Всичко вътре е в милиметри; рамката се нагажда към жилището.
 */

import { useRef, useState } from 'react';
import {
  FLAT,
  type Flat,
  areaOf,
  boundsOf,
  isFurnished,
  neighboursOf,
  doorwayBetween,
  isDone,
  roomName,
  right,
  bottom,
  roomsOverlap,
} from '@/lib/flat';
import { capturePointer } from '@/components/pointer';
import { useEzik, useT } from '@/i18n/client';
import { metri } from '@/i18n/chisla';
import { JILISHTE } from '@/i18n/tekstove/jilishte';

/** Място около жилището, за да има къде да се хване и издърпа стая. */
const MARGIN = 1200;


/** Цвят на всеки вид — за да се чете планът без да се четат надписите. */
const FILL: Record<string, string> = {
  kitchen: 'color-mix(in srgb, var(--accent) 11%, var(--surface))',
  living: 'color-mix(in srgb, var(--accent) 7%, var(--surface))',
  bedroom: 'color-mix(in srgb, var(--accent) 4%, var(--surface))',
  corridor: 'var(--surface-sunken)',
  bath: 'var(--surface-sunken)',
  hall: 'var(--surface-sunken)',
  other: 'var(--surface)',
};

interface Props {
  flat: Flat;
  currentId: string | null;
  /** Всичко маркирано. Текущата стая е последната от него. */
  selected: string[];
  /**
   * Как се избира: сама, добавена към маркираните (Shift) или
   * превключена (⌘). Shift добавя и никога не маха — иначе второто
   * щракване по вече маркирана стая я изхвърля от групата.
   */
  onPick: (id: string, how: 'only' | 'extend' | 'toggle') => void;
  /** Влачи групата: водещата отива на тази точка, другите я следват. */
  onMove: (ids: string[], x: number, y: number) => void;
  onSize: (id: string, width: number, depth: number) => void;
}

type Drag =
  | { kind: 'move'; ids: string[]; dx: number; dy: number }
  | { kind: 'size'; id: string };

export function FlatPlan({ flat, currentId, selected, onPick, onMove, onSize }: Props) {
  const ezik = useEzik();
  const t = useT(JILISHTE).plan;
  const metres = (mm: number) => metri(mm, ezik);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | null>(null);

  /*
   * Рамката се замразява, докато се влачи.
   *
   * Иначе расте заедно със стаята: премащабира се, същата точка на
   * екрана започва да значи друго място в плана и влаченето се бие
   * само със себе си — опъваш надясно, а дълбочината намалява.
   */
  const [frozen, setFrozen] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const bounds = boundsOf(flat);
  const fit = {
    x: bounds.x - MARGIN,
    y: bounds.y - MARGIN,
    w: Math.max(bounds.width + 2 * MARGIN, 4000),
    h: Math.max(bounds.depth + 2 * MARGIN, 3000),
  };
  const { x: viewX, y: viewY, w: viewW, h: viewH } = frozen ?? fit;

  /** Екранна точка → милиметри в жилището. */
  const toPlan = (clientX: number, clientY: number) => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const p = toPlan(e.clientX, e.clientY);
    if (!p) return;
    const room = flat.rooms.find((r) => r.id === (d.kind === 'move' ? d.ids[0] : d.id));
    if (!room) return;

    if (d.kind === 'move') {
      onMove(d.ids, p.x - d.dx, p.y - d.dy);
      return;
    }
    onSize(d.id, p.x - room.x, p.y - room.y);
  };

  const endDrag = () => {
    drag.current = null;
    setFrozen(null);
  };

  const clashing = new Set(
    flat.rooms.flatMap((a) =>
      flat.rooms.filter((b) => b.id !== a.id && roomsOverlap(a, b)).map(() => a.id),
    ),
  );

  return (
    <svg
      ref={svgRef}
      viewBox={`${viewX} ${viewY} ${viewW} ${viewH}`}
      className="block h-auto w-full select-none [touch-action:none]"
      role="group"
      aria-label={t.etiket(flat.rooms.length)}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* врати между съседните стаи — прекъсване в общия зид */}
      {flat.rooms.flatMap((room) =>
        neighboursOf(flat, room.id)
          // Всяка двойка веднъж: само от по-малкия идентификатор нататък.
          .filter((n) => room.id < n.room.id)
          .map((n) => {
            const gap = doorwayBetween(room, n.room)!;
            const a =
              gap.axis === 'x' ? { x: gap.at, y: gap.from } : { x: gap.from, y: gap.at };
            const b = gap.axis === 'x' ? { x: gap.at, y: gap.to } : { x: gap.to, y: gap.at };
            return (
              <line
                key={`${room.id}-${n.room.id}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--background)"
                strokeWidth={FLAT.WALL * 1.6}
                vectorEffect="non-scaling-stroke"
                style={{ pointerEvents: 'none' }}
              />
            );
          }),
      )}

      {flat.rooms.map((room) => {
        const current = room.id === currentId;
        const bad = clashing.has(room.id);
        const done = isDone(room);
        const marked = selected.includes(room.id);
        const label = t.staya(
          roomName(room, ezik),
          metres(room.width),
          metres(room.depth),
          areaOf(room).toFixed(1),
          done,
          isFurnished(room.kind),
          current,
        );

        return (
          <g key={room.id}>
            <rect
              x={room.x}
              y={room.y}
              width={room.width}
              height={room.depth}
              fill={FILL[room.kind] ?? FILL.other}
              stroke={bad ? 'var(--danger)' : marked ? 'var(--accent)' : 'var(--foreground)'}
              strokeWidth={current ? 4 : marked ? 3 : 2}
              strokeDasharray={marked && !current ? '120 60' : undefined}
              vectorEffect="non-scaling-stroke"
              className="cursor-grab"
              role="button"
              tabIndex={0}
              aria-label={label}
              aria-current={current ? 'true' : undefined}
              onPointerDown={(e) => {
                const p = toPlan(e.clientX, e.clientY);
                if (!p) return;
                capturePointer(e.currentTarget.ownerSVGElement, e.pointerId);
                setFrozen(fit);
                const how = e.shiftKey ? 'extend' : e.metaKey || e.ctrlKey ? 'toggle' : 'only';
                const add = how !== 'only';
                /*
                 * Хващане на вече маркирана стая не събаря групата —
                 * иначе влаченето на две стаи ги разделя още с
                 * натискането.
                 */
                const inGroup = selected.includes(room.id);
                if (add || !inGroup) onPick(room.id, how);

                const group =
                  inGroup && !add
                    ? [room.id, ...selected.filter((id) => id !== room.id)]
                    : [room.id];
                drag.current = { kind: 'move', ids: group, dx: p.x - room.x, dy: p.y - room.y };
              }}
              /*
               * Стрелките не се обработват тук. Жилището вече ги слуша
               * на прозореца; хванеше ли ги и стаята, една стрелка
               * правеше два скока.
               */
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                onPick(room.id, e.shiftKey ? 'extend' : 'only');
              }}
              /*
               * Фокусът избира само ако стаята още не е маркирана.
               * Иначе щракването с Shift я добавя, а фокусът веднага
               * след него събаря избора обратно до една.
               */
              onFocus={() => {
                if (!selected.includes(room.id)) onPick(room.id, 'only');
              }}
            />

            <text
              x={room.x + room.width / 2}
              y={room.y + room.depth / 2 - 60}
              textAnchor="middle"
              fontSize={260}
              fill="var(--foreground)"
              style={{ pointerEvents: 'none' }}
            >
              {roomName(room, ezik)}
            </text>
            <text
              x={room.x + room.width / 2}
              y={room.y + room.depth / 2 + 240}
              textAnchor="middle"
              fontSize={200}
              fill="var(--muted)"
              className="font-mono"
              style={{ pointerEvents: 'none' }}
            >
              {metres(room.width)} × {metres(room.depth)}
            </text>

            {/* ъгълът, от който стаята се опъва */}
            {current && (
              <rect
                x={right(room) - 260}
                y={bottom(room) - 260}
                width={260}
                height={260}
                fill="var(--accent)"
                opacity="0.8"
                className="cursor-nwse-resize"
                role="button"
                tabIndex={0}
                data-opvane=""
                aria-label={t.opanete(roomName(room, ezik))}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  capturePointer(e.currentTarget.ownerSVGElement, e.pointerId);
                  setFrozen(fit);
                  drag.current = { kind: 'size', id: room.id };
                }}
                onKeyDown={(e) => {
                  const by = e.shiftKey ? 500 : FLAT.STEP;
                  const step: Record<string, [number, number]> = {
                    ArrowLeft: [-by, 0],
                    ArrowRight: [by, 0],
                    ArrowUp: [0, -by],
                    ArrowDown: [0, by],
                  };
                  const d = step[e.key];
                  if (!d) return;
                  e.preventDefault();
                  e.stopPropagation();
                  onSize(room.id, room.width + d[0], room.depth + d[1]);
                }}
              />
            )}

            {/*
              Ъгълът носи състоянието: точка значи „има правила за
              мебел", отметка — „готова е". Така схемата се чете, без
              да се щраква по стаите една по една.
            */}
            {isFurnished(room.kind) &&
              (done ? (
                <g aria-hidden="true" style={{ pointerEvents: 'none' }}>
                  <circle cx={room.x + 240} cy={room.y + 240} r={150} fill="var(--accent)" />
                  <path
                    d={`M ${room.x + 170} ${room.y + 245} l 50 55 l 95 -110`}
                    fill="none"
                    stroke="var(--accent-contrast)"
                    strokeWidth={34}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              ) : (
                <circle
                  cx={room.x + 220}
                  cy={room.y + 220}
                  r={90}
                  fill="var(--accent)"
                  opacity="0.55"
                  aria-hidden="true"
                  style={{ pointerEvents: 'none' }}
                />
              ))}
          </g>
        );
      })}
    </svg>
  );
}
