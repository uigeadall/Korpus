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
      {/*
        Заглавието вляво и чертежът вдясно: първото нещо, което се вижда,
        е работата, а не обещанието. На тесен екран падат едно под друго.
      */}
      <section className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
        <div>
          <p className="eyebrow">Корпусна мебел по индивидуален проект</p>
          <h1 className="font-display mt-4 text-[2.125rem] sm:text-[3.25rem]">
            Мебел по мярка на жилището.
            <br />
            <span className="text-muted">Не по каталог.</span>
          </h1>
          <p className="mt-5 max-w-lg text-[1.0625rem] leading-relaxed text-muted">
            Отговорете на няколко въпроса и вижте мебелта си в обем за пет минути. После
            измерваме на място, проектираме, произвеждаме и монтираме.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
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
        </div>

        <div className="card overflow-hidden p-4 sm:p-6">
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

      <section className="mt-10 flex flex-col gap-8 border-t border-border py-14 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="font-display max-w-xl text-[1.625rem] sm:text-[2.125rem]">
          Направете си проекта сега. Отнема пет минути и не ви задължава с нищо.
        </h2>
        <div className="flex flex-wrap gap-3">
          <Cta href="/proekt">Към проекта</Cta>
          <Cta href="/kontakt" variant="outline">
            Запитване
          </Cta>
        </div>
      </section>
    </Shell>
  );
}
