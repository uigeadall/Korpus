import type { Metadata } from 'next';
import { Cta, PageHeader, Section, Shell } from '@/components/site/ui';

export const metadata: Metadata = {
  title: 'Страницата не е намерена',
};

export default function NotFound() {
  return (
    <Shell>
      <PageHeader
        eyebrow="404"
        title="Няма такава страница"
        lead="Адресът е сбъркан или страницата вече не съществува."
      />

      <Section>
        <div className="flex flex-wrap gap-3">
          <Cta href="/">Към началото</Cta>
          <Cta href="/proekt" variant="outline">
            Направете си проект
          </Cta>
          <Cta href="/kontakt" variant="outline">
            Контакт
          </Cta>
        </div>
      </Section>
    </Shell>
  );
}
