import Link from 'next/link';
import { brand, legal } from '@/config/brand';

const LEGAL_LINKS = [
  { href: '/poveritelnost', label: 'Поверителност' },
  { href: '/usloviya', label: 'Общи условия' },
  { href: '/biskvitki', label: 'Бисквитки' },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-surface-sunken">
      <div className="mx-auto grid w-full max-w-[1120px] gap-8 px-5 py-14 sm:grid-cols-3 sm:px-8">
        <div>
          <p className="font-display text-base">{brand.name}</p>
          <p className="mt-1 text-sm text-muted">{brand.tagline}</p>
        </div>

        <div className="text-sm text-muted">
          <p className="font-medium text-foreground">Контакт</p>
          <ul className="mt-2 space-y-1">
            <li>{brand.contacts.phone || 'телефон: предстои'}</li>
            <li>{brand.contacts.email || 'имейл: предстои'}</li>
            <li>{brand.contacts.studio || 'студио: адресът предстои'}</li>
          </ul>
        </div>

        <div className="text-sm text-muted">
          <p className="font-medium text-foreground">Правни</p>
          {/* py-1.5: целта под пръста става 28 px висока (WCAG 2.2, 2.5.8). */}
          <ul className="mt-1">
            {LEGAL_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="inline-block py-1.5 transition-colors hover:text-accent"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          {legal.draft && (
            <p className="mt-3 border border-border px-2 py-1 leading-relaxed">
              Правните текстове са чернови до преглед от юрист.
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
