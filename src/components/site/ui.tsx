/**
 * Малките градивни части на публичните страници.
 *
 * Стилът е спокоен и светъл: разделя се с въздух и с фон, не с линии;
 * заглавията са едри и плътно сбити; бутоните са хапчета. Единствените
 * останали линии са в чертежа, където значат нещо.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';

export function Shell({ children }: { children: ReactNode }) {
  return (
    <main id="sadarzhanie" className="mx-auto w-full max-w-[1120px] px-5 pb-28 sm:px-8">
      {children}
    </main>
  );
}

export function PageHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <header className="py-16 text-center sm:py-24">
      <p className="text-sm font-medium text-accent">{eyebrow}</p>
      <h1 className="font-display mx-auto mt-3 max-w-3xl text-[2.6rem] sm:text-6xl">{title}</h1>
      {lead && (
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">{lead}</p>
      )}
    </header>
  );
}

/**
 * Надписът на секцията е заглавие, не украса: когато няма едро заглавие,
 * той е `h2`, за да не скача нивото от `h1` направо на `h3` в каретата.
 */
export function Section({
  caption,
  title,
  children,
}: {
  caption?: string;
  title?: string;
  children: ReactNode;
}) {
  const Caption = title ? 'p' : 'h2';
  return (
    <section className="py-14 sm:py-20">
      {caption && (
        <Caption className="font-sans text-sm font-medium text-accent">{caption}</Caption>
      )}
      {title && <h2 className="font-display mt-2 max-w-2xl text-3xl sm:text-[2.5rem]">{title}</h2>}
      <div className={caption || title ? 'mt-8' : undefined}>{children}</div>
    </section>
  );
}

export function Cta({
  href,
  children,
  variant = 'solid',
}: {
  href: string;
  children: ReactNode;
  variant?: 'solid' | 'outline';
}) {
  return (
    <Link
      href={href}
      className={`btn ${variant === 'solid' ? 'btn-primary' : 'btn-quiet'} px-6 py-3`}
    >
      {children}
    </Link>
  );
}

/** Плоскост с мек фон — една мисъл на карта. */
export function Card({
  index,
  title,
  children,
  tag,
}: {
  index?: string;
  title: string;
  children?: ReactNode;
  tag?: string;
}) {
  return (
    <article className="card p-6">
      <div className="flex items-baseline gap-3">
        {index && <span className="dim text-xs">{index}</span>}
        <h3 className="font-display text-lg">{title}</h3>
        {tag && (
          <span className="ml-auto rounded-pill bg-surface-sunken px-2.5 py-1 text-[11px] text-muted">
            {tag}
          </span>
        )}
      </div>
      {children && <div className="mt-3 leading-relaxed text-muted">{children}</div>}
    </article>
  );
}

/** Видима маркировка за текст, който още не е минал през юрист. */
export function DraftNotice() {
  return (
    <p className="well mb-10 px-5 py-4 text-sm leading-relaxed text-muted">
      <strong className="text-foreground">Чернова.</strong> Текстът е работен и подлежи на преглед
      от юрист, преди сайтът да тръгне. Не го приемайте като окончателен правен документ.
    </p>
  );
}

/** Честен заместител, докато няма реални снимки от обекти. */
export function Placeholder({ label }: { label: string }) {
  return (
    <div className="paper-grid well flex aspect-[4/3] items-center justify-center">
      <span className="px-4 text-center text-sm text-muted">{label}</span>
    </div>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-2xl space-y-4 leading-relaxed text-muted [&_h2]:font-display [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">
      {children}
    </div>
  );
}
