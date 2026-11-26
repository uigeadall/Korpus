import type { Metadata } from 'next';
import Link from '@/i18n/Link';
import { notFound } from 'next/navigation';
import { Cta, PageHeader, Section, Shell } from '@/components/site/ui';
import { ExampleNotice, FactList, ProjectPhoto } from '@/components/site/portfolio';
import {
  SCOPE_LABELS_PO_EZIK,
  findProject,
  formatCompleted,
  naEzik,
  projectSlugs,
} from '@/content/portfolio';
import { getEzik } from '@/i18n/server';
import { STRANICI } from '@/i18n/tekstove/stranici';

type Params = { params: Promise<{ slug: string }> };

/**
 * Всички проекти са известни при билда. `dynamicParams = false` не върви
 * с `cacheComponents`, затова непознат адрес минава през `notFound()`.
 * При включен PPR отговорът вече е започнал, така че статусът остава 200,
 * но Next слага `noindex` — така е по документацията.
 */
export function generateStaticParams() {
  return projectSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const ezik = await getEzik();
  const found = findProject(slug);
  if (!found) return { title: STRANICI[ezik].portfolio.nenameren };
  const project = naEzik(found, ezik);
  return {
    title: project.title,
    description: project.lead,
  };
}

export default async function ProjectPage({ params }: Params) {
  const { slug } = await params;
  const found = findProject(slug);
  if (!found) notFound();
  const ezik = await getEzik();
  const t = STRANICI[ezik].portfolio;
  const o = STRANICI[ezik].obshto;
  const project = naEzik(found, ezik);

  return (
    <Shell>
      <PageHeader
        eyebrow={`${SCOPE_LABELS_PO_EZIK[ezik][project.scope]} · ${project.city} · ${formatCompleted(project.completed, ezik)}`}
        title={project.title}
        lead={project.lead}
      />

      <Section>
        {project.example && <ExampleNotice />}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {project.images.map((image, i) => (
            <ProjectPhoto key={image.alt} image={image} priority={i === 0} />
          ))}
        </div>
      </Section>

      <Section caption={t.zaProekta}>
        <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-muted">
          {project.body.map((paragraph) => (
            <p key={paragraph.slice(0, 32)}>{paragraph}</p>
          ))}
        </div>
      </Section>

      <Section caption={t.parametri}>
        <FactList facts={project.facts} />
      </Section>

      <Section caption={t.materiali}>
        <FactList facts={project.materials} />
        <p className="mt-6 max-w-2xl text-xs leading-relaxed text-muted">{t.mostri}</p>
      </Section>

      <section className="py-12">
        <div className="flex flex-wrap items-center gap-3">
          <Cta href="/proekt">{o.napraviProekt}</Cta>
          <Cta href="/kontakt" variant="outline">
            {o.zapitvane}
          </Cta>
          <Link href="/portfolio" className="px-2 text-sm text-muted hover:text-accent">
            {t.vsichki}
          </Link>
        </div>
      </section>
    </Shell>
  );
}
