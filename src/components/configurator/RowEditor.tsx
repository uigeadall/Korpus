'use client';

import {
  MODULES,
  type ModuleKind,
  type PlacedModule,
  type RowId,
  type RowStatus,
} from '@/lib/cabinet-rules';
import { formatMm } from '@/lib/drawing';
import type { Action } from './state';

const BASE_ORDER: ModuleKind[] = ['column', 'door', 'drawers', 'sink', 'oven', 'dw', 'lgap'];
const UPPER_ORDER: ModuleKind[] = ['upper', 'hood', 'ugap'];

const STATUS_TEXT: Record<RowStatus['state'], (diff: number) => string> = {
  exact: () => 'точно',
  left: (d) => `остават ${formatMm(d)} мм`,
  over: (d) => `надвишава с ${formatMm(d)} мм`,
};

export function RowEditor({
  row,
  modules,
  status,
  selectedId,
  onSelect,
  dispatch,
}: {
  row: RowId;
  modules: PlacedModule[];
  status: RowStatus;
  selectedId: string | null;
  onSelect: (id: string) => void;
  dispatch: (a: Action) => void;
}) {
  const kinds = row === 'base' ? BASE_ORDER : UPPER_ORDER;

  return (
    <section className="border border-border bg-surface">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
        <h3 className="font-display text-sm tracking-wide uppercase">
          {row === 'base' ? 'Долен ред' : 'Горен ред'}
        </h3>
        <p
          className={`dim text-xs ${
            status.state === 'over' ? 'text-danger' : status.state === 'exact' ? 'text-ok' : ''
          }`}
        >
          {formatMm(status.used)} / {formatMm(status.available)} мм ·{' '}
          {STATUS_TEXT[status.state](status.diff)}
        </p>
      </header>

      <ul className="divide-y divide-border">
        {modules.map((m, i) => (
          <ModuleRow
            key={m.id}
            m={m}
            index={i}
            count={modules.length}
            selected={selectedId === m.id}
            onSelect={onSelect}
            dispatch={dispatch}
          />
        ))}
        {!modules.length && (
          <li className="px-4 py-6 text-sm text-muted">
            Няма модули. Добавете от списъка отдолу.
          </li>
        )}
      </ul>

      <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
        {kinds.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => dispatch({ type: 'add', row, kind })}
            className="border border-border px-3 py-1.5 text-xs transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            + {MODULES[kind].label}
          </button>
        ))}
      </div>
    </section>
  );
}

function ModuleRow({
  m,
  index,
  count,
  selected,
  onSelect,
  dispatch,
}: {
  m: PlacedModule;
  index: number;
  count: number;
  selected: boolean;
  onSelect: (id: string) => void;
  dispatch: (a: Action) => void;
}) {
  const spec = MODULES[m.kind];
  const singleDoor =
    m.width <= 600 && ['door', 'sink', 'upper', 'column'].includes(m.kind);

  return (
    <li
      className={`px-4 py-3 ${selected ? 'bg-surface-sunken' : ''}`}
      onFocus={() => onSelect(m.id)}
    >
      {/* Името заема целия ред — иначе дългите се режат до „Долен с 3 ч…". */}
      <button
        type="button"
        onClick={() => onSelect(m.id)}
        className="flex w-full items-baseline gap-2 text-left"
      >
        <span className="dim w-8 shrink-0 text-xs">{m.code ?? '—'}</span>
        <span className="text-sm leading-snug">{spec.label}</span>
      </button>

      <div className="mt-2 flex flex-wrap items-center gap-2 pl-10">
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <span className="sr-only">Ширина</span>
          <select
            value={m.width}
            onChange={(e) => dispatch({ type: 'width', id: m.id, value: Number(e.target.value) })}
            className="dim border border-border bg-surface px-2 py-1 text-xs"
          >
            {spec.widths.map((w) => (
              <option key={w} value={w}>
                {w} мм
              </option>
            ))}
          </select>
        </label>

        {singleDoor && (
          <button
            type="button"
            onClick={() =>
              dispatch({
                type: 'hinge',
                id: m.id,
                value: m.hingeSide === 'left' ? 'right' : 'left',
              })
            }
            className="border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
            title="Страна на пантите"
          >
            панти {m.hingeSide === 'left' ? '◀ вляво' : 'вдясно ▶'}
          </button>
        )}

        <div className="ml-auto flex items-center gap-1">
          <IconButton
            label="Премести наляво"
            disabled={index === 0}
            onClick={() => dispatch({ type: 'move', id: m.id, dir: -1 })}
          >
            ←
          </IconButton>
          <IconButton
            label="Премести надясно"
            disabled={index === count - 1}
            onClick={() => dispatch({ type: 'move', id: m.id, dir: 1 })}
          >
            →
          </IconButton>
          <IconButton label="Премахни" onClick={() => dispatch({ type: 'remove', id: m.id })}>
            ×
          </IconButton>
        </div>
      </div>
    </li>
  );
}

function IconButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="h-8 w-8 border border-border text-sm leading-none transition-colors hover:border-accent hover:text-accent disabled:opacity-30 disabled:hover:border-border disabled:hover:text-current"
    >
      {children}
    </button>
  );
}
