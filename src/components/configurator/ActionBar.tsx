'use client';

/**
 * Долната лента — едрите действия.
 *
 * Досега копирането, триенето и ширината живееха из панелите отстрани
 * и в клавишни комбинации. На телефон панелите са под чертежа и
 * трябва да се скролва дотам; с клавиши там не се работи.
 *
 * Лентата стои залепена за дъното, винаги на едно място, с бутони,
 * които се улучват с палец. Действията важат за всичко избрано:
 * маркираш три клипа в лентата и ги триеш наведнъж.
 *
 * Връщането не е тук. То си стои горе, където беше и където го търси
 * всеки — две места за едно и също е по-лошо от едно неудобно.
 */

import Link from 'next/link';

interface Props {
  /** Колко модула са избрани. Нула значи, че бутоните спят. */
  count: number;
  onDuplicate: () => void;
  onWidth: (dir: -1 | 1) => void;
  onRemove: () => void;
  /** Къде води „Готово" — само когато сме дошли от жилището. */
  done: string | null;
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

export function ActionBar({ count, onDuplicate, onWidth, onRemove, done }: Props) {
  const none = count === 0;

  return (
    <div
      role="toolbar"
      aria-label="Действия върху избраното"
      className="sticky bottom-3 z-10 flex flex-wrap items-center gap-1 rounded-pill border border-border bg-surface/92 px-2 py-1.5 shadow-lg backdrop-blur"
    >
      <p className="px-2 text-[11px] text-muted" aria-live="polite">
        {none ? 'Изберете модул' : count === 1 ? '1 избран' : `${count} избрани`}
      </p>

      <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />

      <Action sign="−" label="По-тясно" disabled={none} onClick={() => onWidth(-1)} />
      <Action sign="+" label="По-широко" disabled={none} onClick={() => onWidth(1)} />
      <Action sign="⧉" label="Копирай" disabled={none} onClick={onDuplicate} />
      <Action sign="🗑" label="Изтрий" disabled={none} danger onClick={onRemove} />

      {done && (
        <Link href={done} className="btn btn-primary ml-auto px-4 py-2 text-[13px]">
          Готово
        </Link>
      )}
    </div>
  );
}
