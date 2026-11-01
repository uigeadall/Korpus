import type { Metadata } from 'next';
import { Card, Cta, PageHeader, Section, Shell } from '@/components/site/ui';
import { STEPS } from '@/content/process';
import { legal } from '@/config/brand';

export const metadata: Metadata = {
  title: 'Как работим',
  description:
    'Процесът в осем стъпки: консултация, измерване на място, проект, оферта, производство, монтаж и гаранция.',
};

export default function HowPage() {
  return (
    <Shell>
      <PageHeader
        eyebrow="Как работим"
        title="Процесът, по който се прави мебел, която пасва"
        lead="Не продаваме продукт, а организиран проект с отговорност тук. Ето какво се случва и кога."
      />

      <Section caption="Осемте стъпки">
        <ol className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
          {STEPS.map((s) => (
            <li key={s.n}>
              <Card index={String(s.n).padStart(2, '0')} title={s.title}>
                {s.detail}
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      <Section caption="Отделно" title="Измерването">
        <div className="grid gap-6 lg:grid-cols-2">
          <p className="text-sm leading-relaxed text-muted">
            Измерваме сами, на място, след като е готов мокрият ремонт. Записваме отклоненията
            на стените и пода, позициите на ВиК, тока и комина. Ако мебелът се проектира по
            план на строителя, почти винаги се появява разлика — и тя се плаща от някого.
          </p>
          <p className="text-sm leading-relaxed text-muted">
            Затова конфигураторът на сайта е инструмент за решение и за ориентир, а не
            заместител на измерването. Накрая на всеки чертеж пише същото:{' '}
            <span className="text-foreground">
              това не е оферта, точната цена следва след измерване на място.
            </span>
          </p>
        </div>
      </Section>

      <Section caption="Отделно" title="Гаранция и права">
        <div className="grid gap-6 lg:grid-cols-2">
          <p className="text-sm leading-relaxed text-muted">
            Всички стоки имат законова гаранция от {legal.warrantyYears} години. Проектът и
            спецификацията остават при нас — при нужда от регулиране или допълнителен детайл
            знаем точно какво е вложено.
          </p>
          <p className="text-sm leading-relaxed text-muted">
            Мебелите по индивидуален проект са изключение от 14-дневното право на отказ,
            защото се изработват по ваши размери. Това не засяга правата ви при дефект или
            несъответствие. Подробно в{' '}
            <a href="/usloviya" className="underline underline-offset-2 hover:text-accent">
              общите условия
            </a>
            .
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
