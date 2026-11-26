import type { Metadata } from 'next';
import Link from '@/i18n/Link';
import { HeroDrawing } from '@/components/site/HeroDrawing';
import { Card, Cta, Section, Shell } from '@/components/site/ui';
import { PROMISES, STEPS } from '@/content/process';
import { produkti } from '@/content/products';
import { getEzik } from '@/i18n/server';
import { STRANICI } from '@/i18n/tekstove/stranici';

export async function generateMetadata(): Promise<Metadata> {
  return { description: STRANICI[await getEzik()].nachalo.opisanie };
}

export default async function Home() {
  const ezik = await getEzik();
  const t = STRANICI[ezik].nachalo;

  return (
    <Shell>
      {/*
        Заглавието вляво и чертежът вдясно: първото нещо, което се вижда,
        е работата, а не обещанието. На тесен екран падат едно под друго.
      */}
      <section className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 className="font-display mt-4 text-[2.125rem] sm:text-[3.25rem]">
            {t.zaglavie1}
            <br />
            <span className="text-muted">{t.zaglavie2}</span>
          </h1>
          <p className="mt-5 max-w-lg text-[1.0625rem] leading-relaxed text-muted">{t.vavedenie}</p>
          {/* Повечето планери за кухни не работят на смартфон. Нашият работи —
              и това е най-удобното място: човек стои в самата стая. */}
          <p className="mt-3 max-w-lg text-sm text-muted">{t.telefon}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Cta href="/proekt">{t.napraveteProekt}</Cta>
            <Cta href="/kak-rabotim" variant="outline">
              {t.kakRabotim}
            </Cta>
          </div>
          <p className="mt-5 text-sm text-muted">
            {t.tsyaloJilishte}{' '}
            {/* Подчертана е постоянно: цветът сам не стига за човек, който
                не различава цветове. */}
            <Link href="/jilishte" className="text-accent underline underline-offset-4">
              {t.nachertaite}
            </Link>
          </p>
        </div>

        <div className="card overflow-hidden p-4 sm:p-6">
          <HeroDrawing />
        </div>
      </section>

      <Section caption={t.zashto}>
        <div className="grid gap-6 sm:grid-cols-3">
          {PROMISES[ezik].map((p, i) => (
            <Card key={p.title} index={`0${i + 1}`} title={p.title}>
              {p.body}
            </Card>
          ))}
        </div>
      </Section>

      <Section caption={t.protsesat} title={t.osemStapki}>
        <ol className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS[ezik].map((s) => (
            <li key={s.n}>
              <Card index={String(s.n).padStart(2, '0')} title={s.title}>
                {s.short}
              </Card>
            </li>
          ))}
        </ol>
        <div className="mt-8">
          <Cta href="/kak-rabotim" variant="outline">
            {t.podrobno}
          </Cta>
        </div>
      </Section>

      <Section caption={t.kakvoPravim}>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {produkti(ezik).map((p) => (
            <Card key={p.title} title={p.title} tag={p.soon ? t.skoro : undefined}>
              {p.lead}
            </Card>
          ))}
        </div>
        <div className="mt-8">
          <Cta href="/produkti" variant="outline">
            {t.vsichkiProdukti}
          </Cta>
        </div>
      </Section>

      <section className="mt-10 flex flex-col gap-8 border-t border-border py-14 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="font-display max-w-xl text-[1.625rem] sm:text-[2.125rem]">
          {t.kraiZaglavie}
        </h2>
        <div className="flex flex-wrap gap-3">
          <Cta href="/proekt">{t.kamProekta}</Cta>
          <Cta href="/kontakt" variant="outline">
            {t.zapitvane}
          </Cta>
        </div>
      </section>
    </Shell>
  );
}
