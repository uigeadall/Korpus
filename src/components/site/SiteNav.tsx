'use client';

/**
 * Главното меню. Клиентско е само заради `aria-current` — четецът и
 * окото трябва да виждат на коя страница сме.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/kak-rabotim', label: 'Как работим' },
  { href: '/produkti', label: 'Продукти' },
  { href: '/portfolio', label: 'Портфолио' },
  /*
   * Клиентът минава по два екрана: чертае жилището и прави проект за
   * всяка стая. Конфигураторът не е тук — той е техническият
   * инструмент на цеха, не нещо, което клиент отваря сам.
   */
  { href: '/jilishte', label: 'Жилището' },
  { href: '/proekt', label: 'Направи проект' },
  { href: '/kontakt', label: 'Контакт' },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Основна навигация" className="nav-fade -mr-2 min-w-0 overflow-x-auto">
      <ul className="flex items-center gap-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
