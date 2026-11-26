import type { Metadata } from 'next';
import { Bogat, Card, Cta, PageHeader, Section, Shell } from '@/components/site/ui';
import { STEPS } from '@/content/process';
import { legal } from '@/config/brand';
import { getEzik } from '@/i18n/server';
import { STRANICI } from '@/i18n/tekstove/stranici';

export async function generateMetadata(): Promise<Metadata> {
  const t = STRANICI[await getEzik()].kakRabotim;
  return { title: t.zaglavieStr, description: t.opisanie };
}

export default async function HowPage() {
  const ezik = await getEzik();
  const t = STRANICI[ezik].kakRabotim;
  const o = STRANICI[ezik].obshto;

  return (
    <Shell>
      <PageHeader eyebrow={t.zaglavieStr} title={t.zaglavie} lead={t.vavedenie} />

      <Section caption={t.osemteStapki}>
        <ol className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
          {STEPS[ezik].map((s) => (
            <li key={s.n}>
              <Card index={String(s.n).padStart(2, '0')} title={s.title}>
                {s.detail}
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      <Section caption={t.otdelno} title={t.izmervaneto}>
        <div className="grid gap-6 lg:grid-cols-2">
          <p className="text-sm leading-relaxed text-muted">{t.izmervane1}</p>
          <p className="text-sm leading-relaxed text-muted">
            <Bogat text={t.izmervane2} />
          </p>
        </div>
      </Section>

      <Section caption={t.otdelno} title={t.garantsiya}>
        <div className="grid gap-6 lg:grid-cols-2">
          <p className="text-sm leading-relaxed text-muted">{t.garantsiya1(legal.warrantyYears)}</p>
          <p className="text-sm leading-relaxed text-muted">
            <Bogat text={t.garantsiya2} />
          </p>
        </div>
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
