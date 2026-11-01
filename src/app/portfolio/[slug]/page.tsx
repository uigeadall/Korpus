import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Cta, PageHeader, Section, Shell } from '@/components/site/ui';
import {
  ExampleNotice,
  FactList,
  ProjectPhoto,
} from '@/components/site/portfolio';
import {
  SCOPE_LABELS,
  findProject,
  formatCompleted,
  projectSlugs,
} from '@/content/portfolio';

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
  const project = findProject(slug);
  if (!project) return { title: 'Проектът не е намерен' };
  return {
    title: project.title,
    description: project.lead,
  };
}

export default async function ProjectPage({ params }: Params) {
  const { slug } = await params;
  const project = findProject(slug);
  if (!project) notFound();

  return (
    <Shell>
      <PageHeader
        eyebrow={`${SCOPE_LABELS[project.scope]} · ${project.city} · ${formatCompleted(project.completed)}`}
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

      <Section caption="За проекта">
        <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-muted">
          {project.body.map((paragraph) => (
            <p key={paragraph.slice(0, 32)}>{paragraph}</p>
          ))}
        </div>
      </Section>

      <Section caption="Параметри">
        <FactList facts={project.facts} />
      </Section>

      <Section caption="Материали и механизми">
        <FactList facts={project.materials} />
        <p className="mt-6 max-w-2xl text-xs leading-relaxed text-muted">
          Конкретните декори и марки на механизмите се избират в студиото по мостри.
        </p>
      </Section>

      <section className="py-12">
        <div className="flex flex-wrap items-center gap-3">
          <Cta href="/konfigurator">Нареди своята кухня</Cta>
          <Cta href="/kontakt" variant="outline">
            Запитване
          </Cta>
          <Link href="/portfolio" className="px-2 text-sm text-muted hover:text-accent">
            ← Всички проекти
          </Link>
        </div>
      </section>
    </Shell>
  );
}
