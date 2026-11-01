'use client';

/**
 * Врати и прозорци на избраната стена. Мебелта ги заобикаля сама —
 * тук се казва само къде са и колко са големи.
 */

import {
  OPENING_KIND_LABEL,
  type OpeningKind,
  type WallOpening,
} from '@/lib/cabinet-rules';
import { formatMm } from '@/lib/drawing';
import { OPENING_LIMITS, type Action } from './state';

interface Props {
  wallId?: string;
  wallLength: number;
  openings: WallOpening[];
  dispatch: (a: Action) => void;
}

/** Числово поле с етикет — размерите на отвора са четири такива. */
function Field({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.12em] text-muted">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={10}
        onChange={(e) => onChange(Number(e.target.value))}
        className="dim mt-1 w-full border border-border bg-surface px-2 py-1 text-sm"
      />
    </label>
  );
}

export function OpeningsPanel({ wallId, wallLength, openings, dispatch }: Props) {
  return (
    <section className="border border-border bg-surface">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="font-display text-sm uppercase tracking-wide">Отвори в стената</h2>
        <p className="text-xs text-muted">
          {openings.length ? `${openings.length} бр.` : 'няма'}
        </p>
      </header>

      <ul className="divide-y divide-border">
        {openings.map((o) => (
          <li key={o.id} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm">
                {OPENING_KIND_LABEL[o.kind]}{' '}
                <span className="dim text-xs">
                  {formatMm(o.width)} × {formatMm(o.height)}
                </span>
              </p>
              <button
                type="button"
                onClick={() => dispatch({ type: 'removeOpening', id: o.id })}
                aria-label={`Премахни ${OPENING_KIND_LABEL[o.kind].toLowerCase()} на ${formatMm(o.x)} мм`}
                className="border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-danger hover:text-danger"
              >
                ×
              </button>
            </div>

            <div className="mt-2 grid grid-cols-4 gap-2">
              <Field
                label="От ляво"
                value={o.x}
                min={0}
                max={Math.max(0, wallLength - o.width)}
                onChange={(x) => dispatch({ type: 'opening', id: o.id, value: { x } })}
              />
              <Field
                label="Ширина"
                value={o.width}
                min={OPENING_LIMITS.minWidth}
                max={wallLength}
                onChange={(width) => dispatch({ type: 'opening', id: o.id, value: { width } })}
              />
              <Field
                label="Парапет"
                value={o.bottom}
                min={0}
                max={OPENING_LIMITS.maxHeight - OPENING_LIMITS.minHeight}
                onChange={(bottom) => dispatch({ type: 'opening', id: o.id, value: { bottom } })}
              />
              <Field
                label="Височина"
                value={o.height}
                min={OPENING_LIMITS.minHeight}
                max={OPENING_LIMITS.maxHeight}
                onChange={(height) => dispatch({ type: 'opening', id: o.id, value: { height } })}
              />
            </div>
          </li>
        ))}

        {!openings.length && (
          <li className="px-4 py-4 text-xs leading-relaxed text-muted">
            Няма отвори. Врата или прозорец тук означава, че редът, който ги пресича, ще ги
            заобиколи — горните шкафове прескачат прозореца, а до вратата не стъпва нищо.
          </li>
        )}
      </ul>

      <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
        {(['door', 'window'] as OpeningKind[]).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => wallId && dispatch({ type: 'addOpening', wallId, kind })}
            className="border border-border px-3 py-1.5 text-xs transition-colors hover:border-accent hover:text-accent"
          >
            + {OPENING_KIND_LABEL[kind]}
          </button>
        ))}
      </div>
    </section>
  );
}
