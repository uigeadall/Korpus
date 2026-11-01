import type { Metadata } from 'next';
import { Cta, PageHeader, Placeholder, Section, Shell } from '@/components/site/ui';

export const metadata: Metadata = {
  title: 'Портфолио',
  description: 'Реализирани проекти: кухни, гардероби и цялостно обзавеждане.',
};

export default function PortfolioPage() {
  return (
    <Shell>
      <PageHeader
        eyebrow="Портфолио"
        title="Реализирани проекти"
        lead="Тук влизат само наши обекти — със снимки, описание и материалите, които са вложени."
      />

      <Section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {['Кухня', 'Гардероб', 'Цяло жилище'].map((label) => (
            <Placeholder key={label} label={`${label} — предстои`} />
          ))}
        </div>

        <div className="mt-8 max-w-2xl space-y-3 text-sm leading-relaxed text-muted">
          <p>
            Галерията се пълни от админския панел, когато първите обекти са готови и заснети.
          </p>
          <p>
            Няма да я напълним със стокови снимки на чужди кухни. Докато нямаме свои,
            предпочитаме да си личи, че мястото е празно.
          </p>
        </div>
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
