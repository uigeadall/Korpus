import Link from 'next/link';
import { brand } from '@/config/brand';

const NAV = [
  { href: '/kak-rabotim', label: 'Как работим' },
  { href: '/produkti', label: 'Продукти' },
  { href: '/portfolio', label: 'Портфолио' },
  { href: '/konfigurator', label: 'Конфигуратор' },
  { href: '/kontakt', label: 'Контакт' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-display text-lg tracking-tight">{brand.name}</span>
          <span className="dim hidden text-[10px] uppercase tracking-[0.2em] sm:inline">
            мебел по проект
          </span>
        </Link>

        <nav aria-label="Основна навигация" className="-mr-2 overflow-x-auto">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block whitespace-nowrap px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-accent sm:text-sm"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
