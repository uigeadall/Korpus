import type { Metadata } from 'next';
import Link from '@/i18n/Link';
import { Cta, PageHeader, Section, Shell } from '@/components/site/ui';
import { ProjectCard } from '@/components/site/portfolio';
import { EXAMPLE_PROJECT, SCOPE_LABELS_PO_EZIK, publishedProjects } from '@/content/portfolio';
import { getEzik } from '@/i18n/server';
import { STRANICI } from '@/i18n/tekstove/stranici';

export async function generateMetadata(): Promise<Metadata> {
  const t = STRANICI[await getEzik()].portfolio;
  return { title: t.zaglavieStr, description: t.opisanie };
}

export default async function PortfolioPage() {
  const ezik = await getEzik();
  const t = STRANICI[ezik].portfolio;
  const o = STRANICI[ezik].obshto;
  const projects = publishedProjects();

  return (
    <Shell>
      <PageHeader eyebrow={t.zaglavieStr} title={t.zaglavie} lead={t.vavedenie} />

      <Section caption={t.proekti}>
        {projects.length > 0 ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.slug} project={project} />
              ))}
            </div>
            <p className="mt-8 text-xs text-muted">{t.broi(projects.length)}</p>
          </>
        ) : (
          <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-muted">
            <p>{t.prazno1}</p>
            <p>{t.prazno2}</p>
            <p className="text-foreground">
              {t.primerPred}{' '}
              <Link
                href={`/portfolio/${EXAMPLE_PROJECT.slug}`}
                className="text-accent underline underline-offset-4"
              >
                {t.primerVrazka}
              </Link>
              .
            </p>
          </div>
        )}
      </Section>

      <Section caption={t.kakvoShte}>
        <ul className="grid gap-4 text-sm text-muted sm:grid-cols-2 lg:grid-cols-3">
          {Object.values(SCOPE_LABELS_PO_EZIK[ezik]).map((label) => (
            <li key={label} className="border-t border-border pt-3">
              {label}
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-2xl text-xs leading-relaxed text-muted">{t.zaVseki}</p>
      </Section>

      <section className="py-12">
        <div className="flex flex-wrap gap-3">
          <Cta href="/proekt">{o.napraviProekt}</Cta>
          <Cta href="/kontakt" variant="outline">
            {o.zapitvane}
          </Cta>
        </div>
      </section>
    </Shell>
  );
}
