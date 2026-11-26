import type { Metadata } from 'next';
import { Cta, PageHeader, Section, Shell } from '@/components/site/ui';
import { getEzik } from '@/i18n/server';
import { STRANICI } from '@/i18n/tekstove/stranici';

export async function generateMetadata(): Promise<Metadata> {
  return { title: STRANICI[await getEzik()].nyama.zaglavieStr };
}

export default async function NotFound() {
  const t = STRANICI[await getEzik()].nyama;

  return (
    <Shell>
      <PageHeader eyebrow="404" title={t.zaglavie} lead={t.vavedenie} />

      <Section>
        <div className="flex flex-wrap gap-3">
          <Cta href="/">{t.kamNachaloto}</Cta>
          <Cta href="/proekt" variant="outline">
            {t.napraveteProekt}
          </Cta>
          <Cta href="/kontakt" variant="outline">
            {t.kontakt}
          </Cta>
        </div>
      </Section>
    </Shell>
  );
}
