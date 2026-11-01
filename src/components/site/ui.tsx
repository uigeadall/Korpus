/**
 * Малките градивни части на публичните страници. Стилът е на чертожно
 * бюро: тънки линии, разредени главни букви за надписите, месинг за числата.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';

export function Shell({ children }: { children: ReactNode }) {
  return (
    <main id="sadarzhanie" className="mx-auto w-full max-w-[1200px] px-4 pb-20 sm:px-6 lg:px-8">
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
    <header className="border-b border-border py-10 sm:py-14">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">{eyebrow}</p>
      <h1 className="font-display mt-3 max-w-3xl text-3xl leading-tight sm:text-4xl">{title}</h1>
      {lead && <p className="mt-4 max-w-2xl text-muted">{lead}</p>}
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
    <section className="border-b border-border py-10 sm:py-14">
      {caption && (
        <Caption className="font-sans text-xs font-normal uppercase tracking-[0.2em] text-muted">
          {caption}
        </Caption>
      )}
      {title && <h2 className="font-display mt-2 text-xl sm:text-2xl">{title}</h2>}
      <div className={caption || title ? 'mt-6' : undefined}>{children}</div>
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
  const base = 'inline-block px-5 py-3 text-sm transition-colors';
  return (
    <Link
      href={href}
      className={
        variant === 'solid'
          ? `${base} border border-accent bg-accent text-accent-contrast hover:opacity-90`
          : `${base} border border-border hover:border-accent hover:text-accent`
      }
    >
      {children}
    </Link>
  );
}

/** Карета с тънка линия отгоре — като позиция в спецификация. */
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
    <article className="border-t border-border pt-4">
      <div className="flex items-baseline gap-3">
        {index && <span className="dim text-xs">{index}</span>}
        <h3 className="font-display text-base">{title}</h3>
        {tag && (
          <span className="ml-auto border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted">
            {tag}
          </span>
        )}
      </div>
      {children && <div className="mt-2 text-sm leading-relaxed text-muted">{children}</div>}
    </article>
  );
}

/** Видима маркировка за текст, който още не е минал през юрист. */
export function DraftNotice() {
  return (
    <p className="mb-8 border border-border bg-surface-sunken px-4 py-3 text-xs leading-relaxed text-muted">
      <strong className="text-foreground">Чернова.</strong> Текстът е работен и подлежи на преглед от юрист,
      преди сайтът да тръгне. Не го приемайте като окончателен правен документ.
    </p>
  );
}

/** Честен заместител, докато няма реални снимки от обекти. */
export function Placeholder({ label }: { label: string }) {
  return (
    <div className="paper-grid flex aspect-[4/3] items-center justify-center border border-border">
      <span className="px-4 text-center text-xs uppercase tracking-[0.15em] text-muted">
        {label}
      </span>
    </div>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-muted [&_h2]:font-display [&_h2]:mt-8 [&_h2]:text-base [&_h2]:text-foreground [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-foreground">
      {children}
    </div>
  );
}
