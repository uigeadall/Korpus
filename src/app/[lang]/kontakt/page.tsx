import type { Metadata } from 'next';
import { Bogat, Card, Cta, PageHeader, Section, Shell } from '@/components/site/ui';
import { brand } from '@/config/brand';
import { getEzik } from '@/i18n/server';
import { STRANICI } from '@/i18n/tekstove/stranici';

export async function generateMetadata(): Promise<Metadata> {
  const t = STRANICI[await getEzik()].kontakt;
  return { title: t.zaglavieStr, description: t.opisanie };
}

export default async function ContactPage() {
  const ezik = await getEzik();
  const t = STRANICI[ezik].kontakt;
  const { phone, phoneHref, email, studio, city } = brand.contacts;

  return (
    <Shell>
      <PageHeader eyebrow={t.eyebrow} title={t.zaglavie} lead={t.vavedenie} />

      <Section caption={t.kakDaNi}>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <Card title={t.telefon}>
            {phone ? (
              <a href={phoneHref || `tel:${phone}`} className="hover:text-accent">
                {phone}
              </a>
            ) : (
              <span className="dim">{t.predstoi}</span>
            )}
          </Card>

          <Card title={t.imeil}>
            {email ? (
              <a href={`mailto:${email}`} className="hover:text-accent">
                {email}
              </a>
            ) : (
              <span className="dim">{t.predstoi}</span>
            )}
          </Card>

          <Card title={t.studio}>
            {studio || <span className="dim">{t.adresatPredstoi}</span>}
            <br />
            {city[ezik]}
            <br />
            <span className="text-xs">
              {t.rabotnoVreme}: {brand.hours[ezik]}
            </span>
          </Card>
        </div>
      </Section>

      <Section caption={t.forma}>
        <div className="max-w-2xl space-y-3 text-sm leading-relaxed text-muted">
          <p>{t.forma1}</p>
          <p>{t.forma2}</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Cta href="/proekt" variant="outline">
            {STRANICI[ezik].nachalo.napraveteProekt}
          </Cta>
        </div>
      </Section>

      <Section caption={t.danni}>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          <Bogat text={t.danniText} />
        </p>
      </Section>
    </Shell>
  );
}
