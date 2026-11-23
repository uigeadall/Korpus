'use client';

/**
 * Стената като лента — две пътечки, долна и горна.
 *
 * Чертежът показва как изглежда мебелта; лентата показва от какво е
 * съставена и се работи по нея. Всеки модул е клип: влачиш го, за да
 * смениш мястото му, хващаш ръба му, за да смениш ширината, теглиш
 * рамка, за да маркираш няколко. Същият език като в редактор за видео,
 * защото задачата е същата — наредени един до друг парчета с дължина.
 *
 * Ширините не са произволни: всеки вид се прави в определени размери,
 * затова опъването подскача от един към следващия. Това е вярно, а не
 * недоглеждане.
 */

import { useRef, useState } from 'react';
import {
  MODULES,
  type PlacedModule,
  type RowId,
  type RoomKind,
  WALL_SIDE_LABEL,
  type WallSide,
} from '@/lib/cabinet-rules';
import { formatMm } from '@/lib/drawing';
import { clipsInRange, canTrim, idsBetween, rowEnd, trimWidth } from '@/lib/timeline';
import { capturePointer } from '@/components/pointer';

/** Височина на една пътечка в пиксели. */
const TRACK_H = 58;
/** Колко широка е дръжката за опъване, в пиксели. */
const GRIP = 12;
/** Под колко пиксела влаченето брои за щракване. */
const THRESHOLD = 4;

const ROW_TITLE: Record<RoomKind, Record<RowId, string>> = {
  kitchen: { base: 'Долен ред', upper: 'Горен ред' },
  bedroom: { base: 'Гардероб', upper: 'Антресол' },
  living: { base: 'Долен ред', upper: 'Стенен ред' },
  bath: { base: 'Долен ред', upper: 'Над мивката' },
  corridor: { base: 'Шкафове', upper: 'Антресол' },
  hall: { base: 'Шкафове', upper: 'Антресол' },
};

interface Props {
  roomKind: RoomKind;
  side: WallSide;
  wallLength: number;
  placed: { base: PlacedModule[]; upper: PlacedModule[] };
  selected: string[];
  onSelect: (ids: string[]) => void;
  onReorder: (id: string, toIndex: number) => void;
  onWidth: (ids: string[], value: number) => void;
}

type Drag =
  | { kind: 'move'; id: string; row: RowId; grabMm: number; moved: boolean }
  | { kind: 'trim'; id: string; row: RowId; edge: 'left' | 'right'; startMm: number; startWidth: number }
  | { kind: 'marquee'; row: RowId; fromMm: number; toMm: number };

export function Timeline({
  roomKind,
  side,
  wallLength,
  placed,
  selected,
  onSelect,
  onReorder,
  onWidth,
}: Props) {
  const drag = useRef<Drag | null>(null);
  const [live, setLive] = useState<Drag | null>(null);

  /**
   * Пиксел на пътечката → милиметри по стената.
   *
   * Пътечката се намира от самото събитие, а не от ref: така цялата
   * обработка стои на едно място, вместо всеки клип да носи свои
   * затваряния, създадени при рендер.
   */
  const toMm = (row: RowId, clientX: number): number | null => {
    const el = document.querySelector<HTMLElement>(`[data-track="${row}"]`);
    if (!el) return null;
    const box = el.getBoundingClientRect();
    if (box.width <= 0) return null;
    return ((clientX - box.left) / box.width) * wallLength;
  };

  /*
   * Един обработчик, а не фабрика по ред. Фабриката се вика по време
   * на рендер и затваря в себе си четене на ref — React го брои за
   * четене при рендер и с право се оплаква. Редът и без това е
   * записан във влаченето.
   */
  const onDown = (e: React.PointerEvent) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-track], [data-clip]');
    if (!target) return;

    const track = target.closest<HTMLElement>('[data-track]');
    const row = (track?.dataset.track ?? 'base') as RowId;
    const mm = toMm(row, e.clientX);
    if (mm === null) return;

    capturePointer(e.currentTarget, e.pointerId);

    const id = target.dataset.clip;
    const edge = target.dataset.edge as 'left' | 'right' | undefined;
    const m = id ? placed[row].find((x) => x.id === id) : null;

    if (m && edge) {
      onSelect([m.id]);
      const d: Drag = { kind: 'trim', id: m.id, row, edge, startMm: mm, startWidth: m.width };
      drag.current = d;
      setLive(d);
      return;
    }

    if (m) {
      pick(m.id, row, e);
      const d: Drag = { kind: 'move', id: m.id, row, grabMm: mm - m.x, moved: false };
      drag.current = d;
      setLive(d);
      return;
    }

    // Празно място по пътечката: рамка за маркиране.
    const d: Drag = { kind: 'marquee', row, fromMm: mm, toMm: mm };
    drag.current = d;
    setLive(d);
    if (!e.shiftKey) onSelect([]);
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const mm = toMm(d.row, e.clientX);
    if (mm === null) return;

    if (d.kind === 'marquee') {
      const next = { ...d, toMm: mm };
      drag.current = next;
      setLive(next);
      onSelect(clipsInRange(placed[d.row], next.fromMm, next.toMm));
      return;
    }

    if (d.kind === 'trim') {
      const m = placed[d.row].find((x) => x.id === d.id);
      if (!m) return;
      const delta = (mm - d.startMm) * (d.edge === 'left' ? -1 : 1);
      const width = trimWidth(m.kind, d.startWidth, delta);
      if (width !== m.width) onWidth([d.id], width);
      return;
    }

    // Влачене на самия клип: търси се на кое място би застанал.
    const list = placed[d.row];
    const me = list.find((x) => x.id === d.id);
    if (!me) return;
    const left = mm - d.grabMm;
    if (!d.moved && Math.abs(left - me.x) < (wallLength / 1000) * THRESHOLD) return;
    drag.current = { ...d, moved: true };

    let slot = 0;
    let best = 0;
    let bestGap = Infinity;
    const others = list.filter((x) => x.id !== d.id);
    for (let i = 0; i <= others.length; i++) {
      const gap = Math.abs(slot - left);
      if (gap < bestGap) {
        bestGap = gap;
        best = i;
      }
      if (i < others.length) slot += others[i].width;
    }
    if (best !== list.indexOf(me)) onReorder(d.id, best);
  };

  const end = () => {
    drag.current = null;
    setLive(null);
  };

  const pick = (id: string, row: RowId, e: React.PointerEvent | React.KeyboardEvent) => {
    const list = placed[row].map((m) => m.id);
    if (e.shiftKey && selected.length) {
      // Обхват от последния избран дотук — както се маркират клипове.
      const anchor = [...selected].reverse().find((s) => list.includes(s));
      if (anchor) {
        onSelect(idsBetween(placed[row], anchor, id));
        return;
      }
    }
    if (e.metaKey || e.ctrlKey) {
      onSelect(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
      return;
    }
    onSelect([id]);
  };

  const rows: RowId[] = ['base', 'upper'];

  return (
    <section
      className="card select-none p-3"
      aria-label={`Лента на ${WALL_SIDE_LABEL[side].toLowerCase()} стена`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
        <h2 className="font-display text-sm">Лента</h2>
        <p className="text-[11px] text-muted">
          {selected.length > 1
            ? `${selected.length} избрани`
            : 'влачи клип · хвани ръба, за да опънеш · тегли рамка за няколко'}
        </p>
      </div>

      {rows.map((row) => {
        const list = placed[row];
        const over = rowEnd(list) > wallLength + 1;
        const marquee = live?.kind === 'marquee' && live.row === row ? live : null;

        return (
          <div key={row} className="mb-2 last:mb-0">
            <p className="px-1 pb-1 text-[11px] uppercase tracking-wide text-muted">
              {ROW_TITLE[roomKind][row]}
            </p>

            <div
              data-track={row}
              className={`relative w-full overflow-hidden rounded-field bg-surface-sunken [touch-action:none] ${
                over ? 'ring-1 ring-danger' : ''
              }`}
              style={{ height: TRACK_H }}
            >
              {list.map((m, i) => {
                const spec = MODULES[m.kind];
                /*
                 * Каквото пише на клипа, с това започва и името му —
                 * иначе гласовото управление не го намира. Нишите
                 * нямат код, затова носят името на вида си.
                 */
                const head = m.code ?? spec.label;
                const isOn = selected.includes(m.id);
                const leftPct = (m.x / wallLength) * 100;
                const widthPct = (m.width / wallLength) * 100;

                return (
                  <div
                    key={m.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isOn}
                    /*
                     * Етикетът започва с това, което се чете на клипа.
                     * Иначе гласовото управление не го намира: казваш
                     * „К1 600", а името започва с друго.
                     */
                    aria-label={
                      `${head} ${formatMm(m.width)} мм` +
                      (head === spec.label ? '' : ` — ${spec.label}`) +
                      `, ${i + 1} от ${list.length}.` +
                      ' Стрелките го местят, плюс и минус менят ширината.'
                    }
                    className={`absolute top-1 bottom-1 cursor-grab overflow-hidden rounded-[10px] border px-2 py-1 text-left transition-colors ${
                      isOn
                        ? 'border-accent bg-accent/15'
                        : spec.hasCarcass
                          ? 'border-border bg-surface hover:bg-border/40'
                          : 'border-dashed border-muted bg-transparent'
                    }`}
                    data-clip={m.id}
                    style={{ left: `${leftPct}%`, width: `calc(${widthPct}% - 2px)` }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft' && i > 0) {
                        e.preventDefault();
                        onReorder(m.id, i - 1);
                      } else if (e.key === 'ArrowRight' && i < list.length - 1) {
                        e.preventDefault();
                        onReorder(m.id, i + 1);
                      } else if (e.key === '+' || e.key === '=') {
                        e.preventDefault();
                        onWidth([m.id], trimWidth(m.kind, m.width, 1));
                      } else if (e.key === '-') {
                        e.preventDefault();
                        onWidth([m.id], trimWidth(m.kind, m.width, -1));
                      } else if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        pick(m.id, row, e);
                      }
                    }}
                  >
                    <span className="block truncate text-[11px] leading-tight">{head}</span>{' '}
                    <span className="dim block truncate text-[11px] leading-tight text-muted">
                      {formatMm(m.width)} мм
                    </span>

                    {/* дръжките за опъване, като краищата на клип */}
                    {canTrim(m.kind) &&
                      (['left', 'right'] as const).map((edge) => (
                        <span
                          key={edge}
                          aria-hidden="true"
                          className={`absolute inset-y-0 cursor-ew-resize ${
                            edge === 'left' ? 'left-0' : 'right-0'
                          } ${isOn ? 'bg-accent/60' : 'bg-transparent hover:bg-accent/40'}`}
                          data-clip={m.id}
                          data-edge={edge}
                          style={{ width: GRIP }}
                        />
                      ))}
                  </div>
                );
              })}

              {marquee && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 border border-accent bg-accent/10"
                  style={{
                    left: `${(Math.min(marquee.fromMm, marquee.toMm) / wallLength) * 100}%`,
                    width: `${(Math.abs(marquee.toMm - marquee.fromMm) / wallLength) * 100}%`,
                  }}
                />
              )}

              {!list.length && (
                <p className="pointer-events-none absolute inset-0 grid place-items-center text-[11px] text-muted">
                  Празно. Завлечете модул от палитрата.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
