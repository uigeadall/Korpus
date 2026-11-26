'use client';

import type { Note } from '@/lib/ergonomics';
import { useT } from '@/i18n/client';
import { INSTRUMENTI } from '@/i18n/tekstove/instrumenti';

/** Бележките за удобството — какво ще пречи и какво може да е по-добре. */
export function ErgonomicsNotes({ notes }: { notes: Note[] }) {
  const t = useT(INSTRUMENTI).udobstvo;
  return (
    <ul className="space-y-2.5">
      {notes.map((n) => (
        <li key={n.id} className="flex gap-2 text-[13px] leading-relaxed">
          <span aria-hidden className={n.level === 'warn' ? 'text-danger' : 'text-muted'}>
            {n.level === 'warn' ? '⚠' : 'ℹ'}
          </span>
          <span>
            <span className="sr-only">{n.level === 'warn' ? t.vnimanie : t.savet}</span>
            {n.text}
          </span>
        </li>
      ))}
    </ul>
  );
}
