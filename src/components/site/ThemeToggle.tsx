'use client';

/**
 * Превключвателят на темата.
 *
 * Показва знака на това, което ще получиш, а не на това, което гледаш —
 * на бутон „слънце" човек очаква да стане светло, не да му се каже, че
 * вече е светло.
 */

import { useSyncExternalStore } from 'react';
import { useT } from '@/i18n/client';
import { SAIT } from '@/i18n/tekstove/sait';
import { abonirai, naSarvara, tekushta, zadai } from './tema';

export function ThemeToggle() {
  const t = useT(SAIT).tema;
  const tema = useSyncExternalStore(abonirai, tekushta, naSarvara);
  const kam = tema === 'dark' ? 'light' : 'dark';
  const nadpis = kam === 'dark' ? t.kamTamna : t.kamSvetla;

  return (
    <button
      type="button"
      onClick={() => zadai(kam)}
      aria-label={nadpis}
      title={nadpis}
      className="shrink-0 rounded-[7px] border border-transparent p-1.5 text-muted transition-colors hover:border-border hover:text-foreground"
    >
      <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
        {kam === 'dark' ? (
          // Луна: тъмната тема идва
          <path d="M16.3 12.6A7 7 0 0 1 7.4 3.7a7 7 0 1 0 8.9 8.9Z" fill="currentColor" />
        ) : (
          // Слънце: светлата тема идва
          <>
            <circle cx="10" cy="10" r="3.6" fill="currentColor" />
            <path
              d="M10 1.4v2M10 16.6v2M18.6 10h-2M3.4 10h-2M16.1 3.9l-1.4 1.4M5.3 14.7l-1.4 1.4M16.1 16.1l-1.4-1.4M5.3 5.3 3.9 3.9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
    </button>
  );
}
