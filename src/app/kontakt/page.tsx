import type { Metadata } from 'next';
import { Card, Cta, PageHeader, Section, Shell } from '@/components/site/ui';
import { brand } from '@/config/brand';

export const metadata: Metadata = {
  title: 'Контакт',
  description: 'Свържете се за консултация, измерване и оферта.',
};

export default function ContactPage() {
  const { phone, phoneHref, email, studio, city } = brand.contacts;

  return (
    <Shell>
      <PageHeader
        eyebrow="Контакт"
        title="Пишете или се обадете"
        lead="Кажете какво обзавеждате и в какъв срок. Ако имате план на жилището или снимки, пратете ги — пестят време на всички."
      />

      <Section caption="Как да ни намерите">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <Card title="Телефон">
            {phone ? (
              <a href={phoneHref || `tel:${phone}`} className="hover:text-accent">
                {phone}
              </a>
            ) : (
              <span className="dim">предстои</span>
            )}
          </Card>

          <Card title="Имейл">
            {email ? (
              <a href={`mailto:${email}`} className="hover:text-accent">
                {email}
              </a>
            ) : (
              <span className="dim">предстои</span>
            )}
          </Card>

          <Card title="Студио">
            {studio || <span className="dim">адресът предстои</span>}
            <br />
            {city}
            <br />
            <span className="text-xs">Работно време: {brand.hours}</span>
          </Card>
        </div>
      </Section>

      <Section caption="Форма за запитване">
        <div className="max-w-2xl space-y-3 text-sm leading-relaxed text-muted">
          <p>
            Формата с качване на план и снимки влиза в следващия етап от разработката, заедно
            със защитата от ботове и сигурното съхранение на файловете.
          </p>
          <p>
            Дотогава най-бързият път е обаждане или имейл. Ако вече сте наредили кухня в
            конфигуратора, свалете PDF-а и го прикачете — в него има чертеж, размери и
            материали.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Cta href="/proekt" variant="outline">
            Към конфигуратора
          </Cta>
        </div>
      </Section>

      <Section caption="Какво става с данните ви">
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Събираме само това, което е нужно, за да отговорим и да направим оферта. Качените
          планове и снимки се пазят в защитено хранилище и се виждат само от екипа.
          Подробно в{' '}
          <a href="/poveritelnost" className="underline underline-offset-2 hover:text-accent">
            политиката за поверителност
          </a>
          .
        </p>
      </Section>
    </Shell>
  );
}
