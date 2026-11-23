'use client';

import type { Note } from '@/lib/ergonomics';

/** Бележките за удобството — какво ще пречи и какво може да е по-добре. */
export function ErgonomicsNotes({ notes }: { notes: Note[] }) {
  return (
    <ul className="space-y-2.5">
      {notes.map((n) => (
        <li key={n.id} className="flex gap-2 text-[13px] leading-relaxed">
          <span aria-hidden className={n.level === 'warn' ? 'text-danger' : 'text-muted'}>
            {n.level === 'warn' ? '⚠' : 'ℹ'}
          </span>
          <span>
            <span className="sr-only">{n.level === 'warn' ? 'Внимание: ' : 'Съвет: '}</span>
            {n.text}
          </span>
        </li>
      ))}
    </ul>
  );
}
