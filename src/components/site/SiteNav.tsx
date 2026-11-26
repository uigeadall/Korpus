'use client';

/**
 * Главното меню. Клиентско е само заради `aria-current` — четецът и
 * окото трябва да виждат на коя страница сме.
 */

import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import Link from '@/i18n/Link';
import { useT } from '@/i18n/client';
import { razdeli } from '@/i18n/ezik';
import { SAIT } from '@/i18n/tekstove/sait';

const NAV = [
  { href: '/kak-rabotim', kluch: 'kakRabotim' },
  { href: '/produkti', kluch: 'produkti' },
  { href: '/portfolio', kluch: 'portfolio' },
  /*
   * Клиентът минава по два екрана: чертае жилището и прави проект за
   * всяка стая. Конфигураторът не е тук — той е техническият
   * инструмент на цеха, не нещо, което клиент отваря сам.
   */
  { href: '/jilishte', kluch: 'jilishte' },
  { href: '/proekt', kluch: 'proekt' },
  { href: '/kontakt', kluch: 'kontakt' },
] as const;

/**
 * На адрес, който не е известен при сборката (404, непознат проект),
 * пътят се разбира чак в браузъра. Дотогава менюто стои без отметка —
 * иначе цялата страница би чакала него.
 */
export function SiteNav() {
  return (
    <Suspense fallback={<Menu pathname={null} />}>
      <SNastoyashtiyaAdres />
    </Suspense>
  );
}

function SNastoyashtiyaAdres() {
  // Без езика отпред: `/en/proekt` е същата страница като `/proekt`.
  return <Menu pathname={razdeli(usePathname() || '/').put} />;
}

function Menu({ pathname }: { pathname: string | null }) {
  const t = useT(SAIT).menu;

  return (
    <nav aria-label={t.etiket} className="nav-fade -mr-2 min-w-0 overflow-x-auto">
      <ul className="flex items-center gap-0.5">
        {NAV.map((item) => {
          const active =
            pathname !== null && (pathname === item.href || pathname.startsWith(`${item.href}/`));
          return (
            <li key={item.href}>
              {/* Текущата страница се бележи с линия под нея, не с хапче:
                  подчертаването е знакът на документ, хапчето — на ап. */}
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`block border-b px-2.5 py-1 text-[13px] whitespace-nowrap transition-colors hover:text-foreground ${
                  active ? 'border-foreground text-foreground' : 'border-transparent text-muted'
                }`}
              >
                {t[item.kluch]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
