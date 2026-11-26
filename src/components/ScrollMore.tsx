'use client';

import { type RefObject, useEffect, useState } from 'react';
import { useT } from '@/i18n/client';
import { SAIT } from '@/i18n/tekstove/sait';

/**
 * „↓ още" в дъното на колона, която се плъзга сама.
 *
 * Колона с вътрешен скрол не личи, че продължава — особено на мишка без
 * видима лента. Мекото преливане отдолу и копчето казват, че има още, и
 * изчезват, щом човек стигне дъното. Слага се последно в колоната.
 */
export function ScrollMore({ target }: { target: RefObject<HTMLElement | null> }) {
  const t = useT(SAIT);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const check = () => setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 12);
    check();
    el.addEventListener('scroll', check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    for (const child of el.children) ro.observe(child);
    // Нова стъпка сменя съдържанието, без колоната да мени размера си.
    const mo = new MutationObserver(() => {
      for (const child of el.children) ro.observe(child);
      check();
    });
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      el.removeEventListener('scroll', check);
      ro.disconnect();
      mo.disconnect();
    };
  }, [target]);

  return (
    <div
      className={`pointer-events-none sticky bottom-0 -mt-16 hidden h-16 items-end justify-center bg-gradient-to-t from-background via-background/85 to-transparent pb-1 transition-opacity lg:flex ${
        more ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <button
        type="button"
        tabIndex={more ? 0 : -1}
        aria-hidden={!more}
        onClick={() => {
          const el = target.current;
          el?.scrollBy({ top: el.clientHeight * 0.8, behavior: 'smooth' });
        }}
        className="pointer-events-auto rounded-pill bg-surface px-3 py-1 text-[11px] text-muted shadow-sm ring-1 ring-border transition-colors hover:text-foreground"
      >
        {t.oshteOtdolu}
      </button>
    </div>
  );
}
