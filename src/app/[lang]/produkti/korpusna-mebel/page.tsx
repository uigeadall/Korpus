import type { Metadata } from 'next';
import { Bogat, Card, Cta, PageHeader, Placeholder, Section, Shell } from '@/components/site/ui';
import { ProjectCard } from '@/components/site/portfolio';
import { glavnaLiniya } from '@/content/products';
import { publishedProjects } from '@/content/portfolio';
import { DIM } from '@/lib/cabinet-rules';
import { getEzik } from '@/i18n/server';
import { STRANICI } from '@/i18n/tekstove/stranici';

export async function generateMetadata(): Promise<Metadata> {
  const ezik = await getEzik();
  return { title: glavnaLiniya(ezik).title, description: STRANICI[ezik].korpusna.opisanie };
}

export default async function MainLinePage() {
  const ezik = await getEzik();
  const t = STRANICI[ezik].korpusna;
  const o = STRANICI[ezik].obshto;
  const liniya = glavnaLiniya(ezik);
  const projects = publishedProjects();

  return (
    <Shell>
      <PageHeader eyebrow={t.eyebrow} title={liniya.title} lead={liniya.lead} />

      <Section caption={t.obhvat}>
        <ul className="grid gap-4 text-sm text-muted sm:grid-cols-2">
          {liniya.items.map((item) => (
            <li key={item} className="border-t border-border pt-3">
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section caption={t.materiali}>
        <div className="grid gap-6 sm:grid-cols-2">
          {t.materialiSpisak(DIM.T).map((m) => (
            <Card key={m.title} title={m.title}>
              {m.body}
            </Card>
          ))}
        </div>
        <p className="mt-6 max-w-2xl text-xs leading-relaxed text-muted">{t.mostri}</p>
      </Section>

      <Section caption={t.kakvoPoluchavate}>
        <div className="grid gap-6 sm:grid-cols-3">
          <Card index="01" title={t.chertej}>
            {t.chertejText}
          </Card>
          <Card index="02" title={t.spetsifikatsiya}>
            {t.spetsifikatsiyaText}
          </Card>
          <Card index="03" title={t.prosledyavane}>
            {t.prosledyavaneText}
          </Card>
        </div>
      </Section>

      <Section caption={t.realizirani}>
        {projects.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-3">
            {projects.slice(0, 3).map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <Placeholder label={t.snimkaPredstoi} />
            <Placeholder label={t.snimkaPredstoi} />
            <Placeholder label={t.snimkaPredstoi} />
          </div>
        )}
        <p className="mt-4 text-xs text-muted">
          <Bogat text={t.samoNashi} linkClass="text-accent underline underline-offset-4" />
        </p>
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
