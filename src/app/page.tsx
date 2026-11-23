import type { Metadata } from 'next';
import { HeroDrawing } from '@/components/site/HeroDrawing';
import { Card, Cta, Section, Shell } from '@/components/site/ui';
import { PROMISES, STEPS } from '@/content/process';
import { PRODUCTS } from '@/content/products';

export const metadata: Metadata = {
  description:
    'Кухни, гардероби и обзавеждане по индивидуален проект: измерване на място, технически проект, производство и монтаж в България.',
};

export default function Home() {
  return (
    <Shell>
      {/* Едро заглавие, центрирано, много въздух — после чертежът. */}
      <section className="py-16 text-center sm:py-24">
        <p className="text-sm font-medium text-accent">Корпусна мебел по индивидуален проект</p>
        <h1 className="font-display mx-auto mt-4 max-w-4xl text-[2.75rem] sm:text-7xl">
          Мебел по мярка на жилището.
          <br />
          <span className="text-muted">Не по каталог.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted">
          Отговорете на няколко въпроса и вижте мебелта си в обем за пет минути. После
          измерваме на място, проектираме, произвеждаме и монтираме.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Cta href="/proekt">Направете си проект</Cta>
          <Cta href="/kak-rabotim" variant="outline">
            Как работим
          </Cta>
        </div>
        <p className="mt-5 text-sm text-muted">
          Имате цяло жилище?{' '}
          {/* Подчертана е постоянно: цветът сам не стига за човек, който
              не различава цветове. */}
          <a href="/jilishte" className="text-accent underline underline-offset-4">
            Начертайте го стая по стая
          </a>
        </p>

        <div className="card mt-16 overflow-hidden p-4 sm:p-8">
          <HeroDrawing />
        </div>
      </section>

      <Section caption="Защо при нас">
        <div className="grid gap-6 sm:grid-cols-3">
          {PROMISES.map((p, i) => (
            <Card key={p.title} index={`0${i + 1}`} title={p.title}>
              {p.body}
            </Card>
          ))}
        </div>
      </Section>

      <Section caption="Процесът" title="От разговора до монтажа — осем стъпки">
        <ol className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n}>
              <Card index={String(s.n).padStart(2, '0')} title={s.title}>
                {s.short}
              </Card>
            </li>
          ))}
        </ol>
        <div className="mt-8">
          <Cta href="/kak-rabotim" variant="outline">
            Подробно за процеса
          </Cta>
        </div>
      </Section>

      <Section caption="Какво правим">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.map((p) => (
            <Card key={p.title} title={p.title} tag={p.soon ? 'скоро' : undefined}>
              {p.lead}
            </Card>
          ))}
        </div>
        <div className="mt-8">
          <Cta href="/produkti" variant="outline">
            Всички продукти
          </Cta>
        </div>
      </Section>

      <section className="well px-6 py-16 text-center sm:px-12 sm:py-24">
        <h2 className="font-display mx-auto max-w-2xl text-3xl sm:text-[2.5rem]">
          Направете си проекта сега. Отнема пет минути и не ви задължава с нищо.
        </h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Cta href="/proekt">Към проекта</Cta>
          <Cta href="/kontakt" variant="outline">
            Запитване
          </Cta>
        </div>
      </section>
    </Shell>
  );
}
