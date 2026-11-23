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
    <nav aria-label="Основна навигация" className="-mr-2 overflow-x-auto">
      <ul className="flex items-center gap-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`block rounded-pill px-3 py-1.5 text-[13px] whitespace-nowrap transition-colors hover:text-foreground sm:text-sm ${
                  active ? 'bg-surface-sunken text-foreground' : 'text-muted'
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
