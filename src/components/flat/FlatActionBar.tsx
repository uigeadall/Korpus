'use client';

/**
 * Долната лента на жилището.
 *
 * Същото хрумване като в конфигуратора: едрите действия стоят залепени
 * за дъното, винаги на едно място, и важат за всичко маркирано. Тук
 * „клиповете" са стаи — маркираш две и ги копираш или триеш наведнъж.
 *
 * Връщането не е тук. То си стои отдясно, където беше — две места за
 * едно и също е по-лошо от едно неудобно.
 */

import Link from 'next/link';

interface Props {
  /** Колко стаи са маркирани. */
  count: number;
  onDuplicate: () => void;
  onRemove: () => void;
  /** Къде води обзавеждането на текущата стая, ако изобщо се обзавежда. */
  onFurnish: string | null;
  furnishLabel: string;
}

function Action({
  sign,
  label,
  disabled,
  danger,
  onClick,
}: {
  sign: string;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex min-w-[64px] flex-col items-center gap-0.5 rounded-field px-3 py-2 transition-colors disabled:opacity-35 ${
        danger
          ? 'text-muted hover:bg-danger/10 hover:text-danger'
          : 'text-muted hover:bg-border/60 hover:text-foreground'
      }`}
    >
      <span aria-hidden="true" className="text-lg leading-none">
        {sign}
      </span>
      <span className="text-[11px] leading-none">{label}</span>
    </button>
  );
}

export function FlatActionBar({ count, onDuplicate, onRemove, onFurnish, furnishLabel }: Props) {
  const none = count === 0;

  return (
    <div
      role="toolbar"
      aria-label="Действия върху маркираните помещения"
      className="sticky bottom-3 z-10 flex flex-wrap items-center gap-1 rounded-pill border border-border bg-surface/92 px-2 py-1.5 shadow-lg backdrop-blur"
    >
      <p className="px-2 text-[11px] text-muted" aria-live="polite">
        {none ? 'Изберете помещение' : count === 1 ? '1 помещение' : `${count} помещения`}
      </p>

      <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />

      <Action sign="⧉" label="Копирай" disabled={none} onClick={onDuplicate} />
      <Action sign="🗑" label="Изтрий" disabled={none} danger onClick={onRemove} />

      {onFurnish && (
        <Link href={onFurnish} className="btn btn-primary ml-auto px-4 py-2 text-[13px]">
          {furnishLabel}
        </Link>
      )}
    </div>
  );
}
