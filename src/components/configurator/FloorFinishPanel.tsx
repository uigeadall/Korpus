'use client';

/**
 * Изборът на под — ламинат, паркет, килим, по три от всеки.
 *
 * Мострите са същата шарка, която отива в обема. Без избор подът е
 * такъв, какъвто беше, и до това води копчето отдолу.
 */

import { FLOOR_CATEGORIES, floorById, floorsIn } from '@/config/floor-finishes';
import { FinishPreview } from './WallFinishPanel';
import { useEzik, useT } from '@/i18n/client';
import { LOCALE } from '@/i18n/ezik';
import { prevedi } from '@/i18n/rechnik';
import { INSTRUMENTI } from '@/i18n/tekstove/instrumenti';

/** „Ламинат сив дъб" в групата „Ламинат" е просто „Сив дъб". */
function shortName(name: string, group: string, locale = 'bg'): string {
  const rest = name.startsWith(group) ? name.slice(group.length).replace(/^[\s,]+/, '') : name;
  return rest.charAt(0).toLocaleUpperCase(locale) + rest.slice(1);
}

export function FloorFinishPanel({
  value,
  onChoose,
}: {
  value: string | undefined;
  /** `null` — подът както беше. */
  onChoose: (id: string | null) => void;
}) {
  const current = floorById(value);
  const ezik = useEzik();
  const t = useT(INSTRUMENTI).pod;
  const ime = (bg: string) => prevedi(bg, ezik);

  return (
    <div className="space-y-3">
      <p className="text-[13px]">
        <span className="text-muted">{t.izbrano}</span>
        {current ? ime(current.name) : t.kakto}
      </p>

      {FLOOR_CATEGORIES.map((c) => (
        <div key={c.id} role="group" aria-label={ime(c.name)}>
          <p className="mb-1.5 text-[12px] text-muted">{ime(c.name)}</p>
          <div className="grid grid-cols-3 gap-2">
            {floorsIn(c.id).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onChoose(f.id)}
                aria-pressed={current?.id === f.id}
                title={ime(f.name)}
                className={`rounded-field p-1 text-left ring-2 transition-all ${
                  current?.id === f.id ? 'ring-accent' : 'ring-transparent hover:ring-border'
                }`}
              >
                <FinishPreview finish={f} />
                <span className="mt-1 line-clamp-2 block text-[11px] leading-tight">
                  {shortName(ime(f.name), ime(c.name), LOCALE[ezik])}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {current && (
        <button
          type="button"
          onClick={() => onChoose(null)}
          className="text-[12px] text-accent underline-offset-2 hover:underline"
        >
          {t.kaktoBeshe}
        </button>
      )}
    </div>
  );
}
