'use client';

/**
 * Изборът на покритие за стените: група, търсене, мостри.
 *
 * Едно и също място и за конфигуратора, и за водения поток — затова е
 * отделно и знае само за избора, не за кухнята. Над мострите се избира
 * къде отива покритието: на всички стени или на една, за акцентна стена.
 */

import { useMemo, useState } from 'react';
import {
  FINISH_CATEGORIES,
  type FinishCategory,
  WALL_FINISHES,
  type WallFinish,
  finishById,
  finishesIn,
  searchFinishes,
} from '@/config/wall-finishes';
import { type WallSide } from '@/lib/furniture/room';
import { type WallFinishChoice, finishIdFor, hasOwnFinish } from '@/lib/wall-finish';
import { type Pt, wallMarks } from '@/lib/wall-pattern';

const SIDE_LABEL: Record<WallSide, string> = {
  top: 'Горе',
  right: 'Вдясно',
  bottom: 'Долу',
  left: 'Вляво',
};

const SIDES: WallSide[] = ['top', 'right', 'bottom', 'left'];

export function WallFinishPanel({
  choice,
  onChoose,
  focusSide,
  onTargetChange,
}: {
  choice: WallFinishChoice | undefined;
  /** `'all'` — на всички стени; иначе само на тази. */
  onChoose: (side: WallSide | 'all', id: string) => void;
  /** Стената, с която да се отвори изборът — например тази с мебелта. */
  focusSide?: WallSide;
  /**
   * Коя стена е на ход. Обемът се обръща към нея — иначе човек избира
   * тапет за стена, която от този ъгъл не се вижда, и нищо не става.
   */
  onTargetChange?: (target: WallSide | 'all') => void;
}) {
  const [target, setTarget] = useState<WallSide | 'all'>('all');
  const current = target === 'all' ? finishById(choice?.all) : finishById(finishIdFor(choice, target));
  const [category, setCategory] = useState<FinishCategory>(current.category);
  const [query, setQuery] = useState('');

  const shown = useMemo(
    () => (query.trim() ? searchFinishes(query) : finishesIn(category)),
    [query, category],
  );

  const pickTarget = (next: WallSide | 'all') => {
    setTarget(next);
    onTargetChange?.(next);
    const f = next === 'all' ? finishById(choice?.all) : finishById(finishIdFor(choice, next));
    if (!query.trim()) setCategory(f.category);
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[12px] text-muted">Къде</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Коя стена">
          <TargetChip active={target === 'all'} onClick={() => pickTarget('all')}>
            Всички стени
          </TargetChip>
          {SIDES.map((side) => (
            <TargetChip
              key={side}
              active={target === side}
              onClick={() => pickTarget(side)}
              marked={hasOwnFinish(choice, side)}
              hint={side === focusSide ? 'с мебелта' : undefined}
            >
              {SIDE_LABEL[side]}
            </TargetChip>
          ))}
        </div>
        {target !== 'all' && hasOwnFinish(choice, target) && (
          <button
            type="button"
            onClick={() => onChoose(target, finishById(choice?.all).id)}
            className="mt-1.5 text-[12px] text-accent underline-offset-2 hover:underline"
          >
            ↺ като останалите стени
          </button>
        )}
      </div>

      <p className="text-[13px]">
        <span className="text-muted">Избрано: </span>
        {current.name}
      </p>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Търсене в ${WALL_FINISHES.length} покрития — „тухла", „метро", „дъб"…`}
        aria-label="Търсене на покритие"
        className="w-full rounded-field border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-accent"
      />

      {!query.trim() && (
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Вид покритие">
          {FINISH_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={category === c.id}
              onClick={() => setCategory(c.id)}
              className={`rounded-pill px-2.5 py-1 text-[12px] transition-colors ${
                category === c.id
                  ? 'bg-accent text-accent-contrast'
                  : 'bg-surface-sunken text-muted hover:bg-border/60'
              }`}
            >
              {c.name} <span>{finishesIn(c.id).length}</span>
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="text-[13px] text-muted">Нищо не отговаря на „{query}“.</p>
      ) : (
        <div className="grid max-h-[26rem] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
          {shown.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onChoose(target, f.id)}
              aria-pressed={current.id === f.id}
              title={f.name}
              className={`rounded-field p-1 text-left ring-2 transition-all ${
                current.id === f.id ? 'ring-accent' : 'ring-transparent hover:ring-border'
              }`}
            >
              <FinishPreview finish={f} />
              <span className="mt-1 line-clamp-2 block text-[11px] leading-tight">
                {/* Вътре в групата „Тапет:" пред всяко име е излишно. */}
                {query.trim() ? f.name : f.name.replace(/^Тапет: /, '')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TargetChip({
  children,
  active,
  onClick,
  marked,
  hint,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  /** Стената има свое покритие. */
  marked?: boolean;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1 rounded-pill px-2.5 py-1 text-[12px] transition-colors ${
        active ? 'bg-accent text-accent-contrast' : 'bg-surface-sunken text-muted hover:bg-border/60'
      }`}
    >
      {children}
      {hint && <span>· {hint}</span>}
      {marked && (
        <span aria-label="със свое покритие" className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      )}
    </button>
  );
}

/** Парче стена 1,2 на 0,8 м — достатъчно, за да личат тухла и плочка. */
const PREVIEW = { u0: 0, u1: 1200, v0: 0, v1: 800 };

const previewCache = new Map<string, React.ReactNode>();

/** Мостра на покритието — същата шарка, която отива в обема, но гледана право. */
export function FinishPreview({ finish }: { finish: Pick<WallFinish, 'id' | 'hex' | 'pattern'> }) {
  let node = previewCache.get(finish.id);
  if (!node) {
    const marks = wallMarks(finish.pattern, PREVIEW, 7);
    // Отдолу нагоре: `v` расте нагоре, а SVG — надолу.
    const at = ([u, v]: Pt) => `${u.toFixed(0)} ${(PREVIEW.v1 - v).toFixed(0)}`;
    node = (
      <svg
        viewBox={`0 0 ${PREVIEW.u1} ${PREVIEW.v1}`}
        className="block aspect-[3/2] w-full rounded-[6px] ring-1 ring-border"
        aria-hidden
        preserveAspectRatio="xMidYMid slice"
      >
        <rect width={PREVIEW.u1} height={PREVIEW.v1} fill={finish.hex} />
        {marks.fills.map((layer, i) => (
          <path
            key={`f${i}`}
            d={layer.polys.map((poly) => `M${poly.map(at).join('L')}Z`).join('')}
            fill={layer.color}
            fillOpacity={layer.opacity}
          />
        ))}
        {marks.lines.map((layer, i) => (
          <path
            key={`l${i}`}
            d={layer.segs.map(([a, b]) => `M${at(a)}L${at(b)}`).join('')}
            fill="none"
            stroke={layer.color}
            strokeOpacity={layer.opacity}
            strokeWidth={layer.width * 0.7}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    );
    previewCache.set(finish.id, node);
  }
  return node;
}
