'use client';

/**
 * Колко от стената е заето и един бутон, който дозастила остатъка.
 *
 * Стои до чертежа, защото това е единственото число, което се гледа
 * непрекъснато, докато се нареждат шкафове.
 */

import type { RowId, RowStatus } from '@/lib/cabinet-rules';
import { formatMm } from '@/lib/drawing';

const ROW_LABEL: Record<RowId, string> = { base: 'Долен', upper: 'Горен' };

export function RowStatusBar({
  status,
  onFill,
}: {
  status: { base: RowStatus; upper: RowStatus };
  onFill: (row: RowId) => void;
}) {
  return (
    <div className="card grid gap-px overflow-hidden bg-border sm:grid-cols-2">
      {(['base', 'upper'] as const).map((row) => (
        <RowMeter key={row} row={row} status={status[row]} onFill={() => onFill(row)} />
      ))}
    </div>
  );
}

function RowMeter({
  row,
  status,
  onFill,
}: {
  row: RowId;
  status: RowStatus;
  onFill: () => void;
}) {
  const ratio = status.available > 0 ? status.used / status.available : 0;
  const over = status.state === 'over';
  const exact = status.state === 'exact';
  const color = over ? 'var(--danger)' : exact ? 'var(--ok)' : 'var(--accent)';

  return (
    <div className="bg-surface px-4 py-3">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-medium">{ROW_LABEL[row]}</span>
        <span
          className={`dim ml-auto text-xs tabular-nums ${
            over ? 'text-danger' : exact ? 'text-ok' : ''
          }`}
        >
          {formatMm(status.used)} / {formatMm(status.available)} мм
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        {/* Лентата е картинка на числото отгоре — затова е скрита от четеца. */}
        <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
          <span
            className="block h-full rounded-full transition-[width]"
            style={{ width: `${Math.min(100, ratio * 100)}%`, background: color }}
          />
        </span>

        {status.state === 'left' ? (
          <button
            type="button"
            onClick={onFill}
            className="shrink-0 rounded-pill bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/20"
            title={`Застила остатъка от ${formatMm(status.diff)} мм със стандартни шкафове`}
          >
            запълни {formatMm(status.diff)}
          </button>
        ) : (
          <span
            className={`shrink-0 text-[11px] ${over ? 'text-danger' : 'text-ok'}`}
          >
            {over ? `надвишава с ${formatMm(status.diff)}` : 'точно'}
          </span>
        )}
      </div>
    </div>
  );
}
