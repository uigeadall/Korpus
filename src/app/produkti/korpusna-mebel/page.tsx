import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, Cta, PageHeader, Placeholder, Section, Shell } from '@/components/site/ui';
import { ProjectCard } from '@/components/site/portfolio';
import { MAIN_LINE } from '@/content/products';
import { publishedProjects } from '@/content/portfolio';
import { DIM } from '@/lib/cabinet-rules';

export const metadata: Metadata = {
  title: 'Корпусна мебел по проект',
  description:
    'Кухни, гардероби, ТВ композиции и антре по индивидуален проект, с технически чертеж и спецификация.',
};

const MATERIALS = [
  { title: 'Корпус', body: `ПДЧ ${DIM.T} мм, кант по видимия преден ръб, гръб HDF 3 мм.` },
  {
    title: 'Фасади',
    body: 'МДФ боядисан или фрезован, ПДЧ декор с кант 2 мм по четирите страни.',
  },
  { title: 'Плот', body: 'Ламиниран 38 мм, кварц 20 мм, синтерован 12 мм или гранит 30 мм.' },
  {
    title: 'Механизми',
    body: 'Панти с плавно затваряне, метален борд или сферични водачи, push-to-open при фасади без дръжки.',
  },
];

export default function MainLinePage() {
  const projects = publishedProjects();

  return (
    <Shell>
      <PageHeader eyebrow="Основна линия" title={MAIN_LINE.title} lead={MAIN_LINE.lead} />

      <Section caption="Обхват">
        <ul className="grid gap-4 text-sm text-muted sm:grid-cols-2">
          {MAIN_LINE.items.map((item) => (
            <li key={item} className="border-t border-border pt-3">
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section caption="Материали и механизми">
        <div className="grid gap-6 sm:grid-cols-2">
          {MATERIALS.map((m) => (
            <Card key={m.title} title={m.title}>
              {m.body}
            </Card>
          ))}
        </div>
        <p className="mt-6 max-w-2xl text-xs leading-relaxed text-muted">
          Конкретните декори, цветове и марки на механизмите се избират в студиото по мостри.
        </p>
      </Section>

      <Section caption="Какво получавате">
        <div className="grid gap-6 sm:grid-cols-3">
          <Card index="01" title="Чертеж">
            Фронтален изглед с верижни размери, височини и номера на шкафовете.
          </Card>
          <Card index="02" title="Спецификация">
            Всеки детайл с размер, материал, кант и бележка — по нея се произвежда.
          </Card>
          <Card index="03" title="Проследяване">
            Виждате етапите и сами избирате деня за доставка и монтаж.
          </Card>
        </div>
      </Section>

      <Section caption="Реализирани проекти">
        {projects.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-3">
            {projects.slice(0, 3).map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <Placeholder label="Снимка от обект — предстои" />
            <Placeholder label="Снимка от обект — предстои" />
            <Placeholder label="Снимка от обект — предстои" />
          </div>
        )}
        <p className="mt-4 text-xs text-muted">
          Показваме само наши обекти. Докато нямаме снимки от завършени проекти, тук стоят
          празни места вместо чужди кадри.{' '}
          <Link href="/portfolio" className="text-accent underline underline-offset-4">
            Портфолио
          </Link>
          .
        </p>
      </Section>

      <section className="py-12">
        <div className="flex flex-wrap gap-3">
          <Cta href="/proekt">Направи си проект</Cta>
          <Cta href="/kontakt" variant="outline">
            Запитване
          </Cta>
        </div>
      </section>
    </Shell>
  );
}
