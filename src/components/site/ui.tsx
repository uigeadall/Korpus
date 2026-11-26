/**
 * Малките градивни части на публичните страници.
 *
 * Подредбата е лява, не центрирана. Центрираното е плакат — чете се
 * бързо и се забравя; лявото е документ и всеки ред започва на едно и
 * също място. Секциите се делят с косъм линия отгоре, а не с празнота:
 * така се вижда докъде стига едното и откъде почва другото.
 */

import type { ReactNode } from 'react';
import Link from '@/i18n/Link';
import { getEzik } from '@/i18n/server';
import { SAIT } from '@/i18n/tekstove/sait';

export function Shell({ children }: { children: ReactNode }) {
  return (
    <main id="sadarzhanie" className="mx-auto w-full max-w-[1080px] px-5 pb-24 sm:px-8">
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
    // Линията отдолу я рисува следващата секция със своята `border-t`.
    <header className="pt-14 pb-10 sm:pt-20 sm:pb-12">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="font-display mt-4 max-w-3xl text-[2rem] sm:text-[3.25rem]">{title}</h1>
      {lead && <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-muted">{lead}</p>}
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
    <section className="border-t border-border pt-10 pb-4 first:border-t-0 sm:pt-14 sm:pb-8">
      {caption && <Caption className="eyebrow">{caption}</Caption>}
      {title && (
        <h2 className="font-display mt-3 max-w-2xl text-[1.625rem] sm:text-[2.125rem]">{title}</h2>
      )}
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
      className={`btn ${variant === 'solid' ? 'btn-primary' : 'btn-quiet'} px-5 py-2.5`}
    >
      {children}
    </Link>
  );
}

/**
 * Плоскост с една мисъл. Номерът стои над заглавието и е моноспейс —
 * както номерата на шкафовете в чертежа, за да е един и същ езикът.
 */
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
    <article className="card flex h-full flex-col p-5">
      {(index || tag) && (
        <div className="mb-3 flex items-center gap-3">
          {index && <span className="dim text-[11px] tracking-widest">{index}</span>}
          {tag && (
            <span className="ml-auto rounded-pill border border-border px-2.5 py-0.5 text-[10px] font-medium tracking-widest text-muted uppercase">
              {tag}
            </span>
          )}
        </div>
      )}
      <h3 className="font-display text-[1.0625rem]">{title}</h3>
      {children && <div className="mt-2.5 text-sm leading-relaxed text-muted">{children}</div>}
    </article>
  );
}

/** Видима маркировка за текст, който още не е минал през юрист. */
export async function DraftNotice() {
  const t = SAIT[await getEzik()].chernova;
  return (
    <p className="mb-10 border-l-2 border-accent bg-accent-wash px-5 py-4 text-sm leading-relaxed text-muted">
      <strong className="text-foreground">{t.zaglavie}</strong> {t.tekst}
    </p>
  );
}

/** Честен заместител, докато няма реални снимки от обекти. */
export function Placeholder({ label }: { label: string }) {
  return (
    <div className="paper-grid flex aspect-[4/3] items-center justify-center rounded-[7px] border border-border bg-surface">
      <span className="px-4 text-center text-xs tracking-wide text-muted uppercase">{label}</span>
    </div>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-[62ch] space-y-4 leading-relaxed text-muted [&_h2]:font-display [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">
      {children}
    </div>
  );
}

/**
 * Текст от речника с връзки и удебелено в него: `[думи](/adres)` и
 * `**думи**`. Връзките водят на същия език. Друго форматиране няма —
 * текстът трябва да се чете и в речника.
 */
export function Bogat({ text, linkClass }: { text: string; linkClass?: string }) {
  const chasti: ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let posleden = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > posleden) chasti.push(text.slice(posleden, i));
    if (m[1] !== undefined) {
      chasti.push(
        <Link
          key={i}
          href={m[2]}
          className={linkClass ?? 'underline underline-offset-2 hover:text-accent'}
        >
          {m[1]}
        </Link>,
      );
    } else {
      chasti.push(
        <strong key={i} className="text-foreground">
          {m[3]}
        </strong>,
      );
    }
    posleden = i + m[0].length;
  }
  if (posleden < text.length) chasti.push(text.slice(posleden));
  return <>{chasti}</>;
}
