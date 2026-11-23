import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, Cta, PageHeader, Section, Shell } from '@/components/site/ui';
import { PRODUCTS } from '@/content/products';

export const metadata: Metadata = {
  title: 'Продукти',
  description:
    'Основна линия: корпусна мебел по проект. Следващи линии: готови мебели, камък, алуминиеви решения и осветление.',
};

export default function ProductsPage() {
  return (
    <Shell>
      <PageHeader
        eyebrow="Продукти"
        title="Започваме от корпусната мебел и разширяваме, когато е проверено"
        lead="Линия влиза в предложението чак когато имаме мостра, документи за ЕС и срок, който можем да обещаем."
      />

      <Section caption="Линиите">
        <div className="grid gap-8 sm:grid-cols-2">
          {PRODUCTS.map((p) => (
            <Card key={p.title} title={p.title} tag={p.soon ? 'скоро' : 'основна линия'}>
              <p>{p.lead}</p>
              <ul className="mt-3 space-y-1">
                {p.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="dim">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {p.note && <p className="mt-3 text-xs">{p.note}</p>}
              {p.slug && (
                <Link
                  href={`/produkti/${p.slug}`}
                  className="mt-4 inline-block text-sm underline underline-offset-2 hover:text-accent"
                >
                  Повече за линията
                </Link>
              )}
            </Card>
          ))}
        </div>
      </Section>

      <section className="py-12">
        <Cta href="/proekt">Направи си проект</Cta>
      </section>
    </Shell>
  );
}
