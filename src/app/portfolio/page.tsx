import type { Metadata } from 'next';
import Link from 'next/link';
import { Cta, PageHeader, Section, Shell } from '@/components/site/ui';
import { ProjectCard } from '@/components/site/portfolio';
import { EXAMPLE_PROJECT, SCOPE_LABELS, publishedProjects } from '@/content/portfolio';

export const metadata: Metadata = {
  title: 'Портфолио',
  description: 'Реализирани проекти: кухни, гардероби и цялостно обзавеждане.',
};

export default function PortfolioPage() {
  const projects = publishedProjects();

  return (
    <Shell>
      <PageHeader
        eyebrow="Портфолио"
        title="Реализирани проекти"
        lead="Тук влизат само наши обекти — със снимки, описание и материалите, които са вложени."
      />

      <Section caption="Проекти">
        {projects.length > 0 ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.slug} project={project} />
              ))}
            </div>
            <p className="mt-8 text-xs text-muted">
              {projects.length} проекта. Всеки отваря страница с параметрите и материалите.
            </p>
          </>
        ) : (
          <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-muted">
            <p>
              Галерията още е празна. Пълни се от админския панел, когато първите обекти са готови и
              заснети.
            </p>
            <p>
              Няма да я напълним със стокови снимки на чужди кухни. Докато нямаме свои, предпочитаме
              да си личи, че мястото е празно.
            </p>
            <p className="text-foreground">
              Как ще изглежда един проект се вижда на{' '}
              <Link
                href={`/portfolio/${EXAMPLE_PROJECT.slug}`}
                className="text-accent underline underline-offset-4"
              >
                примерната страница
              </Link>
              .
            </p>
          </div>
        )}
      </Section>

      <Section caption="Какво ще показваме">
        <ul className="grid gap-4 text-sm text-muted sm:grid-cols-2 lg:grid-cols-3">
          {Object.values(SCOPE_LABELS).map((label) => (
            <li key={label} className="border-t border-border pt-3">
              {label}
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-2xl text-xs leading-relaxed text-muted">
          За всеки обект: няколко кадъра, габаритите, плотът, фасадите и механизмите. Без име и
          адрес на клиента.
        </p>
      </Section>

      <section className="py-12">
        <div className="flex flex-wrap gap-3">
          <Cta href="/konfigurator">Нареди кухнята си</Cta>
          <Cta href="/kontakt" variant="outline">
            Запитване
          </Cta>
        </div>
      </section>
    </Shell>
  );
}
