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
  { href: '/konfigurator', label: 'Конфигуратор' },
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
                className={`block whitespace-nowrap px-2.5 py-1.5 text-xs transition-colors hover:text-accent sm:text-sm ${
                  active ? 'text-accent' : 'text-muted'
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
