'use client';

import {
  MODULES,
  type PlacedModule,
  type RoomKind,
  type RowId,
  type RowStatus,
} from '@/lib/cabinet-rules';
import { formatMm } from '@/lib/drawing';
import type { Action } from './state';

/** Как се казват двата реда във всяка стая. */
const ROW_LABEL: Record<RoomKind, Record<RowId, string>> = {
  kitchen: { base: 'Долен ред', upper: 'Горен ред' },
  bedroom: { base: 'Гардероб', upper: 'Антресол' },
  living: { base: 'Долен ред', upper: 'Стенен ред' },
  bath: { base: 'Долен ред', upper: 'Над мивката' },
  corridor: { base: 'Шкафове', upper: 'Антресол' },
  hall: { base: 'Шкафове', upper: 'Антресол' },
};

const STATUS_TEXT: Record<RowStatus['state'], (diff: number) => string> = {
  exact: () => 'точно',
  left: (d) => `остават ${formatMm(d)} мм`,
  over: (d) => `надвишава с ${formatMm(d)} мм`,
};

export function RowEditor({
  row,
  roomKind = 'kitchen',
  modules,
  status,
  selectedId,
  onSelect,
  dispatch,
}: {
  row: RowId;
  /** Коя стая — от нея зависи какви модули се предлагат. */
  roomKind?: RoomKind;
  /** Стената, в която отиват новите модули. */
  modules: PlacedModule[];
  status: RowStatus;
  selectedId: string | null;
  onSelect: (id: string) => void;
  dispatch: (a: Action) => void;
}) {
  return (
    <section className="card overflow-hidden">
      <header className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4 pb-3">
        <h2 className="font-display text-base">
          {ROW_LABEL[roomKind][row]}
        </h2>
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
            Няма модули. Вземете ги от палитрата горе вдясно.
          </li>
        )}
      </ul>
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
        {/* Брас върху потъналия фон на избрания ред дава 4.29:1 — под
            прага. Там кодът минава на основния цвят. */}
        <span
          className={`w-8 shrink-0 font-mono text-xs ${selected ? 'text-foreground' : 'dim'}`}
        >
          {m.code ?? '—'}
        </span>
        <span className="text-sm leading-snug">{spec.label}</span>
      </button>

      <div className="mt-2 flex flex-wrap items-center gap-2 pl-10">
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <span className="sr-only">Ширина</span>
          <select
            value={m.width}
            onChange={(e) => dispatch({ type: 'width', id: m.id, value: Number(e.target.value) })}
            className="field dim py-1 text-xs"
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
            className="rounded-pill bg-surface-sunken px-2.5 py-1 text-xs text-muted transition-colors hover:bg-border"
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
          <IconButton
            label="Копие"
            onClick={() => dispatch({ type: 'duplicate', id: m.id })}
          >
            ⧉
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
      className="h-8 w-8 rounded-full bg-surface-sunken text-sm leading-none transition-colors hover:bg-border disabled:opacity-30 disabled:hover:bg-surface-sunken"
    >
      {children}
    </button>
  );
}
