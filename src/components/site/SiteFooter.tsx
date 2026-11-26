import Link from '@/i18n/Link';
import { brand, imeNaMarkata, legal } from '@/config/brand';
import { getEzik } from '@/i18n/server';
import { SAIT } from '@/i18n/tekstove/sait';

const LEGAL_LINKS = [
  { href: '/poveritelnost', kluch: 'poveritelnost' },
  { href: '/usloviya', kluch: 'usloviya' },
  { href: '/biskvitki', kluch: 'biskvitki' },
] as const;

export async function SiteFooter() {
  const ezik = await getEzik();
  const s = SAIT[ezik];
  const t = s.futar;

  return (
    // Футърът е на същата хартия като страницата и се отделя с линия —
    // сивият блок накрая изглеждаше като чужда плоскост, залепена отдолу.
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto grid w-full max-w-[1080px] gap-8 px-5 py-12 sm:grid-cols-3 sm:px-8">
        <div>
          <p className="font-display text-base font-semibold tracking-tight">
            {imeNaMarkata(ezik)}
          </p>
          <p className="mt-1 text-sm text-muted">{s.tagline}</p>
        </div>

        <div className="text-sm text-muted">
          <p className="eyebrow">{t.kontakt}</p>
          <ul className="mt-3 space-y-1">
            <li>{brand.contacts.phone || t.telefonPredstoi}</li>
            <li>{brand.contacts.email || t.imeilPredstoi}</li>
            <li>{brand.contacts.studio || t.studioPredstoi}</li>
          </ul>
        </div>

        <div className="text-sm text-muted">
          <p className="eyebrow">{t.pravni}</p>
          {/* py-1.5: целта под пръста става 28 px висока (WCAG 2.2, 2.5.8). */}
          <ul className="mt-2">
            {LEGAL_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="inline-block py-1.5 transition-colors hover:text-accent"
                >
                  {t[l.kluch]}
                </Link>
              </li>
            ))}
          </ul>
          {legal.draft && (
            <p className="mt-3 border border-border px-2 py-1 leading-relaxed">{t.chernovi}</p>
          )}
        </div>
      </div>
    </footer>
  );
}
