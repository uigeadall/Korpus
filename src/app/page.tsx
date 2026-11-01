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
      <section className="grid gap-10 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">
            Корпусна мебел по индивидуален проект
          </p>
          <h1 className="font-display mt-4 text-3xl leading-tight sm:text-5xl">
            Мебел по мярка на жилището, не по каталог.
          </h1>
          <p className="mt-5 max-w-xl text-muted">
            Измерваме на място, проектираме, произвеждаме и монтираме. А преди всичко това —
            можете сами да наредите кухнята си и да видите чертежа ѝ с размерите.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Cta href="/konfigurator">Отвори конфигуратора</Cta>
            <Cta href="/kak-rabotim" variant="outline">
              Как работим
            </Cta>
          </div>
        </div>

        <HeroDrawing />
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

      <section className="py-12">
        <h2 className="font-display max-w-2xl text-2xl leading-snug">
          Нарежете кухнята си сега и вижте чертежа с размерите — отнема две минути и не
          ви задължава с нищо.
        </h2>
        <div className="mt-6 flex flex-wrap gap-3">
          <Cta href="/konfigurator">Към конфигуратора</Cta>
          <Cta href="/kontakt" variant="outline">
            Запитване
          </Cta>
        </div>
      </section>
    </Shell>
  );
}
