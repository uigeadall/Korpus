'use client';

/**
 * Изборът на език — падащо меню горе вдясно.
 *
 * Всеки ред е истинска връзка към същата страница на другия език, така
 * че работи и със средния бутон, и без скрипт. Скриптът добавя две
 * неща: помни избора в бисквитка (виж `proxy.ts`) и пренася `?…` и `#…`,
 * за да не се изгуби проектът, който човек тъкмо прави.
 */

import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useEffect, useId, useRef, useState } from 'react';
import { useEzik, useT, zapomniEzik } from '@/i18n/client';
import {
  EZICI,
  HTML_LANG,
  IME_NA_EZIKA,
  KOD_NA_EZIKA,
  adres,
  razdeli,
  type Ezik,
} from '@/i18n/ezik';
import { SAIT } from '@/i18n/tekstove/sait';

/**
 * На адрес, който не е известен при сборката, пътят се разбира чак в
 * браузъра; дотогава стои само бутонът (виж `SiteNav`).
 */
export function LanguageMenu() {
  return (
    <Suspense fallback={<Menu put={null} />}>
      <SNastoyashtiyaAdres />
    </Suspense>
  );
}

function SNastoyashtiyaAdres() {
  return <Menu put={razdeli(usePathname() || '/').put} />;
}

function Menu({ put }: { put: string | null }) {
  const ezik = useEzik();
  const t = useT(SAIT).ezik;
  const router = useRouter();
  const [otvoreno, setOtvoreno] = useState(false);
  const koren = useRef<HTMLDivElement>(null);
  const buton = useRef<HTMLButtonElement>(null);
  const spisak = useId();

  // Щракване извън менюто или Escape го затварят; Escape връща фокуса на бутона.
  useEffect(() => {
    if (!otvoreno) return;
    const vanka = (e: PointerEvent) => {
      if (!koren.current?.contains(e.target as Node)) setOtvoreno(false);
    };
    const klavish = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOtvoreno(false);
        buton.current?.focus();
      }
    };
    document.addEventListener('pointerdown', vanka);
    document.addEventListener('keydown', klavish);
    return () => {
      document.removeEventListener('pointerdown', vanka);
      document.removeEventListener('keydown', klavish);
    };
  }, [otvoreno]);

  function izberi(e: React.MouseEvent<HTMLAnchorElement>, cel: Ezik) {
    zapomniEzik(cel);
    setOtvoreno(false);
    if (cel === ezik) {
      e.preventDefault();
      return;
    }
    // Нов раздел или прозорец: браузърът си отваря връзката сам.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const { search, hash } = window.location;
    if (search || hash) {
      e.preventDefault();
      router.push(`${adres(cel, put ?? '/')}${search}${hash}`);
    }
  }

  return (
    <div ref={koren} className="relative shrink-0">
      <button
        ref={buton}
        type="button"
        aria-expanded={otvoreno}
        aria-controls={spisak}
        title={t.izberete}
        disabled={put === null}
        onClick={() => setOtvoreno((o) => !o)}
        className="flex items-center gap-1 rounded-[7px] border border-transparent px-1.5 py-1.5 text-[12px] font-medium text-muted transition-colors hover:border-border hover:text-foreground aria-expanded:border-border aria-expanded:text-foreground"
      >
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="10" cy="10" r="7.6" />
            <path d="M2.4 10h15.2M10 2.4c2.2 2.3 3.2 4.8 3.2 7.6s-1 5.3-3.2 7.6M10 2.4C7.8 4.7 6.8 7.2 6.8 10s1 5.3 3.2 7.6" />
          </g>
        </svg>
        {/* Името на бутона е „Изберете език: Български" — кодът отдолу е
            само за окото, иначе четецът го казва като дума. */}
        <span className="sr-only">
          {t.izberete}: <span lang={HTML_LANG[ezik]}>{IME_NA_EZIKA[ezik]}</span>
        </span>
        <span aria-hidden="true">{KOD_NA_EZIKA[ezik]}</span>
        <svg
          viewBox="0 0 10 10"
          width="8"
          height="8"
          aria-hidden="true"
          className={otvoreno ? 'rotate-180' : undefined}
        >
          <path
            d="M1.5 3.5 5 7l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {put !== null && (
        <ul
          id={spisak}
          hidden={!otvoreno}
          aria-label={t.etiket}
          className="card absolute top-full right-0 z-30 mt-2 min-w-[10rem] p-1"
        >
          {EZICI.map((cel) => (
            <li key={cel}>
              <NextLink
                href={adres(cel, put)}
                hrefLang={HTML_LANG[cel]}
                lang={HTML_LANG[cel]}
                aria-current={cel === ezik ? 'true' : undefined}
                onClick={(e) => izberi(e, cel)}
                className={`flex items-center justify-between gap-4 rounded-[5px] px-3 py-2 text-[13px] transition-colors hover:bg-accent-wash hover:text-foreground ${
                  cel === ezik ? 'text-foreground' : 'text-muted'
                }`}
              >
                <span>{IME_NA_EZIKA[cel]}</span>
                {cel === ezik && (
                  <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                    <path
                      d="M2 6.5 4.8 9 10 3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </NextLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
